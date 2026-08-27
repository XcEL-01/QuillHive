import { Router, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { requireAuth } from "../../middleware/admin";
import { validateBody, validateParams } from "../../middleware/validate";
import {
  initiatePayment,
  verifyTransaction,
  verifyWebhookSignature,
  isConfigured,
  type Currency,
} from "./flutterwave.service";
import { logger } from "../../lib/logger";
import { db } from "@workspace/db";
import { usersTable, incomeLogsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

interface AuthedReq extends Request {
  currentUser: { id: number; email?: string; displayName?: string };
}

export const paymentRouter = Router();

paymentRouter.get("/status", (_req, res) => {
  return res.json({ configured: isConfigured(), gateway: "flutterwave" });
});

const initiateSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(["USD", "NGN", "GHS", "KES", "ZAR", "UGX", "TZS", "RWF", "GBP", "EUR"] as [Currency, ...Currency[]]),
  redirectUrl: z.string().url(),
  description: z.string().max(500).optional(),
  meta: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

paymentRouter.post(
  "/initiate",
  requireAuth,
  validateBody(initiateSchema),
  async (req: Request, res: Response) => {
    if (!isConfigured()) return res.status(503).json({ error: "payment_gateway_not_configured" });
    const userId = (req as AuthedReq).currentUser.id;
    const { amount, currency, redirectUrl, description, meta } = req.body as z.infer<typeof initiateSchema>;

    const [user] = await db
      .select({ email: usersTable.email, displayName: usersTable.displayName })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user) return res.status(404).json({ error: "user_not_found" });

    const txRef = `QH-${userId}-${randomUUID().split("-")[0].toUpperCase()}`;

    try {
      const result = await initiatePayment({
        amount,
        currency,
        email: user.email,
        name: user.displayName || user.email,
        userId,
        txRef,
        redirectUrl,
        description,
        meta,
      });
      return res.json({ ok: true, link: result.link, txRef: result.txRef });
    } catch (err) {
      logger.error({ err, userId }, "payment_initiate_failed");
      return res.status(502).json({ error: "payment_initiate_failed" });
    }
  },
);

const verifyParams = z.object({ transactionId: z.string().min(1) });

paymentRouter.get(
  "/verify/:transactionId",
  requireAuth,
  validateParams(verifyParams),
  async (req: Request, res: Response) => {
    if (!isConfigured()) return res.status(503).json({ error: "payment_gateway_not_configured" });
    const userId = (req as AuthedReq).currentUser.id;
    try {
      const result = await verifyTransaction(req.params.transactionId as string);
      if (result.success) {
        await db.insert(incomeLogsTable).values({
          userId,
          amount: result.amount,
          currency: result.currency,
          source: "flutterwave",
          description: `Transaction ${result.txRef}`,
          date: new Date(),
        });
      }
      return res.json(result);
    } catch (err) {
      logger.error({ err, userId }, "payment_verify_failed");
      return res.status(502).json({ error: "payment_verify_failed" });
    }
  },
);

paymentRouter.post("/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["verif-hash"] as string | undefined;
  if (!sig) return res.status(400).json({ error: "missing_signature" });
  const payload = JSON.stringify(req.body);
  if (!verifyWebhookSignature(payload, sig)) {
    return res.status(401).json({ error: "invalid_signature" });
  }
  const event = req.body as { event: string; data?: { status: string; amount: number; currency: string; tx_ref: string; customer?: { id?: string } } };
  logger.info({ event: event.event, txRef: event.data?.tx_ref }, "flutterwave_webhook_received");
  return res.json({ received: true });
});
