import { db } from "@workspace/db";
import {
  postsTable,
  postTopicsTable,
  topicsTable,
  postViewsTable,
  likesTable,
  commentsTable,
  readingProgressTable,
  usersTable,
  followsTable,
} from "@workspace/db/schema";
import { and, eq, inArray, sql, desc, gte, count } from "drizzle-orm";

export interface TopicPerformance {
  topicId: number;
  topicName: string;
  topicSlug: string;
  postCount: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgReadDepth: number;
  engagementRate: number;
}

export interface ReadDepthAnalytics {
  postId: number;
  title: string | null;
  avgReadDepth: number;
  readerCount: number;
  fullReadsCount: number;
  fullReadRate: number;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  newFollowers: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  topPost: { id: number; title: string | null; views: number } | null;
  engagementRate: number;
  postsPublished: number;
  recommendations: string[];
}

export async function getTopicPerformance(userId: number): Promise<TopicPerformance[]> {
  const posts = await db
    .select({ id: postsTable.id })
    .from(postsTable)
    .where(and(eq(postsTable.authorId, userId), eq(postsTable.isDeleted, false), eq(postsTable.isPublished, true)));

  if (posts.length === 0) return [];
  const postIds = posts.map(p => p.id);

  const topicLinks = await db
    .select({ postId: postTopicsTable.postId, topicId: postTopicsTable.topicId })
    .from(postTopicsTable)
    .where(inArray(postTopicsTable.postId, postIds));

  if (topicLinks.length === 0) return [];

  const topicIds = [...new Set(topicLinks.map(t => t.topicId))];
  const topics = await db.select({ id: topicsTable.id, name: topicsTable.name, slug: topicsTable.slug })
    .from(topicsTable).where(inArray(topicsTable.id, topicIds));

  const topicMap = new Map<number, { id: number; name: string; slug: string }>(
    topics.map(t => [t.id as number, { id: t.id as number, name: t.name as string, slug: t.slug as string }])
  );
  const topicToPostIds = new Map<number, number[]>();
  for (const link of topicLinks) {
    const arr = topicToPostIds.get(link.topicId as number) ?? [];
    arr.push(link.postId as number);
    topicToPostIds.set(link.topicId as number, arr);
  }

  const results: TopicPerformance[] = (await Promise.all(
    topicIds.map(async (rawTopicId) => {
      const topicId = rawTopicId as number;
      const tPostIds = topicToPostIds.get(topicId) ?? [];
      const topic = topicMap.get(topicId);
      if (!topic) return null;

      const [views] = await db.select({ count: sql<number>`count(*)::int` }).from(postViewsTable).where(inArray(postViewsTable.postId, tPostIds));
      const [likes] = await db.select({ count: count() }).from(likesTable).where(inArray(likesTable.postId, tPostIds));
      const [comments] = await db.select({ count: count() }).from(commentsTable).where(inArray(commentsTable.postId, tPostIds));
      const [readDepth] = await db.select({ avg: sql<number>`COALESCE(AVG(${readingProgressTable.percent}), 0)::float` })
        .from(readingProgressTable).where(inArray(readingProgressTable.postId, tPostIds));

      const totalViews = Number(views?.count ?? 0);
      const totalLikes = Number(likes?.count ?? 0);
      const totalComments = Number(comments?.count ?? 0);
      const reach = Math.max(totalViews, 1);

      return {
        topicId,
        topicName: topic.name,
        topicSlug: topic.slug,
        postCount: tPostIds.length,
        totalViews,
        totalLikes,
        totalComments,
        avgReadDepth: Math.round(Number(readDepth?.avg ?? 0) * 10) / 10,
        engagementRate: Math.round(((totalLikes + totalComments) / reach) * 10000) / 100,
      } satisfies TopicPerformance;
    })
  )).filter((r): r is TopicPerformance => r !== null);

  return results.sort((a, b) => b.totalViews + b.totalLikes - (a.totalViews + a.totalLikes));
}

