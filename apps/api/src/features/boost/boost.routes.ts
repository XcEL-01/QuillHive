import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { boostRequestsTable, postsTable, usersTable, incomeLogsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../../middleware/admin";
import { verifyTransaction, verifyWebhookSignature, generateTxRef } from "./flutterwave.service";
import { notify } from "../notifications/notification.service";
import { sendEmail } from "../email/email.service";

function boostReceiptHtml(opts: {
  displayName: string;
  planLabel: string;
  durationHours: number;
  amountUsd: number;
  boostEndsAt: Date;
}): string {
  const endsStr = opts.boostEndsAt.toUTCString();
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f0f0f;color:#fff">
<div style="background:#1a1a1a;border-radius:12px;padding:32px;border:1px solid #333">
<h1 style="color:#f59e0b;margin:0 0 8px">🚀 Your Boost is Live!</h1>
<p style="color:#aaa;margin:0 0 24px">Hi ${opts.displayName}, your boost campaign is now active.</p>
<div style="background:#111;border-radius:8px;padding:20px;margin-bottom:24px">
<div style="display:flex;justify-content:space-between;margin-bottom:12px">
<span style="color:#888">Plan</span><strong>${opts.planLabel}</strong></div>
<div style="display:flex;justify-content:space-between;margin-bottom:12px">
<span style="color:#888">Duration</span><strong>${opts.durationHours}h</strong></div>
<div style="display:flex;justify-content:space-between;margin-bottom:12px">
<span style="color:#888">Amount Paid</span><strong>$${opts.amountUsd} USD</strong></div>
<div style="display:flex;justify-content:space-between">
<span style="color:#888">Expires</span><strong style="font-size:12px">${endsStr}</strong></div>
</div>
<a href="${process.env.PUBLIC_APP_URL ?? "https://quillhive.app"}/promotions" style="display:inline-block;background:#f59e0b;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">View My Promotions</a>
<p style="color:#555;font-size:12px;margin-top:24px">QuillHive - Your quill is your voice. Your hive is where it grows. For everyone.</p>
</div></body></html>`;
}

interface AuthedReq extends Request {
  currentUser: { id: number; role: string; email?: string; displayName?: string; username?: string };
}

export const boostRouter: Router = Router();

const BOOST_PLANS = {
  starter:   { label: "Starter Boost",  durationHours: 24,  amountUsd: 5  },
  growth:    { label: "Growth Boost",   durationHours: 72,  amountUsd: 15 },
  spotlight: { label: "Spotlight",      durationHours: 168, amountUsd: 30 },
} as const;
type PlanKey = keyof typeof BOOST_PLANS;

// ── Initialize Flutterwave payment ───────────────────────────────────────────
boostRouter.post("/init-payment", requireAuth, async (req: Request, res: Response) => {
  const flwPublicKey = process.env.FLW_PUBLIC_KEY ?? process.env.FLUTTERWAVE_PUBLIC_KEY;
  if (!flwPublicKey) return res.status(503).json({ error: "Payment processing is not configured" });

  const userId = (req as AuthedReq).currentUser.id;
  const user = (req as AuthedReq).currentUser;
  const { postId, plan } = req.body as { postId?: number; plan?: string };

  if (!postId || !plan || !(plan in BOOST_PLANS)) {
    return res.status(400).json({ error: "postId and a valid plan (starter/growth/spotlight) are required" });
  }

  const [post] = await db
    .select({ id: postsTable.id, authorId: postsTable.authorId, title: postsTable.title })
    .from(postsTable)
    .where(and(eq(postsTable.id, postId), eq(postsTable.isDeleted, false)));
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (post.authorId !== userId) return res.status(403).json({ error: "Only the author can boost this post" });

  const existing = await db
    .select({ id: boostRequestsTable.id })
    .from(boostRequestsTable)
    .where(and(
      eq(boostRequestsTable.postId, postId),
      eq(boostRequestsTable.userId, userId),
      eq(boostRequestsTable.status, "pending_payment"),
    ))
    .limit(1);

  const planInfo = BOOST_PLANS[plan as PlanKey];
  const txRef = generateTxRef(`qh-boost-${userId}-${postId}`);

  if (existing.length > 0) {
    await db
      .update(boostRequestsTable)
      .set({ flwTxRef: txRef } as any)
      .where(eq(boostRequestsTable.id, existing[0].id));
  } else {
    await db
      .insert(boostRequestsTable)
      .values({
        userId,
        postId,
        plan,
        durationHours: planInfo.durationHours,
        status: "pending_payment",
        flwTxRef: txRef,
      } as any);
  }

  const [freshUser] = await db
    .select({ email: usersTable.email, displayName: usersTable.displayName })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  return res.json({
    txRef,
    amount: planInfo.amountUsd,
    currency: "USD",
    publicKey: flwPublicKey,
    planLabel: planInfo.label,
    planDuration: `${planInfo.durationHours}h visibility boost`,
    customerEmail: freshUser?.email ?? (user as { email?: string }).email ?? "",
    customerName: freshUser?.displayName ?? (user as { displayName?: string }).displayName ?? "Creator",
  });
});

// ── Client-side verify after FLW callback ────────────────────────────────────
boostRouter.get("/verify-payment", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthedReq).currentUser.id;
  const { tx_ref, transaction_id } = req.query as { tx_ref?: string; transaction_id?: string };

  if (!tx_ref || !transaction_id) {
    return res.status(400).json({ error: "tx_ref and transaction_id are required" });
  }

  const [boostRequest] = await db
    .select()
    .from(boostRequestsTable)
    .where(and(
      eq(boostRequestsTable.userId, userId),
    ))
    .limit(50)
    .then(rows => rows.filter(r => (r as Record<string, unknown>).flwTxRef === tx_ref));

  if (!boostRequest) return res.status(404).json({ error: "Boost request not found" });
  if (boostRequest.status === "approved") return res.json({ ok: true, message: "Boost already active" });

  const planInfo = BOOST_PLANS[boostRequest.plan as PlanKey];
  if (!planInfo) return res.status(400).json({ error: "Invalid plan" });

  let result;
  try {
    result = await verifyTransaction(transaction_id);
  } catch (err) {
    return res.status(502).json({ error: `Payment verification failed: ${err instanceof Error ? err.message : "unknown"}` });
  }

  if (result.status !== "successful") {
    return res.status(402).json({ error: `Payment not successful (status: ${result.status})` });
  }
  if (result.txRef !== tx_ref || result.currency !== "USD") {
    return res.status(402).json({ error: "Payment does not match this boost" });
  }

  if (result.amount < planInfo.amountUsd) {
    return res.status(402).json({ error: "Payment amount is insufficient" });
  }

  const now = new Date();
  const boostEndsAt = new Date(now.getTime() + boostRequest.durationHours * 3_600_000);

  const updated = await db
    .update(boostRequestsTable)
    .set({
      status: "approved",
      paidAmountCents: Math.round(result.amount * 100),
      reviewedAt: now,
      boostStartsAt: now,
      boostEndsAt,
      adminNote: `Auto-approved via Flutterwave (reference: ${result.flwRef})`,
      flwTransactionId: result.flwRef,
    } as Record<string, unknown>)
    .where(and(eq(boostRequestsTable.id, boostRequest.id), eq(boostRequestsTable.status, "pending_payment")))
    .returning({ id: boostRequestsTable.id });

  if (updated.length === 0) return res.json({ ok: true, message: "Boost already active" });

  void db.insert(incomeLogsTable).values({
    userId: boostRequest.userId,
    amount: planInfo.amountUsd,
    currency: "USD",
    source: "boost",
    description: `${planInfo.label} - Post #${boostRequest.postId}`,
    date: now,
  }).catch(() => {});

  void notify({
    userId: boostRequest.userId,
    actorId: boostRequest.userId,
    type: "system",
    title: "🚀 Your boost is live!",
    message: `${planInfo.label} activated. Post boosted for ${boostRequest.durationHours} hours.`,
    url: "/promotions",
    postId: boostRequest.postId ?? undefined,
  });

  void db.select({ email: usersTable.email, displayName: usersTable.displayName })
    .from(usersTable).where(eq(usersTable.id, boostRequest.userId)).limit(1)
    .then(([u]) => {
      if (!u?.email) return;
      return sendEmail({
        to: u.email,
        subject: "Your QuillHive Boost is Live! 🚀",
        html: boostReceiptHtml({
          displayName: u.displayName ?? "Creator",
          planLabel: planInfo.label,
          durationHours: boostRequest.durationHours,
          amountUsd: planInfo.amountUsd,
          boostEndsAt,
        }),
      });
    }).catch(() => {});

  return res.json({
    ok: true,
    message: `${planInfo.label} activated! Your post will be boosted for ${boostRequest.durationHours} hours.`,
    boostEndsAt,
  });
});

