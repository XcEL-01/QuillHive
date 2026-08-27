import { getRedis } from "./redis";
import { logger } from "./logger";

export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    const raw = await client.get(key);
    if (raw === null || raw === undefined) return null;
    // Upstash REST client may auto-deserialize JSON, returning a plain object.
    // Only call JSON.parse if it's actually a string.
    if (typeof raw === "string") return JSON.parse(raw) as T;
    return raw as T;
  } catch (err) {
    logger.warn({ err, key }, "Cache get failed");
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.warn({ err, key }, "Cache set failed");
  }
}

export async function deleteCache(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.del(key);
  } catch (err) {
    logger.warn({ err, key }, "Cache delete failed");
  }
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (err) {
    logger.warn({ err, pattern }, "Cache pattern delete failed");
  }
}