export async function getReadDepthAnalytics(userId: number, limit = 20): Promise<ReadDepthAnalytics[]> {
  const posts = await db
    .select({ id: postsTable.id, title: postsTable.title })
    .from(postsTable)
    .where(and(eq(postsTable.authorId, userId), eq(postsTable.isDeleted, false), eq(postsTable.isPublished, true)))
    .orderBy(desc(postsTable.createdAt))
    .limit(limit);

  if (posts.length === 0) return [];

  const results = await Promise.all(posts.map(async post => {
    const rows = await db
      .select({ percent: readingProgressTable.percent })
      .from(readingProgressTable)
      .where(eq(readingProgressTable.postId, post.id));

    const readerCount = rows.length;
    const fullReadsCount = rows.filter(r => r.percent >= 80).length;
    const avgReadDepth = readerCount > 0
      ? Math.round(rows.reduce((acc, r) => acc + r.percent, 0) / readerCount * 10) / 10
      : 0;

    return {
      postId: post.id,
      title: post.title,
      avgReadDepth,
      readerCount,
      fullReadsCount,
      fullReadRate: readerCount > 0 ? Math.round((fullReadsCount / readerCount) * 10000) / 100 : 0,
    };
  }));

  return results.sort((a, b) => b.avgReadDepth - a.avgReadDepth);
}

export async function getWeeklyReport(userId: number): Promise<WeeklyReport> {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = now.toISOString().slice(0, 10);

  const posts = await db
    .select({ id: postsTable.id, title: postsTable.title })
    .from(postsTable)
    .where(and(eq(postsTable.authorId, userId), eq(postsTable.isDeleted, false)));
  const postIds = posts.map(p => p.id);

  const [newFollowers] = await db
    .select({ count: count() })
    .from(followsTable)
    .where(and(eq(followsTable.followingId, userId), gte(followsTable.createdAt, weekStart)));

  const [views] = postIds.length > 0
    ? await db.select({ count: sql<number>`count(*)::int` }).from(postViewsTable)
        .where(and(inArray(postViewsTable.postId, postIds), gte(postViewsTable.createdAt, weekStart)))
    : [{ count: 0 }];

  const [likes] = postIds.length > 0
    ? await db.select({ count: count() }).from(likesTable)
        .where(and(inArray(likesTable.postId, postIds), gte(likesTable.createdAt, weekStart)))
    : [{ count: 0 }];

  const [comments] = postIds.length > 0
    ? await db.select({ count: count() }).from(commentsTable)
        .where(and(inArray(commentsTable.postId, postIds), gte(commentsTable.createdAt, weekStart)))
    : [{ count: 0 }];

  const [newPosts] = await db
    .select({ count: count() })
    .from(postsTable)
    .where(and(eq(postsTable.authorId, userId), eq(postsTable.isPublished, true), eq(postsTable.isDeleted, false), gte(postsTable.createdAt, weekStart)));

  const totalViews = Number(views?.count ?? 0);
  const totalLikes = Number(likes?.count ?? 0);
  const totalComments = Number(comments?.count ?? 0);
  const postsPublished = Number(newPosts?.count ?? 0);
  const followerGain = Number(newFollowers?.count ?? 0);

  let topPost: { id: number; title: string | null; views: number } | null = null;
  if (postIds.length > 0) {
    const viewsPerPost = await Promise.all(postIds.slice(0, 30).map(async id => {
      const [r] = await db.select({ count: sql<number>`count(*)::int` }).from(postViewsTable)
        .where(and(eq(postViewsTable.postId, id), gte(postViewsTable.createdAt, weekStart)));
      return { id, views: Number(r?.count ?? 0) };
    }));
    const best = viewsPerPost.sort((a, b) => b.views - a.views)[0];
    if (best && best.views > 0) {
      const post = posts.find(p => p.id === best.id);
      topPost = { id: best.id, title: post?.title ?? null, views: best.views };
    }
  }

  const recommendations: string[] = [];
  if (postsPublished === 0) recommendations.push("You didn't post this week - consistency is the #1 growth driver.");
  if (followerGain === 0 && postsPublished > 0) recommendations.push("Try engaging with comments and following similar creators to spark new follower growth.");
  if (totalViews > 0 && (totalLikes + totalComments) / totalViews < 0.03) recommendations.push("Your engagement rate is low - try ending posts with a question or call to action.");
  if (postsPublished >= 3) recommendations.push("Great posting cadence this week! Try sharing your top post on social media for wider reach.");
  if (followerGain >= 5) recommendations.push("Strong follower growth this week! Keep the momentum going with consistent content.");

  return {
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    newFollowers: followerGain,
    totalViews,
    totalLikes,
    totalComments,
    topPost,
    engagementRate: totalViews > 0 ? Math.round(((totalLikes + totalComments) / totalViews) * 10000) / 100 : 0,
    postsPublished,
    recommendations,
  };
}