// ── Flutterwave Webhook ───────────────────────────────────────────────────────
boostRouter.post("/webhook", async (req: Request, res: Response) => {
  const signature = req.headers["verif-hash"] as string | undefined;

  if (signature && !verifyWebhookSignature(JSON.stringify(req.body), signature)) {
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  const event = req.body as {
    event?: string;
    data?: {
      id?: number;
      status?: string;
      amount?: number;
      tx_ref?: string;
      meta?: Record<string, string>;
    };
  };

  if (event.event === "charge.completed" && event.data?.status === "successful") {
    const txRef = event.data.tx_ref;
    if (!txRef) return res.json({ received: true });
    if (!event.data.id) return res.json({ received: true });

    let verified;
    try {
      verified = await verifyTransaction(String(event.data.id));
    } catch {
      return res.status(502).json({ error: "Payment verification unavailable" });
    }
    if (!verified.success || verified.txRef !== txRef || verified.currency !== "USD") {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    const allRequests = await db
      .select()
      .from(boostRequestsTable)
      .limit(100)
      .then(rows => rows.filter(r => (r as Record<string, unknown>).flwTxRef === txRef));

    const boostRequest = allRequests[0];
    if (boostRequest && boostRequest.status === "pending_payment") {
      const planInfo = BOOST_PLANS[boostRequest.plan as PlanKey];
      if (planInfo && verified.amount >= planInfo.amountUsd) {
        const now = new Date();
        const boostEndsAt = new Date(now.getTime() + boostRequest.durationHours * 3_600_000);
        const updated = await db
          .update(boostRequestsTable)
          .set({
            status: "approved",
            paidAmountCents: Math.round(verified.amount * 100),
            reviewedAt: now,
            boostStartsAt: now,
            boostEndsAt,
            adminNote: `Auto-approved via Flutterwave webhook (reference: ${verified.flwRef})`,
            flwTransactionId: verified.flwRef,
          } as Record<string, unknown>)
          .where(and(eq(boostRequestsTable.id, boostRequest.id), eq(boostRequestsTable.status, "pending_payment")))
          .returning({ id: boostRequestsTable.id });

        if (updated.length === 0) return res.json({ received: true });

        void db.insert(incomeLogsTable).values({
          userId: boostRequest.userId,
          amount: verified.amount,
          currency: "USD",
          source: "boost",
          description: `${planInfo.label} - Post #${boostRequest.postId} (webhook)`,
          date: now,
        }).catch(() => {});

        void notify({
          userId: boostRequest.userId,
          actorId: boostRequest.userId,
          type: "system",
          title: "🚀 Your boost is live!",
          message: `${planInfo.label} activated. Post boosted for ${boostRequest.durationHours} hours.`,
          url: "/promotions",
          postId: boostRequest.postId ?? undefined,
        });

        void db.select({ email: usersTable.email, displayName: usersTable.displayName })
          .from(usersTable).where(eq(usersTable.id, boostRequest.userId)).limit(1)
          .then(([u]) => {
            if (!u?.email) return;
            return sendEmail({
              to: u.email,
              subject: "Your QuillHive Boost is Live! 🚀",
              html: boostReceiptHtml({
                displayName: u.displayName ?? "Creator",
                planLabel: planInfo.label,
                durationHours: boostRequest.durationHours,
                amountUsd: planInfo.amountUsd,
                boostEndsAt,
              }),
            });
          }).catch(() => {});
      }
    }
  }

  return res.json({ received: true });
});

// ── Plans info (public) ────────────────────────────────────────────────────
boostRouter.get("/plans", (_req: Request, res: Response) => {
  return res.json({
    plans: Object.entries(BOOST_PLANS).map(([key, p]) => ({
      key,
      label: p.label,
      durationHours: p.durationHours,
      amountUsd: p.amountUsd,
      priceDisplay: `$${p.amountUsd}`,
    })),
  });
});

// ── Request a boost (legacy admin-flow, kept for compatibility) ────────────
boostRouter.post("/request", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthedReq).currentUser.id;
  const { postId, plan } = req.body as { postId?: number; plan?: string };

  if (!postId || !plan || !(plan in BOOST_PLANS)) {
    return res.status(400).json({ error: "postId and a valid plan are required" });
  }

  const [post] = await db
    .select({ id: postsTable.id, authorId: postsTable.authorId })
    .from(postsTable)
    .where(and(eq(postsTable.id, postId), eq(postsTable.isDeleted, false)));
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (post.authorId !== userId) return res.status(403).json({ error: "Only the author can boost this post" });

  const existing = await db
    .select()
    .from(boostRequestsTable)
    .where(and(eq(boostRequestsTable.postId, postId), eq(boostRequestsTable.status, "pending")));
  if (existing.length > 0) return res.status(409).json({ error: "A boost request is already pending for this post" });

  const planInfo = BOOST_PLANS[plan as PlanKey];
  const [request] = await db
    .insert(boostRequestsTable)
    .values({ userId, postId, plan, durationHours: planInfo.durationHours, status: "pending" })
    .returning();

  return res.status(201).json({ request, message: "Boost request submitted. Our team will review it soon." });
});

