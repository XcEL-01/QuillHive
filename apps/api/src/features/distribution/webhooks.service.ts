import { createHmac, randomBytes } from "crypto";
import { db } from "@workspace/db";
import { webhooksTable, webhookDeliveriesTable } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { logger } from "../../lib/logger";

export type WebhookEvent =
  | "post.published"
  | "post.updated"
  | "user.followed"
  | "comment.created"
  | "mention.created"
  | "warning.issued"
  | "job.created"
  | "group.promoted";

interface DispatchOptions {
  userId: number;
  event: WebhookEvent;
  data: Record<string, unknown>;
}

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function dispatchWebhook({ userId, event, data }: DispatchOptions): Promise<void> {
  try {
    const hooks = await db
      .select()
      .from(webhooksTable)
      .where(and(eq(webhooksTable.userId, userId), eq(webhooksTable.isActive, true)));

    const matching = hooks.filter((h) => {
      try {
        const events: unknown = JSON.parse(h.events);
        return Array.isArray(events) && events.includes(event);
      } catch {
        return false;
      }
    });
    if (matching.length === 0) return;

    const payload = JSON.stringify({ event, createdAt: new Date().toISOString(), data });

    await Promise.all(
      matching.map(async (hook) => {
        const signature = signPayload(hook.secret, payload);
        let status: number | null = null;
        let body = "";
        let succeeded = false;
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          const r = await fetch(hook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-QuillHive-Event": event,
              "X-QuillHive-Signature": signature,
            },
            body: payload,
            signal: controller.signal,
          });
          clearTimeout(timer);
          status = r.status;
          body = (await r.text()).slice(0, 500);
          succeeded = r.ok;
        } catch (err) {
          body = err instanceof Error ? err.message.slice(0, 500) : "delivery_error";
        }

        await db.insert(webhookDeliveriesTable).values({
          webhookId: hook.id,
          eventType: event,
          payload,
          responseStatus: status,
          responseBody: body,
          succeeded,
        });

        await db
          .update(webhooksTable)
          .set({
            lastDeliveryAt: new Date(),
            lastSuccessAt: succeeded ? new Date() : hook.lastSuccessAt,
            failureCount: succeeded ? 0 : sql`${webhooksTable.failureCount} + 1`,
            isActive: !succeeded && hook.failureCount + 1 >= 10 ? false : hook.isActive,
          })
          .where(eq(webhooksTable.id, hook.id));
      }),
    );
  } catch (err) {
    logger.error({ err, event, userId }, "webhook_dispatch_failed");
  }
}
