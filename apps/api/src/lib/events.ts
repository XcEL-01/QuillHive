import { logger } from "./logger";
import { handleEvent } from "./alertEngine";
import { getIO } from "./socket";

export type SystemEventType =
  | "SYSTEM_ERROR"
  | "DB_FAILURE"
  | "UPLOAD_FAILURE"
  | "PUSH_FAILURE"
  | "SECURITY_ALERT"
  | "USER_EVENT"
  | "ENGAGEMENT_METRIC";

export type EventSeverity = "low" | "medium" | "high" | "critical";

export interface SystemEvent {
  type: SystemEventType;
  message: string;
  metadata?: Record<string, unknown>;
  severity: EventSeverity;
  timestamp: number;
}

const BUFFER_LIMIT = 500;
const eventBuffer: SystemEvent[] = [];

const counters = {
  errors: 0,
  requests: 0,
  signups: 0,
  uploadFailures: 0,
  pushFailures: 0,
  startedAt: Date.now(),
};

const ALLOWED_META_KEYS = new Set([
  "ipMasked",
  "country",
  "userId",
  "username",
  "postId",
  "groupId",
  "route",
  "method",
  "statusCode",
  "errorName",
  "errorMessage",
  "service",
  "duration",
  "count",
  "limit",
  "threshold",
  "type",
  "reason",
  "source",
]);

function sanitizeMetadata(meta?: Record<string, unknown>): Record<string, unknown> {
  if (!meta) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (!ALLOWED_META_KEYS.has(k)) continue;
    if (typeof v === "string" && v.length > 200) {
      out[k] = v.slice(0, 200) + "...";
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function emitEvent(event: Omit<SystemEvent, "timestamp"> & { timestamp?: number }): void {
  const safe: SystemEvent = {
    type: event.type,
    severity: event.severity,
    message: String(event.message).slice(0, 500),
    metadata: sanitizeMetadata(event.metadata),
    timestamp: event.timestamp ?? Date.now(),
  };
  eventBuffer.push(safe);
  if (eventBuffer.length > BUFFER_LIMIT) eventBuffer.shift();

  if (safe.type === "SYSTEM_ERROR" || safe.type === "DB_FAILURE") counters.errors++;
  if (safe.type === "UPLOAD_FAILURE") counters.uploadFailures++;
  if (safe.type === "PUSH_FAILURE") counters.pushFailures++;
  if (safe.type === "USER_EVENT" && safe.metadata?.["type"] === "signup") counters.signups++;

  try {
    getIO()?.to("admin:monitoring").emit("admin:event", safe);
  } catch {
    // never crash on socket failure
  }

  void handleEvent(safe).catch((err) => {
    logger.warn({ err }, "alertEngine.handleEvent failed");
  });
}

export function recordRequest(): void {
  counters.requests++;
}

export function getRecentEvents(limit = 100, type?: SystemEventType): SystemEvent[] {
  const filtered = type ? eventBuffer.filter((e) => e.type === type) : eventBuffer;
  return filtered.slice(-limit).reverse();
}

export function getEventCounters(): Record<string, number> {
  return { ...counters };
}

export function clearEventBuffer(): void {
  eventBuffer.length = 0;
}

export function maskIp(ip: string | undefined | null): string {
  if (!ip) return "unknown";
  const cleaned = ip.replace(/^::ffff:/, "");
  if (cleaned.includes(":")) {
    const parts = cleaned.split(":");
    return parts.slice(0, 2).join(":") + ":xxxx:xxxx";
  }
  const parts = cleaned.split(".");
  if (parts.length !== 4) return "unknown";
  return `${parts[0]}.xxx.xxx.xxx`;
}
