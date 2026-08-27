import { db } from "@workspace/db";
import {
  moderationRulesTable,
  postsTable,
  reportsTable,
  usersTable,
  userTrustScoresTable,
  adminLogsTable,
} from "@workspace/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

type EventType = "post_rate" | "trust_threshold" | "report_count";
type Action = "flag_for_review" | "reduce_reach" | "notify_admin";

async function executeAction(action: string, ruleName: string, userId: number): Promise<void> {
  if (action === "flag_for_review") {
    await db.insert(reportsTable).values({
      reporterId: 0,
      targetType: "user",
      targetId: userId,
      reason: `Auto-flagged by rule engine: ${ruleName}`,
      priority: "high",
      status: "pending",
    });
  } else if (action === "reduce_reach") {
    const [u] = await db
      .select({ reachMultiplier: usersTable.reachMultiplier })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (u && Number(u.reachMultiplier ?? 1) > 0.5) {
      await db
        .update(usersTable)
        .set({ reachMultiplier: 0.5, updatedAt: new Date() })
        .where(eq(usersTable.id, userId));
    }
  } else if (action === "notify_admin") {
    await db.insert(adminLogsTable).values({
      adminId: 0,
      action: "rule_triggered",
      targetType: "user",
      targetId: userId,
      details: `Rule "${ruleName}" triggered for user ${userId}`,
    });
  }
}

export async function evaluateRules(userId: number, eventType: EventType): Promise<void> {
  const rules = await db
    .select()
    .from(moderationRulesTable)
    .where(and(eq(moderationRulesTable.isActive, true), eq(moderationRulesTable.triggerType, eventType)));

  for (const rule of rules) {
    let triggered = false;
    if (rule.triggerType === "post_rate") {
      const since = new Date(Date.now() - rule.windowMinutes * 60_000);
      const [{ c }] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(postsTable)
        .where(and(eq(postsTable.authorId, userId), gte(postsTable.createdAt, since)));
      if ((c ?? 0) > rule.thresholdValue) triggered = true;
    } else if (rule.triggerType === "trust_threshold") {
      const [score] = await db
        .select({ uti: userTrustScoresTable.uti })
        .from(userTrustScoresTable)
        .where(eq(userTrustScoresTable.userId, userId));
      if (score && Number(score.uti) < rule.thresholdValue) triggered = true;
    } else if (rule.triggerType === "report_count") {
      const since = new Date(Date.now() - rule.windowMinutes * 60_000);
      const [{ c }] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(reportsTable)
        .where(
          and(
            eq(reportsTable.targetType, "user"),
            eq(reportsTable.targetId, userId),
            gte(reportsTable.createdAt, since),
          ),
        );
      if ((c ?? 0) > rule.thresholdValue) triggered = true;
    }
    if (triggered) {
      await executeAction(rule.action, rule.name, userId);
    }
  }
}

export type { EventType, Action };
