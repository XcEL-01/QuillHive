import { db } from "@workspace/db";
import { readingStreaksTable, readingActivityTable } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  const ad = new Date(a + "T00:00:00Z").getTime();
  const bd = new Date(b + "T00:00:00Z").getTime();
  return Math.round((bd - ad) / 86_400_000);
}

/** Record a read and roll the streak forward. Idempotent per (user, post, day). */
export async function recordRead(userId: number, postId: number) {
  const today = ymd(new Date());
  await db.insert(readingActivityTable).values({ userId, postId, readDate: today }).onConflictDoNothing();

  const [existing] = await db.select().from(readingStreaksTable).where(eq(readingStreaksTable.userId, userId));
  if (!existing) {
    await db.insert(readingStreaksTable).values({
      userId, currentStreak: 1, longestStreak: 1, lastReadDate: today, totalDaysRead: 1,
    });
    return { currentStreak: 1, longestStreak: 1, totalDaysRead: 1 };
  }

  if (existing.lastReadDate === today) {
    return { currentStreak: existing.currentStreak, longestStreak: existing.longestStreak, totalDaysRead: existing.totalDaysRead };
  }

  const gap = existing.lastReadDate ? diffDays(existing.lastReadDate, today) : Infinity;
  const nextStreak = gap === 1 ? existing.currentStreak + 1 : 1;
  const nextLongest = Math.max(existing.longestStreak, nextStreak);

  await db
    .update(readingStreaksTable)
    .set({
      currentStreak: nextStreak,
      longestStreak: nextLongest,
      lastReadDate: today,
      totalDaysRead: existing.totalDaysRead + 1,
      updatedAt: new Date(),
    })
    .where(eq(readingStreaksTable.userId, userId));

  if (nextStreak >= 7) {
    const { checkStreakMilestones } = await import("../achievements/achievement.service");
    void checkStreakMilestones(userId, "reading", nextStreak);
  }

  return { currentStreak: nextStreak, longestStreak: nextLongest, totalDaysRead: existing.totalDaysRead + 1 };
}

export async function getStreak(userId: number) {
  const [row] = await db.select().from(readingStreaksTable).where(eq(readingStreaksTable.userId, userId));
  if (!row) return { currentStreak: 0, longestStreak: 0, totalDaysRead: 0, lastReadDate: null };
  // If the user missed yesterday, reset current streak (display-only; persisted on next read).
  const today = ymd(new Date());
  const gap = row.lastReadDate ? diffDays(row.lastReadDate, today) : Infinity;
  const current = gap > 1 ? 0 : row.currentStreak;
  return {
    currentStreak: current,
    longestStreak: row.longestStreak,
    totalDaysRead: row.totalDaysRead,
    lastReadDate: row.lastReadDate,
  };
}

export async function getRecentActivity(userId: number, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db
    .select({ readDate: readingActivityTable.readDate, count: sql<number>`count(*)::int` })
    .from(readingActivityTable)
    .where(and(eq(readingActivityTable.userId, userId), sql`${readingActivityTable.readDate} >= ${ymd(since)}`))
    .groupBy(readingActivityTable.readDate);
  return rows;
}
