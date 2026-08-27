import webpush from "web-push";
import { db } from "@workspace/db";
import { pushSubscriptionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../../lib/logger";
import { emitEvent } from "../../lib/events";

const VAPID_PUBLIC = process.env["VAPID_PUBLIC_KEY"];
const VAPID_PRIVATE = process.env["VAPID_PRIVATE_KEY"];
const VAPID_SUBJECT = process.env["VAPID_SUBJECT"] || "mailto:admin@quillhive.app";

let configured = false;
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    configured = true;
    logger.info("Web push configured (VAPID keys present)");
  } catch (err) {
    logger.error({ err }, "Failed to configure web-push with provided VAPID keys");
  }
} else {
  logger.warn(
    "Web push disabled — set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars to enable. Generate via `npx web-push generate-vapid-keys`.",
  );
}

export function isPushEnabled(): boolean {
  return configured;
}

export function getPublicKey(): string | null {
  return configured && VAPID_PUBLIC ? VAPID_PUBLIC : null;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
  if (!configured) return;
  try {
    const subs = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.userId, userId));
    if (subs.length === 0) return;
    const json = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            json,
          );
          await db
            .update(pushSubscriptionsTable)
            .set({ lastUsedAt: new Date() })
            .where(eq(pushSubscriptionsTable.id, sub.id));
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await db
              .delete(pushSubscriptionsTable)
              .where(eq(pushSubscriptionsTable.id, sub.id));
            logger.info({ userId, endpoint: sub.endpoint }, "Pruned stale push subscription");
          } else {
            logger.warn({ err, userId }, "push_send_failed");
            emitEvent({
              type: "PUSH_FAILURE",
              severity: "low",
              message: "Push notification delivery failed",
              metadata: { userId, statusCode: status, errorName: (err as Error).name },
            });
          }
        }
      }),
    );
  } catch (err) {
    logger.error({ err, userId }, "sendPushToUser failed");
    emitEvent({
      type: "PUSH_FAILURE",
      severity: "medium",
      message: "Push notification batch failed",
      metadata: { userId, errorName: (err as Error).name, errorMessage: (err as Error).message },
    });
  }
}
