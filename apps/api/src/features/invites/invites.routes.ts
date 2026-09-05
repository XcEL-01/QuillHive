import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { inviteCodesTable } from "@workspace/db/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { requireAuth } from "../../middleware/admin";

interface AuthedReq extends Request {
  currentUser: { id: number };
}

export const invitesRouter: IRouter = Router();

invitesRouter.post("/generate", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthedReq).currentUser.id;

  const [existingPermanent] = await db
    .select()
    .from(inviteCodesTable)
    .where(
      and(
        eq(inviteCodesTable.createdBy, userId),
        isNull(inviteCodesTable.expiresAt),
      ),
    );

  const origin = process.env["APP_URL"] || `${req.protocol}://${req.get("host")}`;

  if (existingPermanent) {
    res.json({
      invite: existingPermanent,
      shareUrl: `${origin}/register?invite=${existingPermanent.code}`,
    });
    return;
  }

  const code = crypto.randomBytes(6).toString("hex").toUpperCase();
  const [invite] = await db
    .insert(inviteCodesTable)
    .values({ code, createdBy: userId, expiresAt: null })
    .returning();

  res.json({ invite, shareUrl: `${origin}/register?invite=${code}` });
});

invitesRouter.get("/mine", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthedReq).currentUser.id;
  const codes = await db
    .select()
    .from(inviteCodesTable)
    .where(eq(inviteCodesTable.createdBy, userId))
    .orderBy(inviteCodesTable.createdAt);
  res.json({ codes });
});

invitesRouter.get("/validate/:code", async (req: Request, res: Response) => {
  const code = String(req.params["code"] || "").toUpperCase();
  const [invite] = await db
    .select()
    .from(inviteCodesTable)
    .where(
      and(
        eq(inviteCodesTable.code, code),
        eq(inviteCodesTable.isActive, true),
        or(
          isNull(inviteCodesTable.usedBy),
          isNull(inviteCodesTable.expiresAt),
        ),
      ),
    );
  if (!invite) {
    res.json({ valid: false });
    return;
  }
  res.json({ valid: true, code: invite.code });
});

export async function consumeInvite(code: string, newUserId: number): Promise<number | null> {
  const upper = code.toUpperCase();
  const [invite] = await db
    .select()
    .from(inviteCodesTable)
    .where(and(eq(inviteCodesTable.code, upper), eq(inviteCodesTable.isActive, true)));
  if (!invite) return null;

  if (invite.expiresAt !== null) {
    await db
      .update(inviteCodesTable)
      .set({ usedBy: newUserId, usedAt: new Date() })
      .where(eq(inviteCodesTable.id, invite.id));
  }

  // Non-blocking: tiered referral reward notifications
  void (async () => {
    try {
      const { notify } = await import("../notifications/notification.service");
      const { usersTable } = await import("@workspace/db/schema");
      const { eq: eqOp, isNotNull, count: countFn } = await import("drizzle-orm");
      const [newUser] = await db
        .select({ username: usersTable.username, displayName: usersTable.displayName })
        .from(usersTable)
        .where(eqOp(usersTable.id, newUserId));
      const name = newUser?.displayName || newUser?.username || "Someone";

      // Count total successful referrals for the inviter
      const { and: andOp } = await import("drizzle-orm");
      const [{ total }] = await db
        .select({ total: countFn() })
        .from(inviteCodesTable)
        .where(andOp(eqOp(inviteCodesTable.createdBy, invite.createdBy), isNotNull(inviteCodesTable.usedBy)));
      const referralCount = Number(total) || 1;

      const MILESTONES: Record<number, string> = {
        1:  `🎉 ${name} just joined using your invite! Your first referral reward is on its way.`,
        3:  `🚀 ${name} joined - that's 3 referrals! You've unlocked a bonus creator badge.`,
        10: `🏆 10 friends joined through your link! You've reached Elite Referrer status.`,
        25: `👑 Incredible - 25 referrals! You've unlocked the Ambassador tier.`,
      };

      const message = MILESTONES[referralCount]
        ?? `🎁 ${name} joined using your invite! (Referral #${referralCount})`;

      await notify({
        userId: invite.createdBy,
        actorId: newUserId,
        type: "referral_reward",
        message,
      });
    } catch { /* best-effort */ }
  })();

  return invite.createdBy;
}
