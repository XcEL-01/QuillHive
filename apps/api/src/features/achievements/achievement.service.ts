import { db } from "@workspace/db";
import {
  achievementsTable,
  userAchievementsTable,
  notificationsTable,
  postsTable,
  likesTable,
  followsTable,
} from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { logger } from "../../lib/logger";
import { emitToUser } from "../../lib/socket";
import { sendPushToUser } from "../notifications/push.service";

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: "milestone" | "growth" | "engagement" | "consistency";
}

export const ACHIEVEMENT_DEFS: readonly AchievementDef[] = [
  { key: "first_post", name: "First Post", description: "Published your very first post.", icon: "PenTool", category: "milestone" },
  { key: "ten_posts", name: "Steady Voice", description: "Published 10 posts.", icon: "FileText", category: "milestone" },
  { key: "ten_followers", name: "Rising Voice", description: "Reached 10 followers.", icon: "Users", category: "growth" },
  { key: "hundred_followers", name: "Community Builder", description: "Reached 100 followers.", icon: "Crown", category: "growth" },
  { key: "hundred_likes", name: "Crowd Favorite", description: "A post received 100 likes.", icon: "Heart", category: "engagement" },
  { key: "thousand_likes", name: "Viral Spark", description: "A post received 1,000 likes.", icon: "Flame", category: "engagement" },
  { key: "seven_day_writing_streak", name: "Daily Writer", description: "Wrote on 7 different days in a row.", icon: "Flame", category: "consistency" },
  { key: "seven_day_reading_streak", name: "Avid Reader", description: "Read on 7 different days in a row.", icon: "BookOpen", category: "consistency" },
] as const;

export async function seedAchievements(): Promise<void> {
  try {
    for (const def of ACHIEVEMENT_DEFS) {
      await db
        .insert(achievementsTable)
        .values(def)
        .onConflictDoNothing({ target: achievementsTable.key });
    }
    logger.info({ count: ACHIEVEMENT_DEFS.length }, "Achievements seeded");
  } catch (err) {
    logger.error({ err }, "Failed to seed achievements");
  }
}

export async function awardAchievement(userId: number, key: string): Promise<boolean> {
  try {
    const [ach] = await db.select().from(achievementsTable).where(eq(achievementsTable.key, key));
    if (!ach) return false;
    const inserted = await db
      .insert(userAchievementsTable)
      .values({ userId, achievementId: ach.id })
      .onConflictDoNothing({ target: [userAchievementsTable.userId, userAchievementsTable.achievementId] })
      .returning();
    if (inserted.length === 0) return false;

    const [notif] = await db
      .insert(notificationsTable)
      .values({
        userId,
        actorId: userId,
        type: "system",
        message: `Achievement unlocked: ${ach.name}`,
        category: "system",
        isRead: false,
      })
      .returning();
    emitToUser(userId, "notification:new", { ...notif, achievement: ach });
    void sendPushToUser(userId, {
      title: `Achievement unlocked - ${ach.name}`,
      body: ach.description,
      url: `/profile`,
    });
    logger.info({ userId, key }, "Achievement awarded");
    return true;
  } catch (err) {
    logger.error({ err, userId, key }, "awardAchievement failed");
    return false;
  }
}

export async function checkPostMilestones(authorId: number): Promise<void> {
  try {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(postsTable)
      .where(and(eq(postsTable.authorId, authorId), eq(postsTable.isPublished, true)));
    const count = Number(row?.n ?? 0);
    if (count >= 1) await awardAchievement(authorId, "first_post");
    if (count >= 10) await awardAchievement(authorId, "ten_posts");
  } catch (err) {
    logger.error({ err, authorId }, "checkPostMilestones failed");
  }
}

export async function checkLikeMilestones(postId: number, postAuthorId: number): Promise<void> {
  try {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(likesTable)
      .where(eq(likesTable.postId, postId));
    const count = Number(row?.n ?? 0);
    if (count >= 1000) await awardAchievement(postAuthorId, "thousand_likes");
    else if (count >= 100) await awardAchievement(postAuthorId, "hundred_likes");
  } catch (err) {
    logger.error({ err, postId }, "checkLikeMilestones failed");
  }
}

export async function checkFollowMilestones(targetUserId: number): Promise<void> {
  try {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(followsTable)
      .where(eq(followsTable.followingId, targetUserId));
    const count = Number(row?.n ?? 0);
    if (count >= 100) await awardAchievement(targetUserId, "hundred_followers");
    else if (count >= 10) await awardAchievement(targetUserId, "ten_followers");
  } catch (err) {
    logger.error({ err, targetUserId }, "checkFollowMilestones failed");
  }
}

export async function checkStreakMilestones(
  userId: number,
  type: "reading" | "writing",
  currentStreak: number,
): Promise<void> {
  try {
    if (currentStreak < 7) return;
    const key = type === "writing" ? "seven_day_writing_streak" : "seven_day_reading_streak";
    await awardAchievement(userId, key);
  } catch (err) {
    logger.error({ err, userId, type }, "checkStreakMilestones failed");
  }
}

export async function getUserAchievements(userId: number) {
  return db
    .select({
      id: userAchievementsTable.id,
      unlockedAt: userAchievementsTable.unlockedAt,
      key: achievementsTable.key,
      name: achievementsTable.name,
      description: achievementsTable.description,
      icon: achievementsTable.icon,
      category: achievementsTable.category,
    })
    .from(userAchievementsTable)
    .innerJoin(achievementsTable, eq(achievementsTable.id, userAchievementsTable.achievementId))
    .where(eq(userAchievementsTable.userId, userId))
    .orderBy(userAchievementsTable.unlockedAt);
}

export async function getAllAchievements() {
  return db.select().from(achievementsTable).orderBy(achievementsTable.id);
}
