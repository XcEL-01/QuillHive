import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { validateBody, validateQuery } from "../../middleware/validate";
import { rateLimit } from "../../middleware/rateLimit";
import { getRedis } from "../../lib/redis";
import { logger } from "../../lib/logger";

export const carouselRouter = Router();

const carouselLimit = rateLimit({ windowMs: 60_000, max: 30 });

const UNSPLASH_BASE = "https://api.unsplash.com";
const PEXELS_BASE = "https://api.pexels.com/v1";

/** Per-user, per-topic cursor for Unsplash (page number) */
function unsplashCursorKey(userId: number, topic: string) {
  return `carousel:unsplash:${userId}:${topic.toLowerCase().replace(/\s+/g, "_")}`;
}
/** Per-user, per-topic cursor for Pexels (page number) */
function pexelsCursorKey(userId: number, topic: string) {
  return `carousel:pexels:${userId}:${topic.toLowerCase().replace(/\s+/g, "_")}`;
}

async function getNextPage(
  redis: ReturnType<typeof getRedis>,
  key: string,
  maxPage = 30,
): Promise<number> {
  if (!redis) return Math.floor(Math.random() * maxPage) + 1;
  try {
    const raw = await redis.get(key);
    const current = raw ? parseInt(raw, 10) : 0;
    const next = (current % maxPage) + 1;
    await redis.set(key, String(next), { ex: 60 * 60 * 24 * 7 }); // 7 days
    return next;
  } catch (err) {
    logger.warn({ err }, "redis_cursor_error — falling back to random page");
    return Math.floor(Math.random() * maxPage) + 1;
  }
}

