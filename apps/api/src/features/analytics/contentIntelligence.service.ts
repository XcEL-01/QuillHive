import { db } from "@workspace/db";
import { postsTable, postViewsTable, commentsTable } from "@workspace/db/schema";
import { and, eq, inArray, sql, desc } from "drizzle-orm";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function analyzeHookStrength(content: string | null, title: string | null): {
  score: number;
  label: "Weak" | "Average" | "Good" | "Strong";
  insight: string;
} {
  const text = stripHtml(content ?? "");
  const lines = text.split(/[\n.!?]+/).map(l => l.trim()).filter(l => l.length > 0);
  const hook = lines.slice(0, 2).join(". ").slice(0, 300);

  let score = 30;

  const words = hook.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount >= 12 && wordCount <= 45) score += 18;
  else if (wordCount >= 5) score += 8;

  if (/\?/.test(hook)) score += 12;
  if (/\d/.test(hook)) score += 10;

  const powerWords = ["secret", "discover", "proven", "truth", "never", "always", "best", "worst", "first", "last",
    "mistake", "surprising", "shocking", "finally", "instantly", "effortless", "warning", "urgent", "revealed"];
  if (powerWords.some(w => hook.toLowerCase().includes(w))) score += 8;

  if (/!/.test(hook)) score += 5;
  if (title && title.length >= 10) score += 12;
  if (title && /\?/.test(title)) score += 5;

  score = Math.min(100, score);

  const label: "Weak" | "Average" | "Good" | "Strong" =
    score >= 75 ? "Strong" : score >= 55 ? "Good" : score >= 38 ? "Average" : "Weak";

  const insight =
    score >= 75
      ? "Your opening hook is compelling - readers are likely to keep going."
      : score >= 55
      ? "Good opening. Try adding a specific number or bold question to boost click-through."
      : score >= 38
      ? "Your hook needs more punch. Open with a bold statement, question, or surprising fact."
      : "Start stronger - your first 2 lines decide whether readers continue.";

  return { score, label, insight };
}

function calcViralScore(views: number, likes: number, comments: number, ageHours: number): number {
  if (views === 0 && likes === 0 && comments === 0) return 0;
  const velocity = views / Math.max(ageHours, 1);
  const engRate = (likes * 3 + comments * 5) / Math.max(views, 1);
  const commentBonus = likes > 0 ? Math.min((comments / likes) * 20, 15) : 0;
  const velocityScore = Math.min(velocity * 8, 25);
  const engScore = Math.min(engRate * 150, 45);
  const basePts = views >= 500 ? 15 : views >= 100 ? 10 : views >= 10 ? 5 : 0;
  return Math.min(100, Math.round(velocityScore + engScore + commentBonus + basePts));
}

