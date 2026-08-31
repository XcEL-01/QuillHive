import type { RequestHandler } from "express";
import { getRedis } from "../lib/redis";
import { logger } from "../lib/logger";

const isDev = process.env.NODE_ENV !== "production";

// In-memory fallback when Redis is unavailable
const memBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Parameters<RequestHandler>[0]): string {
  // Only trust x-forwarded-for if behind a known proxy (Railway/Render/Fly)
  if (process.env.TRUST_PROXY === "1") {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
      return forwarded.split(",")[0].trim();
    }
  }
  return req.socket.remoteAddress ?? req.ip ?? "unknown";
}

export function rateLimit(
  options: { windowMs?: number; max?: number; prefix?: string } = {}
): RequestHandler {
  const windowMs = options.windowMs ?? 60_000;
  const baseMax = options.max ?? 300;
  // In dev / preview, apply 10× headroom to avoid false positives from HMR,
  // React StrictMode double-renders, and Replit's shared proxy IPs.
  const max = isDev ? baseMax * 10 : baseMax;
  const prefix = options.prefix ?? "rl";

  return async (req, res, next) => {
    // Skip health checks and CORS preflight
    if (
      req.method === "OPTIONS" ||
      req.path === "/api/healthz" ||
      req.path === "/healthz"
    ) {
      return next();
    }

    const ip = getClientIp(req);
    const windowSec = Math.ceil(windowMs / 1000);
    const redis = getRedis();

    if (redis) {
      try {
        const key = `${prefix}:${ip}`;
        const current = await redis.get(key);
        const count = current ? parseInt(current, 10) : 0;

        if (count >= max) {
          res.setHeader("Retry-After", String(windowSec));
          res.setHeader("X-RateLimit-Limit", String(max));
          res.setHeader("X-RateLimit-Remaining", "0");
          return res.status(429).json({
            error: "Too many requests. Please slow down.",
            retryAfter: windowSec,
          });
        }

        // Increment; set expiry only on first request in window
        await redis.set(key, String(count + 1), { ex: windowSec });
        res.setHeader("X-RateLimit-Limit", String(max));
        res.setHeader("X-RateLimit-Remaining", String(max - count - 1));
        return next();
      } catch (err) {
        logger.warn({ err }, "Redis rate-limit error - falling back to memory");
      }
    }

    // ── In-memory fallback ───────────────────────────────────────────────────
    const now = Date.now();
    const key = ip;
    const bucket = memBuckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      memBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
      return res.status(429).json({
        error: "Too many requests. Please slow down.",
        retryAfter,
      });
    }

    bucket.count++;
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(max - bucket.count));
    return next();
  };
}