/** Fetch images from Unsplash */
async function fetchUnsplash(
  topic: string,
  page: number,
  perPage: number,
  orientation: string,
): Promise<Array<{ url: string; thumb: string; alt: string; credit: string; creditUrl: string; source: "unsplash" }>> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  try {
    const url = new URL(`${UNSPLASH_BASE}/search/photos`);
    url.searchParams.set("query", topic);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("orientation", orientation);
    url.searchParams.set("content_filter", "high");
    const r = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${key}` },
    });
    if (!r.ok) {
      logger.warn({ status: r.status }, "unsplash_fetch_failed");
      return [];
    }
    const json = (await r.json()) as { results: Array<{
      id: string;
      urls: { regular: string; thumb: string };
      alt_description: string | null;
      user: { name: string; links: { html: string } };
    }> };
    return (json.results || []).map((img) => ({
      url: img.urls.regular,
      thumb: img.urls.thumb,
      alt: img.alt_description || topic,
      credit: img.user.name,
      creditUrl: `${img.user.links.html}?utm_source=quillhive&utm_medium=referral`,
      source: "unsplash" as const,
    }));
  } catch (err) {
    logger.error({ err }, "unsplash_error");
    return [];
  }
}

/** Fetch images from Pexels */
async function fetchPexels(
  topic: string,
  page: number,
  perPage: number,
  orientation: string,
): Promise<Array<{ url: string; thumb: string; alt: string; credit: string; creditUrl: string; source: "pexels" }>> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  try {
    const pxOrientation =
      orientation === "landscape" ? "landscape" : orientation === "portrait" ? "portrait" : "square";
    const url = new URL(`${PEXELS_BASE}/search`);
    url.searchParams.set("query", topic);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("orientation", pxOrientation);
    const r = await fetch(url.toString(), {
      headers: { Authorization: key },
    });
    if (!r.ok) {
      logger.warn({ status: r.status }, "pexels_fetch_failed");
      return [];
    }
    const json = (await r.json()) as { photos: Array<{
      id: number;
      src: { large2x: string; medium: string };
      alt: string;
      photographer: string;
      photographer_url: string;
    }> };
    return (json.photos || []).map((p) => ({
      url: p.src.large2x,
      thumb: p.src.medium,
      alt: p.alt || topic,
      credit: p.photographer,
      creditUrl: p.photographer_url,
      source: "pexels" as const,
    }));
  } catch (err) {
    logger.error({ err }, "pexels_error");
    return [];
  }
}

/** Shuffle array deterministically but uniquely each call */
function shuffleImages<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const generateSchema = z.object({
  topic: z.string().min(1).max(100),
  slideCount: z.coerce.number().min(2).max(20).optional().default(5),
  sources: z.enum(["unsplash", "pexels", "both"]).optional().default("both"),
  orientation: z.enum(["landscape", "portrait", "squarish"]).optional().default("landscape"),
  style: z.enum(["editorial", "vibrant", "minimal", "dark", "nature", "urban"]).optional().default("editorial"),
});

carouselRouter.post(
  "/carousel/generate",
  carouselLimit,
  validateBody(generateSchema),
  async (req: any, res: Response) => {
    try {
      const userId: number = req.currentUser?.id ?? 0;
      const { topic, slideCount, sources, orientation, style } = req.body as z.infer<typeof generateSchema>;

      const redis = getRedis();
      const perSource = Math.ceil((slideCount * 2) / (sources === "both" ? 2 : 1));

      // Advance cursors — guarantees new pages each call
      const [unsplashPage, pexelsPage] = await Promise.all([
        sources !== "pexels"
          ? getNextPage(redis, unsplashCursorKey(userId, topic), 40)
          : Promise.resolve(1),
        sources !== "unsplash"
          ? getNextPage(redis, pexelsCursorKey(userId, topic), 40)
          : Promise.resolve(1),
      ]);

      const [unsplashImgs, pexelsImgs] = await Promise.all([
        sources !== "pexels" ? fetchUnsplash(topic, unsplashPage, perSource, orientation) : Promise.resolve([]),
        sources !== "unsplash" ? fetchPexels(topic, pexelsPage, perSource, orientation) : Promise.resolve([]),
      ]);

      // Interleave sources, shuffle, pick slideCount
      const combined = shuffleImages([...unsplashImgs, ...pexelsImgs]);
      const images = combined.slice(0, slideCount);

      if (images.length === 0) {
        return res.status(503).json({
          error: "No images available. Please configure UNSPLASH_ACCESS_KEY or PEXELS_API_KEY.",
        });
      }

      // Build carousel slides with layout metadata driven by style
      const slides = images.map((img, idx) => ({
        index: idx,
        image: img,
        layout: pickLayout(idx, slideCount, style),
        textPlacement: idx === 0 ? "overlay-center" : idx === slideCount - 1 ? "overlay-center" : "overlay-bottom",
      }));

      return res.json({
        topic,
        style,
        orientation,
        slideCount: slides.length,
        slides,
        generatedAt: new Date().toISOString(),
        seed: `${userId}:${topic}:${unsplashPage}:${pexelsPage}`,
      });
    } catch (err) {
      logger.error({ err }, "carousel_generate_error");
      return res.status(500).json({ error: "Failed to generate carousel. Please try again." });
    }
  },
);

function pickLayout(
  idx: number,
  total: number,
  style: string,
): string {
  if (idx === 0) return "cover";
  if (idx === total - 1) return "cta";
  const layouts = ["full-bleed", "split-left", "split-right", "quote-overlay", "stat-card"];
  const styleMap: Record<string, string[]> = {
    editorial: ["split-left", "split-right", "full-bleed"],
    vibrant: ["full-bleed", "quote-overlay", "stat-card"],
    minimal: ["split-left", "split-right", "quote-overlay"],
    dark: ["full-bleed", "quote-overlay", "stat-card"],
    nature: ["full-bleed", "split-left", "split-right"],
    urban: ["full-bleed", "stat-card", "split-right"],
  };
  const pool = styleMap[style] || layouts;
  return pool[idx % pool.length]!;
}

// GET /api/carousel/topics — curated topic suggestions
const CURATED_TOPICS: Record<string, string[]> = {
  "Creator & Career": [
    "content creator", "freelance work", "personal brand", "remote work",
    "productivity", "morning routine", "growth mindset", "entrepreneurship",
  ],
  "Lifestyle": [
    "travel adventure", "minimalist living", "home decor", "healthy lifestyle",
    "coffee shop", "reading books", "self care", "street style",
  ],
  "Technology": [
    "artificial intelligence", "web development", "startup culture", "futuristic technology",
    "data visualization", "digital transformation", "cyberpunk", "innovation",
  ],
  "Nature & Art": [
    "golden hour", "abstract art", "ocean waves", "forest nature",
    "mountain landscape", "urban photography", "black and white", "macro photography",
  ],
  "Business": [
    "team collaboration", "office workspace", "business meeting", "finance money",
    "marketing strategy", "e-commerce", "leadership", "success motivation",
  ],
};

carouselRouter.get("/carousel/topics", (req: Request, res: Response) => {
  res.json({ categories: CURATED_TOPICS });
});
