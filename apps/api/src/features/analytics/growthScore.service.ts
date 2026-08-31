import { db } from "@workspace/db";
import {
  usersTable,
  postsTable,
  followsTable,
  userTrustScoresTable,
  readingProgressTable,
  skillEndorsementsTable,
  serviceListingsTable,
  portfolioItemsTable,
  postViewsTable,
  likesTable,
  commentsTable,
} from "@workspace/db/schema";
import { and, eq, gte, count, sql, inArray } from "drizzle-orm";

function clamp(v: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));
}

export type GrowthTier =
  | "getting_started"
  | "building_momentum"
  | "growing_creator"
  | "accelerating"
  | "creator_elite";

export interface GrowthScoreResult {
  score: number;
  tier: GrowthTier;
  tierLabel: string;
  weeklyDelta: number;
  components: {
    trustQuality: number;
    followerGrowth: number;
    consistency: number;
    profileCompletion: number;
    endorsements: number;
    services: number;
  };
  nextTierScore: number | null;
  nextTierLabel: string | null;
  tips: string[];
}

export interface OpportunityReadinessResult {
  score: number;
  label: string;
  factors: Array<{ label: string; done: boolean; impact: "high" | "medium" | "low" }>;
  tips: string[];
}

function getTier(score: number): { tier: GrowthTier; label: string; nextScore: number | null; nextLabel: string | null } {
  if (score >= 81) return { tier: "creator_elite", label: "Creator Elite", nextScore: null, nextLabel: null };
  if (score >= 61) return { tier: "accelerating", label: "Accelerating", nextScore: 81, nextLabel: "Creator Elite" };
  if (score >= 41) return { tier: "growing_creator", label: "Growing Creator", nextScore: 61, nextLabel: "Accelerating" };
  if (score >= 21) return { tier: "building_momentum", label: "Building Momentum", nextScore: 41, nextLabel: "Growing Creator" };
  return { tier: "getting_started", label: "Getting Started", nextScore: 21, nextLabel: "Building Momentum" };
}

export async function getCreatorGrowthScore(userId: number): Promise<GrowthScoreResult> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    user,
    trustScore,
    recentFollowers,
    prevWeekFollowers,
    recentPosts,
    allPosts,
    endorsements,
    services,
    portfolioItems,
  ] = await Promise.all([
    db.select({
      bio: usersTable.bio,
      avatarUrl: usersTable.avatarUrl,
      headline: usersTable.headline,
      website: usersTable.website,
      location: usersTable.location,
      hireMeEnabled: usersTable.hireMeEnabled,
    }).from(usersTable).where(eq(usersTable.id, userId)).limit(1),

    db.select({ uti: userTrustScoresTable.uti })
      .from(userTrustScoresTable).where(eq(userTrustScoresTable.userId, userId)).limit(1),

    db.select({ count: count() }).from(followsTable)
      .where(and(eq(followsTable.followingId, userId), gte(followsTable.createdAt, sevenDaysAgo))),

    db.select({ count: count() }).from(followsTable)
      .where(and(
        eq(followsTable.followingId, userId),
        gte(followsTable.createdAt, fourteenDaysAgo),
        sql`${followsTable.createdAt} < ${sevenDaysAgo}`,
      )),

    db.select({ count: count() }).from(postsTable)
      .where(and(
        eq(postsTable.authorId, userId),
        eq(postsTable.isPublished, true),
        eq(postsTable.isDeleted, false),
        gte(postsTable.createdAt, thirtyDaysAgo),
      )),

    db.select({ id: postsTable.id }).from(postsTable)
      .where(and(eq(postsTable.authorId, userId), eq(postsTable.isPublished, true), eq(postsTable.isDeleted, false))),

    db.select({ count: count() }).from(skillEndorsementsTable)
      .where(eq(skillEndorsementsTable.toUserId, userId)),

    db.select({ count: count() }).from(serviceListingsTable)
      .where(and(eq(serviceListingsTable.creatorId, userId), eq(serviceListingsTable.isActive, true))),

    db.select({ count: count() }).from(portfolioItemsTable)
      .where(eq(portfolioItemsTable.userId, userId)),
  ]);

  const uti = Number(trustScore[0]?.uti ?? 50);
  const trustQuality = clamp(uti);

  const thisWeekFollowers = Number(recentFollowers[0]?.count ?? 0);
  const prevWeekFollowersCnt = Number(prevWeekFollowers[0]?.count ?? 0);
  const followerGrowth = clamp(Math.min(thisWeekFollowers * 5, 100));

  const postsLast30 = Number(recentPosts[0]?.count ?? 0);
  const consistency = clamp(Math.min(postsLast30 * 8, 100));

  const u = user[0];
  let completionPoints = 0;
  if (u?.avatarUrl) completionPoints += 20;
  if (u?.bio && (u.bio as string).length > 20) completionPoints += 20;
  if (u?.headline) completionPoints += 20;
  if (u?.website) completionPoints += 15;
  if (u?.location) completionPoints += 10;
  const portfolioCnt = Number(portfolioItems[0]?.count ?? 0);
  if (portfolioCnt >= 1) completionPoints += 15;
  const profileCompletion = clamp(completionPoints);

  const endorsementCnt = Number(endorsements[0]?.count ?? 0);
  const endorsementScore = clamp(Math.min(endorsementCnt * 10, 100));

  const servicesCnt = Number(services[0]?.count ?? 0);
  const servicesScore = clamp(Math.min(servicesCnt * 25, 100));

  const score = Math.round(
    trustQuality * 0.30 +
    followerGrowth * 0.20 +
    consistency * 0.20 +
    profileCompletion * 0.15 +
    endorsementScore * 0.10 +
    servicesScore * 0.05
  );

  const weeklyDelta = thisWeekFollowers - prevWeekFollowersCnt;

  const { tier, label, nextScore, nextLabel } = getTier(score);

  const tips: string[] = [];
  if (profileCompletion < 80) tips.push("Complete your profile (bio, headline, avatar) for a stronger growth signal.");
  if (consistency < 50) tips.push("Post at least 3–5 times per month to build audience consistency.");
  if (endorsementScore < 30) tips.push("Get skill endorsements from collaborators - they boost your opportunity score.");
  if (servicesScore === 0) tips.push("Add a service listing to unlock income and collaboration opportunities.");
  if (trustQuality < 55) tips.push("Focus on content quality - saves, deep reads, and thoughtful comments lift your trust score.");

  return {
    score: clamp(score),
    tier,
    tierLabel: label,
    weeklyDelta,
    components: {
      trustQuality,
      followerGrowth,
      consistency,
      profileCompletion,
      endorsements: endorsementScore,
      services: servicesScore,
    },
    nextTierScore: nextScore,
    nextTierLabel: nextLabel,
    tips,
  };
}

