import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { webhooksTable, webhookDeliveriesTable } from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { generateWebhookSecret } from "./webhooks.service";

const ALLOWED_EVENTS = ["post.published", "post.updated", "user.followed", "comment.created"] as const;

const createWebhookSchema = z.object({
  url: z.string().url().max(500),
  events: z.array(z.enum(ALLOWED_EVENTS)).min(1),
});

const updateWebhookSchema = z.object({
  url: z.string().url().max(500).optional(),
  events: z.array(z.enum(ALLOWED_EVENTS)).min(1).optional(),
  isActive: z.boolean().optional(),
});

function getOwnerUserId(req: Request): number | null {
  const reqWithUser = req as Request & { user?: { id?: number } };
  const v = reqWithUser.user?.id;
  return typeof v === "number" ? v : null;
}

export const webhooksRouter: IRouter = Router();

webhooksRouter.get("/", async (req: Request, res: Response) => {
  const userId = getOwnerUserId(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const rows = await db
    .select({
      id: webhooksTable.id,
      url: webhooksTable.url,
      events: webhooksTable.events,
      isActive: webhooksTable.isActive,
      failureCount: webhooksTable.failureCount,
      lastDeliveryAt: webhooksTable.lastDeliveryAt,
      lastSuccessAt: webhooksTable.lastSuccessAt,
      createdAt: webhooksTable.createdAt,
    })
    .from(webhooksTable)
    .where(eq(webhooksTable.userId, userId))
    .orderBy(desc(webhooksTable.createdAt));
  res.json({ data: rows });
});

webhooksRouter.post("/", async (req: Request, res: Response) => {
  const userId = getOwnerUserId(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = createWebhookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    return;
  }
  const secret = generateWebhookSecret();
  const [row] = await db
    .insert(webhooksTable)
    .values({
      userId,
      url: parsed.data.url,
      secret,
      events: JSON.stringify(parsed.data.events),
    })
    .returning();
  res.status(201).json({ data: { id: row.id, url: row.url, events: row.events, secret } });
});

webhooksRouter.patch("/:id", async (req: Request, res: Response) => {
  const userId = getOwnerUserId(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }
  const parsed = updateWebhookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.url !== undefined) updates["url"] = parsed.data.url;
  if (parsed.data.events !== undefined) updates["events"] = JSON.stringify(parsed.data.events);
  if (parsed.data.isActive !== undefined) updates["isActive"] = parsed.data.isActive;
  await db
    .update(webhooksTable)
    .set(updates)
    .where(and(eq(webhooksTable.id, id), eq(webhooksTable.userId, userId)));
  res.json({ ok: true });
});

webhooksRouter.delete("/:id", async (req: Request, res: Response) => {
  const userId = getOwnerUserId(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }
  await db.delete(webhooksTable).where(and(eq(webhooksTable.id, id), eq(webhooksTable.userId, userId)));
  res.status(204).end();
});

webhooksRouter.get("/:id/deliveries", async (req: Request, res: Response) => {
  const userId = getOwnerUserId(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }
  const [hook] = await db
    .select()
    .from(webhooksTable)
    .where(and(eq(webhooksTable.id, id), eq(webhooksTable.userId, userId)));
  if (!hook) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const rows = await db
    .select()
    .from(webhookDeliveriesTable)
    .where(eq(webhookDeliveriesTable.webhookId, id))
    .orderBy(desc(webhookDeliveriesTable.attemptedAt))
    .limit(50);
  res.json({ data: rows });
});
