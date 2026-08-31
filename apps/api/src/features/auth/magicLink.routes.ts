import { Router, type Request, type Response } from "express";
import { createHash, randomBytes } from "crypto";
import { db } from "@workspace/db";
import { magicLinkTokensTable, usersTable } from "@workspace/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { createAuthTokens } from "../../lib/auth";
import { sendEmail } from "../email/email.service";
import { magicLinkEmailHtml, magicLinkEmailText } from "../email/email.templates";
import { rateLimit } from "../../middleware/rateLimit";

export const magicLinkRouter = Router();

// Rate limit magic link requests: max 5 per hour per IP to prevent spam
const magicLinkLimit = rateLimit({ windowMs: 60 * 60_000, max: 5 });

const TOKEN_TTL_MS = 15 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function ipHash(req: Request): string | null {
  const fwd = req.headers["x-forwarded-for"];
  const ip = typeof fwd === "string" ? fwd.split(",")[0].trim() : req.ip || null;
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

magicLinkRouter.post("/request", magicLinkLimit, async (req, res: Response) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email required" });
  }

  const [user] = await db.select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (user) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await db.insert(magicLinkTokensTable).values({
      email,
      tokenHash,
      expiresAt,
      ipHash: ipHash(req),
      userAgent: (req.headers["user-agent"] || "").slice(0, 200),
    });

    const base = process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get("host")}`;
    const url = `${base}/auth/magic?token=${encodeURIComponent(token)}`;
    const brand = process.env.BRAND_NAME || "QuillHive";

    try {
      await sendEmail({
        to: email,
        subject: `Your ${brand} sign-in link`,
        html: magicLinkEmailHtml({ link: url }),
        text: magicLinkEmailText({ link: url }),
      });
    } catch {
      /* email may not be configured in dev */
    }

    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[magicLink] DEV ONLY - devLink generated for ${email}: ${url}`);
      return res.json({ ok: true, devLink: url });
    }
  }

  return res.json({ ok: true });
});

magicLinkRouter.post("/consume", async (req, res: Response) => {
  const token = String(req.body?.token ?? "").trim();
  if (!token) return res.status(400).json({ error: "Token required" });
  const tokenHash = hashToken(token);

  const [row] = await db.select()
    .from(magicLinkTokensTable)
    .where(and(
      eq(magicLinkTokensTable.tokenHash, tokenHash),
      isNull(magicLinkTokensTable.usedAt),
      gt(magicLinkTokensTable.expiresAt, new Date()),
    ))
    .limit(1);

  if (!row) return res.status(400).json({ error: "Invalid or expired link" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, row.email)).limit(1);
  if (!user) return res.status(400).json({ error: "Account not found" });

  await db.update(magicLinkTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(magicLinkTokensTable.id, row.id));

  const ua = (req.headers["user-agent"] || "").slice(0, 200);
  const tokens = await createAuthTokens(user.id, { userAgent: ua, ipHash: ipHash(req) ?? undefined });

  const { passwordHash: _ph, twoFactorSecret: _tfa, ...safe } = user as any;
  return res.json({ user: safe, ...tokens });
});
