import { type Request, type Response, type NextFunction } from "express";
import { getRedis } from "./redis";
import { logger } from "./logger";

/**
 * Express middleware that caches JSON responses in Upstash Redis.
 * If cache hit → serve from cache; if miss → run handler then cache result.
 *
 * @param ttlSeconds  How long to keep the cached response (default 60s)
 * @param keyFn       Optional custom cache key function (default: req.originalUrl)
 */
export function cacheResponse(
  ttlSeconds = 60,
  keyFn?: (req: Request) => string,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const redis = getRedis();
    if (!redis) { next(); return; }

    const key = `api_cache:${keyFn ? keyFn(req) : req.originalUrl}`;

    try {
      const cached = await redis.get(key);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("Content-Type", "application/json");
        res.send(cached);
        return;
      }
    } catch (err) {
      logger.warn({ err, key }, "cache_get_failed");
    }

    // Intercept the response to cache it
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      const result = originalJson(body);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        redis.setex(key, ttlSeconds, JSON.stringify(body)).catch((err: unknown) =>
          logger.warn({ err, key }, "cache_set_failed"),
        );
      }
      return result;
    };

    res.setHeader("X-Cache", "MISS");
    next();
  };
}

/**
 * Invalidate one or more cache keys.
 */
export async function invalidateCache(...keys: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys.map((k) => `api_cache:${k}`));
  } catch (err) {
    logger.warn({ err, keys }, "cache_invalidate_failed");
  }
}

/**
 * Invalidate all cache keys matching a prefix pattern.
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const keys = await redis.keys(`api_cache:${pattern}*`);
    if (keys.length > 0) await redis.del(...keys);
  } catch (err) {
    logger.warn({ err, pattern }, "cache_invalidate_pattern_failed");
  }
}
