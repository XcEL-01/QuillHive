import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { pushSubscriptionsTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../../middleware/admin";
import { validateBody } from "../../middleware/validate";
import { getPublicKey, isPushEnabled } from "./push.service";

interface AuthedRequest extends Request {
  currentUser: { id: number };
}

export const pushRouter = Router();

pushRouter.get("/vapid-public-key", (_req, res) => {
  if (!isPushEnabled()) return res.status(503).json({ error: "Push notifications not configured" });
  return res.json({ publicKey: getPublicKey() });
});

const subscribeSchema = z.object({
  endpoint: z.string().min(1),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  userAgent: z.string().optional(),
});

pushRouter.post(
  "/subscribe",
  requireAuth,
  validateBody(subscribeSchema),
  async (req: Request, res: Response) => {
    if (!isPushEnabled()) return res.status(503).json({ error: "Push notifications not configured" });
    const userId = (req as AuthedRequest).currentUser.id;
    const { endpoint, keys, userAgent } = req.body as z.infer<typeof subscribeSchema>;
    const [existing] = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
    if (existing) {
      await db
        .update(pushSubscriptionsTable)
        .set({
          userId,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: userAgent ?? null,
          lastUsedAt: new Date(),
        })
        .where(eq(pushSubscriptionsTable.id, existing.id));
      return res.json({ ok: true, updated: true });
    }
    await db.insert(pushSubscriptionsTable).values({
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent ?? null,
    });
    return res.status(201).json({ ok: true });
  },
);

const unsubscribeSchema = z.object({ endpoint: z.string().min(1) });

pushRouter.delete(
  "/subscribe",
  requireAuth,
  validateBody(unsubscribeSchema),
  async (req: Request, res: Response) => {
    const userId = (req as AuthedRequest).currentUser.id;
    const { endpoint } = req.body as z.infer<typeof unsubscribeSchema>;
    await db
      .delete(pushSubscriptionsTable)
      .where(
        and(
          eq(pushSubscriptionsTable.userId, userId),
          eq(pushSubscriptionsTable.endpoint, endpoint),
        ),
      );
    return res.json({ ok: true });
  },
);
