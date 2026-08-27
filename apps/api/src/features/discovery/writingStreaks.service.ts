import { db } from "@workspace/db";
import { writingStreaksTable, writingActivityTable } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  const ad = new Date(a + "T00:00:00Z").getTime();
  const bd = new Date(b + "T00:00:00Z").getTime();
  return Math.round((bd - ad) / 86_400_000);
}

export async function recordWrite(userId: number, postId: number) {
  const today = ymd(new Date());
  await db
    .insert(writingActivityTable)
    .values({ userId, postId, writeDate: today })
    .onConflictDoNothing();

  const [existing] = await db
    .select()
    .from(writingStreaksTable)
    .where(eq(writingStreaksTable.userId, userId));

  let nextStreak = 1;
  let nextLongest = 1;
  let totalDays = 1;

  if (!existing) {
    await db.insert(writingStreaksTable).values({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastWriteDate: today,
      totalDaysWritten: 1,
    });
  } else if (existing.lastWriteDate === today) {
    return {
      currentStreak: existing.currentStreak,
      longestStreak: existing.longestStreak,
      totalDaysWritten: existing.totalDaysWritten,
    };
  } else {
    const gap = existing.lastWriteDate ? diffDays(existing.lastWriteDate, today) : Infinity;
    nextStreak = gap === 1 ? existing.currentStreak + 1 : 1;
    nextLongest = Math.max(existing.longestStreak, nextStreak);
    totalDays = existing.totalDaysWritten + 1;
    await db
      .update(writingStreaksTable)
      .set({
        currentStreak: nextStreak,
        longestStreak: nextLongest,
        lastWriteDate: today,
        totalDaysWritten: totalDays,
        updatedAt: new Date(),
      })
      .where(eq(writingStreaksTable.userId, userId));
  }

  if (nextStreak >= 7) {
    const { checkStreakMilestones } = await import("../achievements/achievement.service");
    void checkStreakMilestones(userId, "writing", nextStreak);
  }

  // Milestone notification system
  const STREAK_MILESTONES: Array<{ days: number; name: string; emoji: string }> = [
    { days: 3,   name: "Kindling",     emoji: "🌱" },
    { days: 7,   name: "Burning",      emoji: "🔥" },
    { days: 14,  name: "Blazing",      emoji: "⚡" },
    { days: 30,  name: "Inferno",      emoji: "💥" },
    { days: 60,  name: "Unstoppable",  emoji: "🚀" },
    { days: 100, name: "Legend",       emoji: "👑" },
    { days: 365, name: "Hive Eternal", emoji: "🏆" },
  ];
  const milestone = STREAK_MILESTONES.find(m => m.days === nextStreak);
  if (milestone) {
    try {
      const { db: _db } = await import("@workspace/db");
      const { notificationsTable } = await import("@workspace/db/schema");
      await _db.insert(notificationsTable).values({
        userId,
        actorId: userId,
        type: "streak_milestone",
        message: `${milestone.emoji} You've hit a ${milestone.days}-day streak! You've earned the "${milestone.name}" badge.`,
        priority: "high",
        category: "growth",
      });
      const { getIO } = await import("../../lib/socket");
      const io = getIO();
      io?.to(`user:${userId}`).emit("notification:new", {
        type: "streak_milestone",
        message: `${milestone.emoji} ${milestone.name} badge earned! ${milestone.days}-day streak!`,
      });
    } catch { /* never block write recording */ }
  }

  return { currentStreak: nextStreak, longestStreak: nextLongest, totalDaysWritten: totalDays };
}

export async function getWritingStreak(userId: number) {
  const [row] = await db
    .select()
    .from(writingStreaksTable)
    .where(eq(writingStreaksTable.userId, userId));
  if (!row) {
    return { currentStreak: 0, longestStreak: 0, totalDaysWritten: 0, lastWriteDate: null };
  }
  const today = ymd(new Date());
  const gap = row.lastWriteDate ? diffDays(row.lastWriteDate, today) : Infinity;
  const current = gap > 1 ? 0 : row.currentStreak;
  return {
    currentStreak: current,
    longestStreak: row.longestStreak,
    totalDaysWritten: row.totalDaysWritten,
    lastWriteDate: row.lastWriteDate,
  };
}

export async function getRecentWritingActivity(userId: number, days = 84) {
  const since = new Date(Date.now() - days * 86_400_000);
  return db
    .select({ writeDate: writingActivityTable.writeDate, count: sql<number>`count(*)::int` })
    .from(writingActivityTable)
    .where(
      and(
        eq(writingActivityTable.userId, userId),
        sql`${writingActivityTable.writeDate} >= ${ymd(since)}`,
      ),
    )
    .groupBy(writingActivityTable.writeDate);
}
