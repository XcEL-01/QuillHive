import { createHash, randomBytes } from "crypto";
import type { Request } from "express";
import { db } from "@workspace/db";
import { blockedEmailAttemptsTable, emailVerificationTokensTable, usersTable } from "@workspace/db/schema";
import { and, eq, isNull } from "drizzle-orm";

const disposableDomains = new Set([
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "yopmail.com",
  "trashmail.com",
  "dispostable.com",
  "fakeinbox.com",
  "throwawaymail.com",
  "getnada.com",
  "sharklasers.com",
]);

const roleBasedLocalParts = new Set([
  "admin",
  "administrator",
  "support",
  "test",
  "testing",
  "info",
  "contact",
  "sales",
  "security",
  "billing",
  "abuse",
  "noreply",
  "no-reply",
  "postmaster",
  "webmaster",
]);

const checkCache = new Map<string, { result: EmailCheckResult; expiresAt: number }>();

export type EmailCheckResult = {
  email: string;
  domain: string;
  valid: boolean;
  allowed: boolean;
  reason?: string;
  reputationScore: number;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getIpHash(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip || req.socket.remoteAddress || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

function whitelistAllows(domain: string): boolean {
  const whitelist = process.env.EMAIL_DOMAIN_WHITELIST?.split(",").map(item => item.trim().toLowerCase()).filter(Boolean) ?? [];
  return whitelist.length > 0 && whitelist.includes(domain);
}

export function checkEmail(emailInput: string): EmailCheckResult {
  const email = normalizeEmail(emailInput);
  const cached = checkCache.get(email);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  const syntaxValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const [localPart = "", domain = ""] = email.split("@");
  let reputationScore = 100;
  let allowed = syntaxValid;
  let reason: string | undefined;
  if (!syntaxValid) {
    allowed = false;
    reason = "Invalid email format.";
    reputationScore = 0;
  } else if (!whitelistAllows(domain)) {
    if (disposableDomains.has(domain)) {
      allowed = false;
      reason = "Temporary email addresses are not allowed.";
      reputationScore = 10;
    } else if (roleBasedLocalParts.has(localPart)) {
      allowed = false;
      reason = "Role-based emails are not allowed for personal accounts.";
      reputationScore = 35;
    } else {
      if (domain.split(".").length > 3) reputationScore -= 15;
      if (domain.includes("mail") && localPart.length < 4) reputationScore -= 10;
      if (/\d{5,}/.test(localPart)) reputationScore -= 10;
      allowed = reputationScore >= 50;
      if (!allowed) reason = "Email domain reputation is too low.";
    }
  }
  const result = { email, domain, valid: syntaxValid, allowed, reason, reputationScore };
  checkCache.set(email, { result, expiresAt: Date.now() + 60 * 60_000 });
  return result;
}

export async function logBlockedEmailAttempt(email: string, result: EmailCheckResult, req: Request) {
  await db.insert(blockedEmailAttemptsTable).values({
    email: result.email || normalizeEmail(email),
    domain: result.domain || "unknown",
    reason: result.reason || "Blocked email",
    reputationScore: result.reputationScore,
    ipHash: getIpHash(req),
  });
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createEmailVerification(userId: number) {
  const token = randomBytes(32).toString("hex");
  await db.insert(emailVerificationTokensTable).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
  });
  return token;
}

export async function verifyEmailToken(token: string) {
  const [row] = await db
    .select()
    .from(emailVerificationTokensTable)
    .where(and(eq(emailVerificationTokensTable.tokenHash, hashToken(token)), isNull(emailVerificationTokensTable.usedAt)));
  if (!row || row.expiresAt < new Date()) return null;
  await db.update(emailVerificationTokensTable).set({ usedAt: new Date() }).where(eq(emailVerificationTokensTable.id, row.id));
  const [user] = await db
    .update(usersTable)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(usersTable.id, row.userId))
    .returning();
  return user;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

/**
 * Best-effort email send.
 * Priority: RESEND_API_KEY → SMTP (nodemailer) → console (dev only) → throw
 */
export async function sendEmail(opts: SendEmailOptions): Promise<{ ok: true; provider: string }> {
  const from = opts.from || process.env.MAIL_FROM || `no-reply@${process.env.MAIL_DOMAIN || "quillhive.app"}`;
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text }),
    });
    if (!r.ok) throw new Error(`resend_send_failed_${r.status}`);
    return { ok: true, provider: "resend" };
  }
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpHost && smtpUser && smtpPass) {
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transporter.sendMail({
      from: `"QuillHive" <${smtpUser}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return { ok: true, provider: "smtp" };
  }
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`[mail:dev] to=${opts.to} subject=${opts.subject}\n${opts.text || opts.html || ""}\n`);
    return { ok: true, provider: "console" };
  }
  throw new Error("No email provider configured (set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS)");
}