import { sendAlertEmail } from "./emailAlerts";
import type { SystemEvent } from "./events";
import { logger } from "./logger";
import { db } from "@workspace/db";
import { usersTable, postsTable } from "@workspace/db/schema";
import { count, eq, gte, sql } from "drizzle-orm";

const RATE_WINDOW_MS = 5 * 60_000;
const lastSent = new Map<string, number>();

function shouldSend(key: string): boolean {
  const now = Date.now();
  const last = lastSent.get(key);
  if (last && now - last < RATE_WINDOW_MS) return false;
  lastSent.set(key, now);
  return true;
}

function fmtTime(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function formatSystemAlert(event: SystemEvent): string {
  return [
    `🚨 SYSTEM ALERT — QuillHive`,
    ``,
    `Severity: ${event.severity.toUpperCase()}`,
    `Type:     ${event.type}`,
    `Time:     ${fmtTime(event.timestamp)}`,
    ``,
    `Message:`,
    event.message,
    ``,
    `Details:`,
    JSON.stringify(event.metadata ?? {}, null, 2),
    ``,
    `— Owner Intelligence`,
  ].join("\n");
}

function formatSecurityAlert(event: SystemEvent): string {
  return [
    `⚠️ SECURITY EVENT — QuillHive`,
    ``,
    `Time:    ${fmtTime(event.timestamp)}`,
    `Message: ${event.message}`,
    ``,
    `Context:`,
    JSON.stringify(event.metadata ?? {}, null, 2),
    ``,
    `Note: IP addresses are masked for privacy.`,
    `— Owner Intelligence`,
  ].join("\n");
}

export async function handleEvent(event: SystemEvent): Promise<void> {
  try {
    if (event.severity === "critical") {
      const key = `critical:${event.type}:${event.message.slice(0, 60)}`;
      if (shouldSend(key)) {
        await sendAlertEmail("🚨 QuillHive Critical Alert", formatSystemAlert(event));
      }
      return;
    }
    if (event.type === "SECURITY_ALERT" && (event.severity === "high" || event.severity === "medium")) {
      const key = `sec:${event.message.slice(0, 60)}`;
      if (shouldSend(key)) {
        await sendAlertEmail("⚠️ QuillHive Security Warning", formatSecurityAlert(event));
      }
      return;
    }
    if (event.type === "DB_FAILURE" || event.type === "SYSTEM_ERROR") {
      if (event.severity === "high") {
        const key = `err:${event.type}:${event.message.slice(0, 60)}`;
        if (shouldSend(key)) {
          await sendAlertEmail(`⚠️ QuillHive ${event.type}`, formatSystemAlert(event));
        }
      }
    }
  } catch (err) {
    logger.warn({ err }, "handleEvent failed");
  }
}

// ─── Daily digest ─────────────────────────────────────────────────────────────
export async function sendDailyDigest(): Promise<void> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60_000);
    const [u] = await db.select({ c: count() }).from(usersTable).where(eq(usersTable.isDeleted, false));
    const [p] = await db.select({ c: count() }).from(postsTable).where(eq(postsTable.isDeleted, false));
    const [newUsers] = await db
      .select({ c: count() })
      .from(usersTable)
      .where(gte(usersTable.createdAt, since));
    const [newPosts] = await db
      .select({ c: count() })
      .from(postsTable)
      .where(gte(postsTable.createdAt, since));

    const body = [
      `📊 QUILLHIVE DAILY REPORT`,
      `Date: ${new Date().toISOString().slice(0, 10)}`,
      ``,
      `Total Users:     ${u?.c ?? 0}`,
      `Total Posts:     ${p?.c ?? 0}`,
      ``,
      `Last 24 hours:`,
      `  • New users:    ${newUsers?.c ?? 0}`,
      `  • New posts:    ${newPosts?.c ?? 0}`,
      ``,
      `— Owner Intelligence`,
    ].join("\n");

    await sendAlertEmail("📊 QuillHive Daily Report", body);
  } catch (err) {
    logger.warn({ err }, "sendDailyDigest failed");
  }
}

let digestTimer: NodeJS.Timeout | null = null;
export function startDailyDigest(): void {
  if (digestTimer) return;
  // Send first digest 60s after boot, then every 24h
  digestTimer = setTimeout(() => {
    void sendDailyDigest();
    digestTimer = setInterval(() => void sendDailyDigest(), 24 * 60 * 60_000);
  }, 60_000);
}

// ─── Anomaly detection (rule-based) ───────────────────────────────────────────
const buckets = {
  signups5m: [] as number[],
  errors5m: [] as number[],
  requests5m: [] as number[],
};

export function recordSignup(): void {
  buckets.signups5m.push(Date.now());
  pruneOld(buckets.signups5m);
}
export function recordError(): void {
  buckets.errors5m.push(Date.now());
  pruneOld(buckets.errors5m);
}
export function recordRequestForAnomaly(): void {
  buckets.requests5m.push(Date.now());
  pruneOld(buckets.requests5m);
}

function pruneOld(arr: number[]): void {
  const cutoff = Date.now() - 5 * 60_000;
  while (arr.length && (arr[0] ?? 0) < cutoff) arr.shift();
}

export interface AnomalyResult {
  anomalies: Array<{ kind: string; value: number; threshold: number; message: string }>;
  metrics: {
    signups5m: number;
    errors5m: number;
    requests5m: number;
    errorRatePct: number;
  };
}

export function detectAnomalies(): AnomalyResult {
  pruneOld(buckets.signups5m);
  pruneOld(buckets.errors5m);
  pruneOld(buckets.requests5m);
  const signups = buckets.signups5m.length;
  const errors = buckets.errors5m.length;
  const requests = buckets.requests5m.length;
  const errorRate = requests > 0 ? (errors / requests) * 100 : 0;
  const anomalies: AnomalyResult["anomalies"] = [];

  if (signups > 20) {
    anomalies.push({
      kind: "signup_spike",
      value: signups,
      threshold: 20,
      message: `Unusual signup volume: ${signups} in last 5 minutes`,
    });
  }
  if (errorRate > 5 && requests > 50) {
    anomalies.push({
      kind: "error_rate",
      value: Number(errorRate.toFixed(2)),
      threshold: 5,
      message: `Elevated error rate: ${errorRate.toFixed(1)}% over last 5 minutes`,
    });
  }
  return {
    anomalies,
    metrics: { signups5m: signups, errors5m: errors, requests5m: requests, errorRatePct: Number(errorRate.toFixed(2)) },
  };
}

let anomalyTimer: NodeJS.Timeout | null = null;
export function startAnomalyMonitor(): void {
  if (anomalyTimer) return;
  anomalyTimer = setInterval(() => {
    const result = detectAnomalies();
    for (const a of result.anomalies) {
      const key = `anomaly:${a.kind}`;
      if (shouldSend(key)) {
        void sendAlertEmail(
          `⚠️ QuillHive Anomaly Detected`,
          `Anomaly: ${a.kind}\nValue: ${a.value}\nThreshold: ${a.threshold}\n\n${a.message}\n\n— Owner Intelligence`,
        );
      }
    }
  }, 60_000);
}

// Re-export rate-limit signal for tests/admin
export function alertCooldownStatus(): Array<{ key: string; sentAgoMs: number }> {
  const now = Date.now();
  return Array.from(lastSent.entries()).map(([key, ts]) => ({ key, sentAgoMs: now - ts }));
}

// suppress unused import warning for sql helper if needed by downstream
void sql;
