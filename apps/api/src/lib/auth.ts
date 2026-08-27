import { createHash, createHmac, randomBytes, timingSafeEqual, scryptSync } from "crypto";
import { db } from "@workspace/db";
import { sessionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;
const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
  return `scrypt:${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

/** Returns true if the stored hash should be upgraded to scrypt. */
export function isLegacyPasswordHash(storedHash: string): boolean {
  return !storedHash.startsWith("scrypt:");
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (storedHash.startsWith("scrypt:")) {
      const parts = storedHash.slice("scrypt:".length).split(":");
      if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
      const salt = Buffer.from(parts[0], "hex");
      const expected = Buffer.from(parts[1], "hex");
      const actual = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
      return timingSafeEqual(actual, expected);
    }
    // Legacy SHA-256 fallback — after verifying, caller should upgrade hash
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const testHash = createHash("sha256").update(password + salt).digest("hex");
    const testBuf = Buffer.from(testHash, "hex");
    const hashBuf = Buffer.from(hash, "hex");
    if (testBuf.length !== hashBuf.length) return false;
    return timingSafeEqual(testBuf, hashBuf);
  } catch {
    return false;
  }
}

// ─── In-memory blacklist fallback (used when Redis is unavailable) ────────────
// Keyed by jti-hash → expiry timestamp (ms). Cleaned up lazily.
const memBlacklist = new Map<string, number>();

function memBlacklistSet(key: string, ttlSeconds: number): void {
  memBlacklist.set(key, Date.now() + ttlSeconds * 1000);
  // Lazy GC: evict expired entries occasionally
  if (memBlacklist.size > 500) {
    const now = Date.now();
    for (const [k, exp] of memBlacklist) {
      if (now > exp) memBlacklist.delete(k);
    }
  }
}

function memBlacklistHas(key: string): boolean {
  const exp = memBlacklist.get(key);
  if (!exp) return false;
  if (Date.now() > exp) { memBlacklist.delete(key); return false; }
  return true;
}

type TokenType = "access" | "refresh";

type TokenPayload = {
  sub: number;
  typ: TokenType;
  iat: number;
  exp: number;
  jti: string;
};

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set to at least 32 characters in production.");
  }
  return "quillhive-development-jwt-secret-change-before-production";
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function sign(header: string, payload: string): string {
  return createHmac("sha256", getJwtSecret()).update(`${header}.${payload}`).digest("base64url");
}

function hashJti(jti: string): string {
  return createHash("sha256").update(jti).digest("hex");
}

function createJwt(userId: number, type: TokenType, ttlSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify({
    sub: userId,
    typ: type,
    iat: now,
    exp: now + ttlSeconds,
    jti: randomBytes(16).toString("hex"),
  } satisfies TokenPayload));
  return `${header}.${payload}.${sign(header, payload)}`;
}

function verifyJwtSync(token: string, expectedType: TokenType): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expectedSignature = sign(header, payload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as TokenPayload;
    if (decoded.typ !== expectedType) return null;
    if (!Number.isInteger(decoded.sub) || decoded.sub <= 0) return null;
    if (!Number.isInteger(decoded.exp) || decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function createSession(userId: number): string {
  return createJwt(userId, "access", ACCESS_TOKEN_TTL_SECONDS);
}

export async function createAuthTokens(userId: number, meta?: { userAgent?: string; ipHash?: string }) {
  const accessToken = createJwt(userId, "access", ACCESS_TOKEN_TTL_SECONDS);
  const refreshToken = createJwt(userId, "refresh", REFRESH_TOKEN_TTL_SECONDS);

  const refreshPayload = verifyJwtSync(refreshToken, "refresh");
  if (refreshPayload) {
    const tokenHash = hashJti(refreshPayload.jti);
    const expiresAt = new Date(refreshPayload.exp * 1000);
    await db.insert(sessionsTable).values({
      userId,
      tokenHash,
      userAgent: meta?.userAgent ?? null,
      ipHash: meta?.ipHash ?? null,
      expiresAt,
    }).onConflictDoNothing();
  }

  return {
    token: accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    refreshExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
  };
}

export async function refreshSession(refreshToken: string, meta?: { userAgent?: string; ipHash?: string }) {
  const payload = verifyJwtSync(refreshToken, "refresh");
  if (!payload) return null;

  const tokenHash = hashJti(payload.jti);
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.tokenHash, tokenHash));
  if (!session) return null;

  await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, tokenHash));

  return createAuthTokens(payload.sub, meta);
}

export async function destroySession(token: string): Promise<void> {
  const refreshPayload = verifyJwtSync(token, "refresh");
  if (refreshPayload) {
    const tokenHash = hashJti(refreshPayload.jti);
    await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, tokenHash));
  }
}

export function getSessionUserId(token: string): number | null {
  return verifyJwtSync(token, "access")?.sub ?? null;
}

export async function blacklistToken(token: string): Promise<void> {
  const payload = verifyJwtSync(token, "access");
  if (!payload) return;
  const ttl = payload.exp - Math.floor(Date.now() / 1000);
  if (ttl <= 0) return;

  const key = `bl:${hashJti(payload.jti)}`;
  // Always write to in-memory fallback first (works even without Redis)
  memBlacklistSet(key, ttl);

  const redis = (await import("./redis")).getRedis();
  if (redis) {
    try {
      await redis.set(key, "1", { ex: ttl });
    } catch { /* in-memory fallback already active */ }
  }
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const payload = verifyJwtSync(token, "access");
  if (!payload) return false;

  const key = `bl:${hashJti(payload.jti)}`;
  // Check in-memory first (covers Redis-down scenarios)
  if (memBlacklistHas(key)) return true;

  const redis = (await import("./redis")).getRedis();
  if (!redis) return false;
  try {
    const val = await redis.get(key);
    if (val === "1") {
      // Sync back to memory so future checks skip Redis
      const remaining = payload.exp - Math.floor(Date.now() / 1000);
      if (remaining > 0) memBlacklistSet(key, remaining);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
