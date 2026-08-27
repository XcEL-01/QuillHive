import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { postsTable, usersTable, followsTable } from "@workspace/db/schema";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getViewerId } from "../../lib/auth-types";
import { search } from "./discovery.service";
import { similarPosts, recommendedAuthors } from "./recommendations.service";
import { recordRead, getStreak, getRecentActivity } from "./streaks.service";
import { enrichPost } from "../profiles/profile.service";

export const discoveryRouter: Router = Router();

const searchQuery = z.object({
  q: z.string().min(2).max(200),
  type: z.enum(["post", "user", "topic", "all"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

discoveryRouter.get("/search", async (req, res) => {
  const parsed = searchQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query" });
  const viewerId = getViewerId(req) ?? null;
  const result = await search({ ...parsed.data, viewerId });
  return res.json(result);
});

discoveryRouter.get("/posts/:id/similar", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
  const viewerId = getViewerId(req) ?? null;
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 6));
  const results = await similarPosts(id, viewerId, limit);
  return res.json(results);
});

discoveryRouter.get("/recommendations/authors", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));
  const authors = await recommendedAuthors(viewerId, limit);
  return res.json(authors);
});

// Cold-start: posts from creators who joined in the last 30 days with ≤10 posts
discoveryRouter.get("/new-voices", async (req, res) => {
  const viewerId = getViewerId(req) ?? null;
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Find users who joined < 30 days ago and are not banned
  const newUsers = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(gte(usersTable.createdAt, thirtyDaysAgo), eq(usersTable.isBanned, false)))
    .limit(200);

  if (newUsers.length === 0) return res.json([]);
  const newUserIds = newUsers.map(u => u.id);

  // Count published posts per new user
  const postCounts = await db
    .select({ authorId: postsTable.authorId, count: sql<number>`count(*)::int` })
    .from(postsTable)
    .where(and(inArray(postsTable.authorId, newUserIds), eq(postsTable.isPublished, true), eq(postsTable.isDeleted, false)))
    .groupBy(postsTable.authorId);
  const postCountMap = new Map<number, number>(postCounts.map(p => [p.authorId as number, Number(p.count)]));

  // Keep only users with 1–10 posts (has content but clearly new)
  const qualifyingIds = newUserIds.filter(id => {
    const n = postCountMap.get(id as number) ?? 0;
    return n >= 1 && n <= 10;
  });
  if (qualifyingIds.length === 0) return res.json([]);

  // Exclude viewer themselves + anyone viewer already follows
  let excludedIds = new Set<number>(viewerId ? [viewerId] : []);
  if (viewerId) {
    const following = await db
      .select({ followingId: followsTable.followingId })
      .from(followsTable)
      .where(eq(followsTable.followerId, viewerId));
    following.forEach(f => excludedIds.add(f.followingId));
  }

  const eligibleIds = qualifyingIds.filter(id => !excludedIds.has(id));
  if (eligibleIds.length === 0) return res.json([]);

  // Fetch recent posts from these creators (one per author via dedup)
  const posts = await db
    .select()
    .from(postsTable)
    .where(and(inArray(postsTable.authorId, eligibleIds), eq(postsTable.isPublished, true), eq(postsTable.isDeleted, false)))
    .orderBy(desc(postsTable.createdAt))
    .limit(limit * 4);

  const seenAuthors = new Set<number>();
  const deduped = posts.filter(p => {
    if (seenAuthors.has(p.authorId)) return false;
    seenAuthors.add(p.authorId);
    return true;
  }).slice(0, limit);

  const enriched = await Promise.all(deduped.map(p => enrichPost(p, viewerId)));
  return res.json(enriched);
});

/** Trending topics (based on recent tag usage) */
discoveryRouter.get("/trending-topics", async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=600, s-maxage=600");
  const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 15));
  try {
    const rows = await db
      .select({ tag: sql<string>`unnest(${postsTable.tags})`.as("tag"), count: sql<number>`count(*)`.as("count") })
      .from(postsTable)
      .where(and(eq(postsTable.isPublished, true), eq(postsTable.isDeleted, false), gte(postsTable.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))))
      .groupBy(sql`unnest(${postsTable.tags})`)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);
    return res.json(rows.map((r, i) => ({ id: i + 1, name: r.tag, slug: r.tag.toLowerCase().replace(/\s+/g, "-"), postCount: Number(r.count) })));
  } catch {
    return res.json([]);
  }
});