function explainPerformance(
  views: number, likes: number, comments: number,
  viralScore: number, engRate: number, hookScore: number,
): string[] {
  const reasons: string[] = [];
  if (hookScore >= 68) reasons.push("Strong opening hook kept readers engaged");
  if (engRate > 0.05) reasons.push("Above-average engagement rate from your audience");
  if (comments > 0 && likes > 0 && comments / likes > 0.25) reasons.push("Generated real discussion (high comment-to-like ratio)");
  if (views >= 500) reasons.push(`Excellent reach - ${views.toLocaleString()} views`);
  if (viralScore >= 60) reasons.push("High view velocity - shared quickly after publishing");
  if (likes >= 20) reasons.push("Resonated emotionally - above-average like count");
  if (reasons.length === 0) reasons.push("Still building momentum - share it to accelerate growth");
  return reasons;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function fmtHour(h: number) {
  return `${h % 12 || 12}${h < 12 ? "AM" : "PM"}`;
}

export async function getContentIntelligence(userId: number) {
  const posts = await db
    .select({
      id: postsTable.id,
      title: postsTable.title,
      content: postsTable.content,
      type: postsTable.type,
      createdAt: postsTable.createdAt,
      // @ts-expect-error Drizzle column inference lag
      likeCount: postsTable.likeCount,
    })
    .from(postsTable)
    .where(and(
      eq(postsTable.authorId, userId),
      eq(postsTable.isPublished, true),
      eq(postsTable.isDeleted, false),
    ))
    // @ts-expect-error Drizzle column inference lag
    .orderBy(desc(postsTable.likeCount))
    .limit(60);

  if (posts.length === 0) {
    return {
      bestPostingTime: null,
      topContentType: null,
      contentTypeBreakdown: [],
      topPostIntelligence: null,
      whatToPostNext: "Publish your first post to start getting personalized content intelligence.",
    };
  }

  const postIds = posts.map(p => p.id);

  const viewCounts = await db
    .select({ postId: postViewsTable.postId, count: sql<number>`COUNT(*)::int` })
    .from(postViewsTable)
    .where(inArray(postViewsTable.postId, postIds))
    .groupBy(postViewsTable.postId);

  const commentCounts = await db
    .select({ postId: commentsTable.postId, count: sql<number>`COUNT(*)::int` })
    .from(commentsTable)
    .where(inArray(commentsTable.postId, postIds))
    .groupBy(commentsTable.postId);

  const viewMap = new Map(viewCounts.map(v => [v.postId, Number(v.count)]));
  const commentMap = new Map(commentCounts.map(c => [c.postId, Number(c.count)]));

  const hourEng: Map<number, { total: number; n: number }> = new Map();
  const dayEng: Map<number, { total: number; n: number }> = new Map();

  for (const post of posts) {
    const d = new Date(post.createdAt);
    const hour = d.getUTCHours();
    const day = d.getUTCDay();
    const views = viewMap.get(post.id) ?? 0;
    const likes = post.likeCount ?? 0;
    const comments = commentMap.get(post.id) ?? 0;
    const eng = likes * 3 + comments * 5 + views * 0.1;

    const he = hourEng.get(hour) ?? { total: 0, n: 0 };
    hourEng.set(hour, { total: he.total + eng, n: he.n + 1 });

    const de = dayEng.get(day) ?? { total: 0, n: 0 };
    dayEng.set(day, { total: de.total + eng, n: de.n + 1 });
  }

  let bestHour = 9;
  let bestHourScore = -1;
  for (const [hour, { total, n }] of hourEng) {
    const avg = total / n;
    if (avg > bestHourScore) { bestHourScore = avg; bestHour = hour; }
  }

  let bestDay = 1;
  let bestDayScore = -1;
  for (const [day, { total, n }] of dayEng) {
    const avg = total / n;
    if (avg > bestDayScore) { bestDayScore = avg; bestDay = day; }
  }

  const typeMap: Map<string, { views: number; likes: number; comments: number; count: number }> = new Map();
  for (const post of posts) {
    const type = post.type ?? "text";
    const existing = typeMap.get(type) ?? { views: 0, likes: 0, comments: 0, count: 0 };
    typeMap.set(type, {
      views: existing.views + (viewMap.get(post.id) ?? 0),
      likes: existing.likes + (post.likeCount ?? 0),
      comments: existing.comments + (commentMap.get(post.id) ?? 0),
      count: existing.count + 1,
    });
  }

  const contentTypeBreakdown = Array.from(typeMap.entries()).map(([type, s]) => ({
    type,
    count: s.count,
    avgViews: Math.round(s.views / s.count),
    avgLikes: Math.round(s.likes / s.count),
    avgComments: Math.round(s.comments / s.count),
    avgEngRate: s.views > 0
      ? Math.round(((s.likes + s.comments) / s.views) * 10000) / 100
      : 0,
  })).sort((a, b) => b.avgEngRate - a.avgEngRate);

  const topContentType = contentTypeBreakdown[0] ?? null;

  const topPost = posts[0];
  const topViews = viewMap.get(topPost.id) ?? 0;
  const topComments = commentMap.get(topPost.id) ?? 0;
  const topLikes = topPost.likeCount ?? 0;
  const ageHours = (Date.now() - new Date(topPost.createdAt).getTime()) / 3_600_000;
  const viralScore = calcViralScore(topViews, topLikes, topComments, ageHours);
  const hookAnalysis = analyzeHookStrength(topPost.content, topPost.title);
  const engRate = (topLikes + topComments) / Math.max(topViews, 1);
  const whyItWorked = explainPerformance(topViews, topLikes, topComments, viralScore, engRate, hookAnalysis.score);

  let whatToPostNext = "Keep creating consistently - your audience is growing.";
  if (topContentType && posts.length >= 3) {
    whatToPostNext = `Your ${topContentType.type} posts get the most engagement. Try publishing on ${DAYS[bestDay]}s around ${fmtHour(bestHour)} UTC for maximum reach.`;
  }

  return {
    bestPostingTime: {
      hour: bestHour,
      day: DAYS[bestDay],
      label: `${DAYS[bestDay]}s at ${fmtHour(bestHour)} UTC`,
    },
    topContentType,
    contentTypeBreakdown,
    topPostIntelligence: {
      postId: topPost.id,
      title: topPost.title,
      viralScore,
      hookStrength: hookAnalysis,
      whyItWorked,
    },
    whatToPostNext,
  };
}