export async function getOpportunityReadiness(userId: number): Promise<OpportunityReadinessResult> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [user, services, endorsements, recentPosts, portfolio, trustScore] = await Promise.all([
    db.select({
      bio: usersTable.bio,
      avatarUrl: usersTable.avatarUrl,
      headline: usersTable.headline,
      hireMeEnabled: usersTable.hireMeEnabled,
    }).from(usersTable).where(eq(usersTable.id, userId)).limit(1),

    db.select({ count: count() }).from(serviceListingsTable)
      .where(and(eq(serviceListingsTable.creatorId, userId), eq(serviceListingsTable.isActive, true))),

    db.select({ count: count() }).from(skillEndorsementsTable)
      .where(eq(skillEndorsementsTable.toUserId, userId)),

    db.select({ count: count() }).from(postsTable)
      .where(and(
        eq(postsTable.authorId, userId),
        eq(postsTable.isPublished, true),
        eq(postsTable.isDeleted, false),
        gte(postsTable.createdAt, thirtyDaysAgo),
      )),

    db.select({ count: count() }).from(portfolioItemsTable)
      .where(eq(portfolioItemsTable.userId, userId)),

    db.select({ uti: userTrustScoresTable.uti })
      .from(userTrustScoresTable).where(eq(userTrustScoresTable.userId, userId)).limit(1),
  ]);

  const u = user[0];
  const hasAvatar = !!u?.avatarUrl;
  const hasBio = !!(u?.bio && (u.bio as string).length > 20);
  const hasHeadline = !!u?.headline;
  const hasServices = Number(services[0]?.count ?? 0) > 0;
  const hasEndorsements = Number(endorsements[0]?.count ?? 0) >= 2;
  const isConsistent = Number(recentPosts[0]?.count ?? 0) >= 3;
  const hasPortfolio = Number(portfolio[0]?.count ?? 0) >= 1;
  const hasHireMe = !!u?.hireMeEnabled;
  const uti = Number(trustScore[0]?.uti ?? 50);
  const highEngagement = uti >= 60;

  const factors: OpportunityReadinessResult["factors"] = [
    { label: "Profile photo & bio", done: hasAvatar && hasBio, impact: "high" },
    { label: "Professional headline", done: hasHeadline, impact: "high" },
    { label: "At least 1 service listing", done: hasServices, impact: "high" },
    { label: "2+ skill endorsements", done: hasEndorsements, impact: "medium" },
    { label: "Portfolio work added", done: hasPortfolio, impact: "medium" },
    { label: "Posting consistently (3+/month)", done: isConsistent, impact: "medium" },
    { label: "Hire Me mode enabled", done: hasHireMe, impact: "low" },
    { label: "High content quality score", done: highEngagement, impact: "high" },
  ];

  const weights: Record<"high" | "medium" | "low", number> = { high: 20, medium: 10, low: 5 };
  const totalWeight = factors.reduce((s, f) => s + weights[f.impact], 0);
  const earnedWeight = factors.filter(f => f.done).reduce((s, f) => s + weights[f.impact], 0);
  const score = Math.round((earnedWeight / totalWeight) * 100);

  let label = "Not Ready";
  if (score >= 80) label = "Opportunity Ready";
  else if (score >= 60) label = "Nearly Ready";
  else if (score >= 40) label = "Building Profile";
  else label = "Getting Started";

  const tips = factors
    .filter(f => !f.done && f.impact === "high")
    .map(f => `Complete: ${f.label}`)
    .slice(0, 3);

  return { score, label, factors, tips };
}