/** Suggested creators (uses existing recommendedAuthors service) */
discoveryRouter.get("/suggested-creators", async (req, res) => {
  const viewerId = getViewerId(req) ?? null;
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));
  try {
    const results = await recommendedAuthors(viewerId ?? -1, limit);
    return res.json(results);
  } catch {
    return res.json([]);
  }
});

discoveryRouter.get("/streaks/me", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });
  const [streak, activity] = await Promise.all([getStreak(viewerId), getRecentActivity(viewerId, 30)]);
  return res.json({ ...streak, activity });
});

/** Featured posts for the Discover page (admin-curated via featured slots) */
discoveryRouter.get("/featured-posts", async (req, res) => {
  try {
    const { featuredSlotsTable } = await import("@workspace/db/schema");
    const { and: _and, eq: _eq, gt: _gt, isNull: _isNull, or: _or, inArray: _inArray } = await import("drizzle-orm");
    const now = new Date();
    const slots = await db
      .select({
        slotId: featuredSlotsTable.id,
        targetId: featuredSlotsTable.targetId,
        title: featuredSlotsTable.title,
      })
      .from(featuredSlotsTable)
      .where(_and(
        _eq(featuredSlotsTable.isActive, true),
        _eq(featuredSlotsTable.targetType, "post"),
        _or(_isNull(featuredSlotsTable.endsAt), _gt(featuredSlotsTable.endsAt, now))
      ))
      .limit(6);

    if (slots.length === 0) return res.json({ posts: [] });

    const postIds = slots.map(s => s.targetId).filter((id): id is number => id !== null);
    if (postIds.length === 0) return res.json({ posts: [] });

    const posts = await db
      .select({
        id: postsTable.id,
        title: postsTable.title,
        excerpt: postsTable.excerpt,
        imageUrl: postsTable.imageUrl,
        authorId: postsTable.authorId,
        authorName: usersTable.displayName,
        authorUsername: usersTable.username,
        authorAvatar: usersTable.avatarUrl,
        createdAt: postsTable.createdAt,
      })
      .from(postsTable)
      .leftJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .where(_and(
        _inArray(postsTable.id, postIds),
        eq(postsTable.isPublished, true),
        eq(postsTable.isDeleted, false)
      ));

    return res.json({ posts: posts.map(p => ({ ...p, isFeatured: true })) });
  } catch {
    return res.json({ posts: [] });
  }
});

discoveryRouter.post("/streaks/record", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });
  const postId = Number(req.body?.postId);
  if (!Number.isInteger(postId) || postId <= 0) return res.status(400).json({ error: "Invalid postId" });
  const result = await recordRead(viewerId, postId);
  // Non-blocking: check view milestones and fire notification to author
  void (async () => {
    try {
      const { readingActivityTable, postsTable, notificationsTable } = await import("@workspace/db/schema");
      const { count: countFn, eq: eqOp } = await import("drizzle-orm");
      const [{ total }] = await db
        .select({ total: countFn() })
        .from(readingActivityTable)
        .where(eqOp(readingActivityTable.postId, postId));
      const views = Number(total) || 0;
      const THRESHOLDS = [100, 1000, 10000];
      if (!THRESHOLDS.includes(views)) return;
      const [post] = await db.select({ authorId: postsTable.authorId, title: postsTable.title })
        .from(postsTable).where(eqOp(postsTable.id, postId)).limit(1);
      if (!post || post.authorId === viewerId) return;
      const label = views >= 10000 ? '10,000' : views >= 1000 ? '1,000' : '100';
      await db.insert(notificationsTable).values({
        userId: post.authorId,
        actorId: post.authorId,
        type: "view_milestone",
        postId,
        message: `🎉 Your post "${(post.title || 'Untitled').slice(0, 60)}" just hit ${label} reads!`,
        isRead: false,
      });
      const { emitToUser } = await import("../../lib/socket");
      emitToUser(post.authorId, "notification:new", { type: "view_milestone", postId, views });
    } catch { /* best-effort */ }
  })();
  return res.json(result);
});