// ── Admin: list all boost requests ───────────────────────────────────────
boostRouter.get("/admin", requireAdmin, async (_req: Request, res: Response) => {
  const rows = await db
    .select({
      id: boostRequestsTable.id,
      plan: boostRequestsTable.plan,
      durationHours: boostRequestsTable.durationHours,
      status: boostRequestsTable.status,
      adminNote: boostRequestsTable.adminNote,
      createdAt: boostRequestsTable.createdAt,
      reviewedAt: boostRequestsTable.reviewedAt,
      boostEndsAt: boostRequestsTable.boostEndsAt,
      paidAmountCents: boostRequestsTable.paidAmountCents,
      postId: postsTable.id,
      postTitle: postsTable.title,
      authorUsername: usersTable.username,
      authorDisplayName: usersTable.displayName,
    })
    .from(boostRequestsTable)
    .leftJoin(postsTable, eq(postsTable.id, boostRequestsTable.postId))
    .leftJoin(usersTable, eq(usersTable.id, boostRequestsTable.userId))
    .orderBy(desc(boostRequestsTable.createdAt))
    .limit(100);
  return res.json({ requests: rows });
});

// ── Admin: approve ────────────────────────────────────────────────────────
boostRouter.post("/:id/approve", requireAdmin, async (req: Request, res: Response) => {
  const adminId = (req as AuthedReq).currentUser.id;
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

  const [request] = await db.select().from(boostRequestsTable).where(eq(boostRequestsTable.id, id));
  if (!request) return res.status(404).json({ error: "Not found" });
  if (request.status !== "pending") return res.status(400).json({ error: "Request is not pending" });

  const now = new Date();
  const boostEndsAt = new Date(now.getTime() + request.durationHours * 3_600_000);
  const adminNote = (req.body as { adminNote?: string }).adminNote;

  await db
    .update(boostRequestsTable)
    .set({ status: "approved", reviewedBy: adminId, reviewedAt: now, boostStartsAt: now, boostEndsAt, adminNote: adminNote || null })
    .where(eq(boostRequestsTable.id, id));

  return res.json({ ok: true, boostEndsAt });
});

