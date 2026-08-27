import { Router } from "express";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../../middleware/admin";
import { validateBody } from "../../middleware/validate";
import { rateLimit } from "../../middleware/rateLimit";

export const twofaRouter = Router();

const strictLimit = rateLimit({ windowMs: 60_000, max: 10 });

function generateSecret(): string {
  return randomBytes(20).toString("hex").toUpperCase();
}

function hashOtp(secret: string, counter: number): string {
  const data = Buffer.alloc(8);
  data.writeBigInt64BE(BigInt(counter));
  const hmac = createHash("sha256").update(secret + data.toString("hex")).digest("hex");
  const offset = parseInt(hmac.slice(-1), 16) & 0x0f;
  const code = (parseInt(hmac.slice(offset * 2, offset * 2 + 8), 16) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, "0");
}

function getTimeCounter(): number {
  return Math.floor(Date.now() / 1000 / 30);
}

function verifyTotp(secret: string, token: string): boolean {
  const counter = getTimeCounter();
  for (let i = -1; i <= 1; i++) {
    if (hashOtp(secret, counter + i) === token) return true;
  }
  return false;
}

twofaRouter.post("/setup", requireAuth, strictLimit, async (req: any, res) => {
  const secret = generateSecret();
  await db.update(usersTable).set({ twoFactorSecret: secret }).where(eq(usersTable.id, req.currentUser.id));
  return res.json({
    secret,
    message: "Store this secret in your authenticator app. Call /2fa/enable with a valid token to activate.",
  });
});

twofaRouter.post("/enable", requireAuth, strictLimit, validateBody(z.object({ token: z.string().length(6) })), async (req: any, res) => {
  const [user] = await db.select({ twoFactorSecret: usersTable.twoFactorSecret }).from(usersTable).where(eq(usersTable.id, req.currentUser.id));
  if (!user?.twoFactorSecret) return res.status(400).json({ error: "Run /2fa/setup first" });
  if (!verifyTotp(user.twoFactorSecret, req.body.token)) return res.status(400).json({ error: "Invalid token" });
  await db.update(usersTable).set({ twoFactorEnabled: true, updatedAt: new Date() }).where(eq(usersTable.id, req.currentUser.id));
  return res.json({ ok: true, message: "Two-factor authentication enabled" });
});

twofaRouter.post("/disable", requireAuth, strictLimit, validateBody(z.object({ token: z.string().length(6) })), async (req: any, res) => {
  const [user] = await db.select({ twoFactorSecret: usersTable.twoFactorSecret, twoFactorEnabled: usersTable.twoFactorEnabled }).from(usersTable).where(eq(usersTable.id, req.currentUser.id));
  if (!user?.twoFactorEnabled) return res.status(400).json({ error: "2FA is not enabled" });
  if (!verifyTotp(user.twoFactorSecret!, req.body.token)) return res.status(400).json({ error: "Invalid token" });
  await db.update(usersTable).set({ twoFactorEnabled: false, twoFactorSecret: null, updatedAt: new Date() }).where(eq(usersTable.id, req.currentUser.id));
  return res.json({ ok: true, message: "Two-factor authentication disabled" });
});

twofaRouter.post("/verify", requireAuth, strictLimit, validateBody(z.object({ token: z.string().length(6) })), async (req: any, res) => {
  const [user] = await db.select({ twoFactorSecret: usersTable.twoFactorSecret, twoFactorEnabled: usersTable.twoFactorEnabled }).from(usersTable).where(eq(usersTable.id, req.currentUser.id));
  if (!user?.twoFactorEnabled) return res.status(400).json({ error: "2FA not enabled" });
  const valid = verifyTotp(user.twoFactorSecret!, req.body.token);
  return res.json({ valid });
});

twofaRouter.get("/status", requireAuth, async (req: any, res) => {
  const [user] = await db.select({ twoFactorEnabled: usersTable.twoFactorEnabled }).from(usersTable).where(eq(usersTable.id, req.currentUser.id));
  return res.json({ enabled: user?.twoFactorEnabled ?? false });
});
