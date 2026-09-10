import { db } from "@workspace/db";
import { postsTable, postFingerprintsTable, followsTable, usersTable, postTopicsTable, userTopicAffinityTable, userTrustScoresTable, boostRequestsTable } from "@workspace/db/schema";
import { and, desc, eq, gt, inArray, isNull, lte, ne, sql, notInArray, or } from "drizzle-orm";
import { getMutualBlockSet } from "../safety/blocks.service";
import { getHighTrustAuthorMultiplier } from "../posts/ranking.service";

/**
 * Posts similar to `postId`. Combines two cheap signals:
 *  - Shingle overlap (post_fingerprints) - captures phrase-level similarity
 *  - Topic overlap (post_topics) - captures subject similarity
 * Excludes the source post and any blocked authors.
 */
export async function similarPosts(postId: number, viewerId: number | null, limit = 6) {
  const [source] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
  if (!source) return [];

  const blocked = viewerId ? await getMutualBlockSet(viewerId) : new Set<number>();

  const sourceShingles = await db
    .select({ shingle: postFingerprintsTable.shingle })
    .from(postFingerprintsTable)
    .where(eq(postFingerprintsTable.postId, postId));

  const shingleHits = sourceShingles.length === 0
    ? []
    : await db
        .select({ postId: postFingerprintsTable.postId, count: sql<number>`count(*)::int` })
        .from(postFingerprintsTable)
        .where(and(
          inArray(postFingerprintsTable.shingle, sourceShingles.map((s) => s.shingle)),
          ne(postFingerprintsTable.postId, postId),
        ))
        .groupBy(postFingerprintsTable.postId)
        .orderBy(sql`count(*) desc`)
        .limit(limit * 4);

  const sourceTopics = await db
    .select({ topicId: postTopicsTable.topicId })
    .from(postTopicsTable)
    .where(eq(postTopicsTable.postId, postId));

  const topicHits = sourceTopics.length === 0
    ? []
    : await db
        .select({ postId: postTopicsTable.postId, count: sql<number>`count(*)::int` })
        .from(postTopicsTable)
        .where(and(
          inArray(postTopicsTable.topicId, sourceTopics.map((t) => t.topicId)),
          ne(postTopicsTable.postId, postId),
        ))
        .groupBy(postTopicsTable.postId)
        .orderBy(sql`count(*) desc`)
        .limit(limit * 4);

  // Composite score: shingle weight 0.7, topic weight 0.3
  const scoreById = new Map<number, number>();
  const maxShingle = Math.max(1, ...shingleHits.map((s) => s.count));
  const maxTopic = Math.max(1, ...topicHits.map((t) => t.count));
  for (const s of shingleHits) scoreById.set(s.postId, (scoreById.get(s.postId) ?? 0) + 0.7 * (s.count / maxShingle));
  for (const t of topicHits) scoreById.set(t.postId, (scoreById.get(t.postId) ?? 0) + 0.3 * (t.count / maxTopic));

  const ids = [...scoreById.keys()];
  if (ids.length === 0) return [];

  const rows = await db
    .select()
    .from(postsTable)
    .where(and(
      inArray(postsTable.id, ids),
      eq(postsTable.isPublished, true),
      eq(postsTable.isDeleted, false),
    ));

  const authorIds = [...new Set(rows.map((p) => p.authorId))];
  const [authors, trustScores] = await Promise.all([
    db.select({ id: usersTable.id, isOfficialAccount: usersTable.isOfficialAccount, role: usersTable.role })
      .from(usersTable).where(inArray(usersTable.id, authorIds)),
    db.select({ userId: userTrustScoresTable.userId, tier: userTrustScoresTable.tier, creatorLevel: userTrustScoresTable.creatorLevel })
      .from(userTrustScoresTable).where(inArray(userTrustScoresTable.userId, authorIds)),
  ]);
  const authorMap = new Map(authors.map((a) => [a.id, a]));
  const trustMap = new Map(trustScores.map((t) => [t.userId, t]));
  const activeBoosts = await db
    .select({ postId: boostRequestsTable.postId, reachMultiplier: boostRequestsTable.reachMultiplier, placementPriority: boostRequestsTable.placementPriority })
    .from(boostRequestsTable)
    .where(and(
      inArray(boostRequestsTable.postId, ids),
      eq(boostRequestsTable.status, "approved"),
      or(isNull(boostRequestsTable.boostStartsAt), lte(boostRequestsTable.boostStartsAt, new Date())),
      gt(boostRequestsTable.boostEndsAt, new Date()),
    ));
  const boostMap = new Map(activeBoosts.map((b) => [b.postId, b]));

  return rows
    .filter((p) => !blocked.has(p.authorId))
    .map((p) => ({
      post: p,
      score: (scoreById.get(p.id) ?? 0) * getHighTrustAuthorMultiplier({
        isOfficialAccount: authorMap.get(p.authorId)?.isOfficialAccount,
        role: authorMap.get(p.authorId)?.role,
        tier: trustMap.get(p.authorId)?.tier,
        creatorLevel: trustMap.get(p.authorId)?.creatorLevel,
      }, p) * Number(boostMap.get(p.id)?.reachMultiplier ?? 1) + Number(boostMap.get(p.id)?.placementPriority ?? 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Authors the viewer might want to follow. Combines:
 * 1. Friends-of-friends (users followed by the viewer's follows), ranked by overlap
 * 2. Affinity topic boost: creators who post in topics the viewer reads most
 * Final list sorts affinity-matched creators first, then by mutual connections.
 */
export async function recommendedAuthors(viewerId: number, limit = 8) {
  // 1. Who does the viewer follow?
  const myFollows = await db
    .select({ id: followsTable.followingId })
    .from(followsTable)
    .where(eq(followsTable.followerId, viewerId));
  const myFollowIds = myFollows.map((f) => f.id);

  if (myFollowIds.length === 0) {
    // Cold start: top-followed creators outside viewer's network
    const followerCountSql = sql<number>`(SELECT COUNT(*)::int FROM ${followsTable} WHERE ${followsTable.followingId} = ${usersTable.id})`.as("follower_count");
    const rows = await db
      .select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl, bio: usersTable.bio, followers: followerCountSql })
      .from(usersTable)
      .where(and(eq(usersTable.isBanned, false), ne(usersTable.id, viewerId), eq(usersTable.showInSearch, true)))
      .orderBy(desc(followerCountSql))
      .limit(limit);
    return rows.map((r) => ({ ...r, mutualConnections: 0, affinityMatch: false }));
  }

  const blocked = await getMutualBlockSet(viewerId);
  const exclude = [viewerId, ...myFollowIds, ...blocked];

  // 2. Friends-of-friends
  const fof = await db
    .select({ candidate: followsTable.followingId, overlap: sql<number>`count(*)::int` })
    .from(followsTable)
    .where(and(
      inArray(followsTable.followerId, myFollowIds),
      notInArray(followsTable.followingId, exclude),
    ))
    .groupBy(followsTable.followingId)
    .orderBy(sql`count(*) desc`)
    .limit(limit * 3);

  if (fof.length === 0) return [];

  const candidateIds = fof.map((f) => f.candidate);
  const users = await db
    .select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl, bio: usersTable.bio })
    .from(usersTable)
    .where(and(eq(usersTable.isBanned, false), inArray(usersTable.id, candidateIds)));

  const overlapMap = new Map(fof.map((f) => [f.candidate, f.overlap]));

  // 3. Fetch viewer's top affinity topics (score > 0.3, top 5)
  const affinityTopicSet = new Set<number>();
  try {
    const affinityTopics = await db
      .select({ topicId: userTopicAffinityTable.topicId })
      .from(userTopicAffinityTable)
      .where(and(
        eq(userTopicAffinityTable.userId, viewerId),
        gt(userTopicAffinityTable.affinityScore, 0.3),
      ))
      .orderBy(desc(userTopicAffinityTable.affinityScore))
      .limit(5);
    for (const t of affinityTopics) affinityTopicSet.add(t.topicId);
  } catch { /* if affinity table not available, continue without it */ }

  // 4. For each candidate, check if they have posts in the viewer's affinity topics
  const affinityMatchSet = new Set<number>();
  if (affinityTopicSet.size > 0 && candidateIds.length > 0) {
    try {
      const affinityTopicIds = [...affinityTopicSet];
      const matchingPosts = await db
        .selectDistinct({ authorId: postsTable.authorId })
        .from(postsTable)
        .innerJoin(postTopicsTable, and(
          eq(postTopicsTable.postId, postsTable.id),
          inArray(postTopicsTable.topicId, affinityTopicIds),
        ))
        .where(and(
          inArray(postsTable.authorId, candidateIds),
          eq(postsTable.isPublished, true),
          eq(postsTable.isDeleted, false),
        ));
      for (const p of matchingPosts) {
        if (p.authorId) affinityMatchSet.add(p.authorId);
      }
    } catch { /* if post_topics table not available, continue */ }
  }

  // 5. Sort: affinity-matched creators first, then by mutual connections, limit to `limit`
  return users
    .map((u) => ({
      ...u,
      mutualConnections: overlapMap.get(u.id) ?? 0,
      affinityMatch: affinityMatchSet.has(u.id),
    }))
    .sort((a, b) => {
      if (a.affinityMatch !== b.affinityMatch) return a.affinityMatch ? -1 : 1;
      return b.mutualConnections - a.mutualConnections;
    })
    .slice(0, limit);
}