// ── My boosts (authenticated user's own history) ──────────────────────────
boostRouter.get("/my", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthedReq).currentUser.id;

  const boosts = await db
    .select({
      id: boostRequestsTable.id,
      status: boostRequestsTable.status,
      plan: boostRequestsTable.plan,
      postId: boostRequestsTable.postId,
      postTitle: postsTable.title,
      boostEndsAt: boostRequestsTable.boostEndsAt,
      createdAt: boostRequestsTable.createdAt,
      adminNote: boostRequestsTable.adminNote,
    })
    .from(boostRequestsTable)
    .leftJoin(postsTable, eq(boostRequestsTable.postId, postsTable.id))
    .where(eq(boostRequestsTable.userId, userId))
    .orderBy(desc(boostRequestsTable.createdAt))
    .limit(50);

  return res.json(boosts);
});

// ── Admin: revoke ─────────────────────────────────────────────────────────
boostRouter.post("/:id/revoke", requireAdmin, async (req: Request, res: Response) => {
  const adminId = (req as AuthedReq).currentUser.id;
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

  await db
    .update(boostRequestsTable)
    .set({ status: "rejected", reviewedBy: adminId, reviewedAt: new Date(), boostEndsAt: new Date(), adminNote: "Revoked by admin" })
    .where(eq(boostRequestsTable.id, id));

  return res.json({ ok: true });
});

// ── Admin: reject ─────────────────────────────────────────────────────────
boostRouter.post("/:id/reject", requireAdmin, async (req: Request, res: Response) => {
  const adminId = (req as AuthedReq).currentUser.id;
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

  const adminNote = (req.body as { adminNote?: string }).adminNote;
  await db
    .update(boostRequestsTable)
    .set({ status: "rejected", reviewedBy: adminId, reviewedAt: new Date(), adminNote: adminNote || null })
    .where(eq(boostRequestsTable.id, id));

  return res.json({ ok: true });
});
