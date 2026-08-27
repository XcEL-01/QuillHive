import { Redis } from "@upstash/redis";
import { logger } from "./logger";

export type CompatRedis = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { ex?: number }): Promise<unknown>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
  keys(pattern: string): Promise<string[]>;
};

let client: CompatRedis | null = null;
let initAttempted = false;

function createClient(): CompatRedis | null {
  const url = process.env["UPSTASH_REDIS_REST_URL"];
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"];

  if (!url || !token) return null;

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname) return null;

    const upstash = new Redis({ url, token });
    logger.info("Redis (Upstash REST) client initialised");
    return {
      get: (key) => upstash.get<string>(key),
      set: (key, value, opts) =>
        opts?.ex
          ? upstash.set(key, value, { ex: opts.ex })
          : upstash.set(key, value),
      setex: (key, seconds, value) => upstash.setex(key, seconds, value),
      del: (...keys) => (keys.length > 0 ? upstash.del(...keys) : Promise.resolve(0)),
      keys: (pattern) => upstash.keys(pattern),
    };
  } catch {
    return null;
  }

}

export function getRedis(): CompatRedis | null {
  if (!initAttempted) {
    initAttempted = true;
    client = createClient();
  }
  return client;
}

export { client as redis };
