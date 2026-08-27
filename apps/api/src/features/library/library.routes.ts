import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { notify } from "../notifications/notification.service";
import {
  libraryEntriesTable,
  librarySavesTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, and, desc, ilike, sql, or, count } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../../middleware/admin";
import { sanitizeRichText } from "../../lib/sanitize";
import { logger } from "../../lib/logger";

interface AuthedReq extends Request {
  currentUser: { id: number; role: string };
}

export const libraryRouter = Router();

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

async function uniqueSlug(base: string, authorUsername: string): Promise<string> {
  const year = new Date().getFullYear();
  const candidate = `${slugify(base)}-${slugify(authorUsername)}-${year}`;
  let suffix = 0;
  while (true) {
    const slug = suffix === 0 ? candidate : `${candidate}-${suffix}`;
    const exists = await db
      .select({ id: libraryEntriesTable.id })
      .from(libraryEntriesTable)
      .where(eq(libraryEntriesTable.slug, slug))
      .limit(1);
    if (exists.length === 0) return slug;
    suffix++;
  }
}

const createSchema = z.object({
  title: z.string().min(3).max(200),
  summary: z.string().min(10).max(400),
  body: z.string().max(200_000).optional(),
  category: z.enum([
    "writing_literature",
    "science_research",
    "technology_code",
    "business_strategy",
    "art_design",
    "music_audio",
    "film_motion",
    "philosophy_ideas",
    "history_culture",
    "education_learning",
    "health_wellbeing",
    "environment_nature",
    "law_society",
    "language_communication",
    "open_reference",
  ]),
  contentType: z
    .enum(["article", "audio", "video", "document", "collection", "reference"])
    .default("article"),
  tags: z.array(z.string().max(50)).max(10).default([]),
  mediaUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  externalUrl: z.string().url().optional(),
  license: z
    .enum(["cc_by", "cc_by_sa", "cc_by_nc", "cc0", "all_rights_reserved"])
    .default("cc_by"),
  isPublic: z.boolean().default(true),
});

const schemaTypeMap: Record<string, string> = {
  article: "Article",
  audio: "AudioObject",
  video: "VideoObject",
  document: "DigitalDocument",
  collection: "CreativeWork",
  reference: "CreativeWork",
};

// ── CREATE entry ──────────────────────────────────────────────────────────────
libraryRouter.post("/", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthedReq).currentUser.id;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const [author] = await db
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!author) return res.status(404).json({ error: "User not found" });

  const slug = await uniqueSlug(parsed.data.title, author.username);

  const [entry] = await db
    .insert(libraryEntriesTable)
    .values({
      authorId: userId,
      slug,
      title: parsed.data.title,
      summary: parsed.data.summary,
      body: parsed.data.body ? sanitizeRichText(parsed.data.body) : null,
      category: parsed.data.category,
      contentType: parsed.data.contentType,
      tags: parsed.data.tags,
      mediaUrl: parsed.data.mediaUrl ?? null,
      thumbnailUrl: parsed.data.thumbnailUrl ?? null,
      externalUrl: parsed.data.externalUrl ?? null,
      license: parsed.data.license,
      isPublic: parsed.data.isPublic,
      schemaType: schemaTypeMap[parsed.data.contentType] ?? "Article",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  logger.info({ entryId: entry.id, slug }, "Library entry created");
  return res.status(201).json({ entry });
});

// ── LIST entries (public) ─────────────────────────────────────────────────────
libraryRouter.get("/", async (req: Request, res: Response) => {
  const {
    category,
    contentType,
    q,
    page = "1",
    limit = "20",
    featured,
  } = req.query as Record<string, string | undefined>;

  const pageNum = Math.max(1, parseInt(page ?? "1"));
  const limitNum = Math.min(50, parseInt(limit ?? "20"));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [
    eq(libraryEntriesTable.isPublic, true),
    eq(libraryEntriesTable.isApproved, true),
  ];
  if (category) conditions.push(eq(libraryEntriesTable.category, category));
  if (contentType) conditions.push(eq(libraryEntriesTable.contentType, contentType));
  if (featured === "true") conditions.push(eq(libraryEntriesTable.isFeatured, true));
  if (q) {
    conditions.push(
      or(
        ilike(libraryEntriesTable.title, `%${q}%`),
        ilike(libraryEntriesTable.summary, `%${q}%`),
      )!,
    );
  }

  const entries = await db
    .select({
      id: libraryEntriesTable.id,
      slug: libraryEntriesTable.slug,
      title: libraryEntriesTable.title,
      summary: libraryEntriesTable.summary,
      category: libraryEntriesTable.category,
      contentType: libraryEntriesTable.contentType,
      thumbnailUrl: libraryEntriesTable.thumbnailUrl,
      tags: libraryEntriesTable.tags,
      license: libraryEntriesTable.license,
      viewCount: libraryEntriesTable.viewCount,
      saveCount: libraryEntriesTable.saveCount,
      isFeatured: libraryEntriesTable.isFeatured,
      publishedAt: libraryEntriesTable.publishedAt,
      authorId: libraryEntriesTable.authorId,
      authorUsername: usersTable.username,
      authorDisplayName: usersTable.displayName,
      authorAvatarUrl: usersTable.avatarUrl,
    })
    .from(libraryEntriesTable)
    .innerJoin(usersTable, eq(usersTable.id, libraryEntriesTable.authorId))
    .where(and(...conditions))
    .orderBy(
      desc(libraryEntriesTable.isFeatured),
      desc(libraryEntriesTable.publishedAt),
    )
    .limit(limitNum)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(libraryEntriesTable)
    .where(and(...conditions));

  return res.json({ entries, total, page: pageNum, limit: limitNum });
});

// ── MY SAVES (must be before /:slug to avoid route collision) ─────────────────
libraryRouter.get("/my/saved", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthedReq).currentUser.id;
  const saves = await db
    .select({
      entryId: librarySavesTable.entryId,
      savedAt: librarySavesTable.savedAt,
      slug: libraryEntriesTable.slug,
      title: libraryEntriesTable.title,
      summary: libraryEntriesTable.summary,
      thumbnailUrl: libraryEntriesTable.thumbnailUrl,
      category: libraryEntriesTable.category,
      contentType: libraryEntriesTable.contentType,
    })
    .from(librarySavesTable)
    .innerJoin(
      libraryEntriesTable,
      eq(libraryEntriesTable.id, librarySavesTable.entryId),
    )
    .where(eq(librarySavesTable.userId, userId))
    .orderBy(desc(librarySavesTable.savedAt));
  return res.json({ saves });
});

// ── MY CONTRIBUTIONS ──────────────────────────────────────────────────────────
libraryRouter.get("/my/entries", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthedReq).currentUser.id;
  const entries = await db
    .select()
    .from(libraryEntriesTable)
    .where(eq(libraryEntriesTable.authorId, userId))
    .orderBy(desc(libraryEntriesTable.createdAt));
  return res.json({ entries });
});

// ── GET single entry by slug ──────────────────────────────────────────────────
libraryRouter.get("/:slug", async (req: Request, res: Response) => {
  const slug = req.params.slug as string;

  const [entry] = await db
    .select({
      id: libraryEntriesTable.id,
      slug: libraryEntriesTable.slug,
      title: libraryEntriesTable.title,
      summary: libraryEntriesTable.summary,
      body: libraryEntriesTable.body,
      category: libraryEntriesTable.category,
      contentType: libraryEntriesTable.contentType,
      tags: libraryEntriesTable.tags,
      mediaUrl: libraryEntriesTable.mediaUrl,
      thumbnailUrl: libraryEntriesTable.thumbnailUrl,
      externalUrl: libraryEntriesTable.externalUrl,
      license: libraryEntriesTable.license,
      schemaType: libraryEntriesTable.schemaType,
      viewCount: libraryEntriesTable.viewCount,
      saveCount: libraryEntriesTable.saveCount,
      downloadCount: libraryEntriesTable.downloadCount,
      isFeatured: libraryEntriesTable.isFeatured,
      isPublic: libraryEntriesTable.isPublic,
      publishedAt: libraryEntriesTable.publishedAt,
      updatedAt: libraryEntriesTable.updatedAt,
      authorId: libraryEntriesTable.authorId,
      authorUsername: usersTable.username,
      authorDisplayName: usersTable.displayName,
      authorAvatarUrl: usersTable.avatarUrl,
      authorHeadline: usersTable.headline,
      authorBio: usersTable.bio,
    })
    .from(libraryEntriesTable)
    .innerJoin(usersTable, eq(usersTable.id, libraryEntriesTable.authorId))
    .where(
      and(
        eq(libraryEntriesTable.slug, slug),
        eq(libraryEntriesTable.isApproved, true),
      ),
    )
    .limit(1);

  if (!entry) return res.status(404).json({ error: "Entry not found" });

  db.update(libraryEntriesTable)
    .set({ viewCount: sql`${libraryEntriesTable.viewCount} + 1` })
    .where(eq(libraryEntriesTable.id, entry.id))
    .catch(() => {});

  return res.json({ entry });
});

// ── SAVE / UNSAVE entry ───────────────────────────────────────────────────────
libraryRouter.post("/:id/save", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthedReq).currentUser.id;
  const entryId = parseInt(req.params.id);
  if (isNaN(entryId)) return res.status(400).json({ error: "Invalid id" });

  const existing = await db
    .select()
    .from(librarySavesTable)
    .where(
      and(
        eq(librarySavesTable.userId, userId),
        eq(librarySavesTable.entryId, entryId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(librarySavesTable)
      .where(
        and(
          eq(librarySavesTable.userId, userId),
          eq(librarySavesTable.entryId, entryId),
        ),
      );
    await db
      .update(libraryEntriesTable)
      .set({ saveCount: sql`${libraryEntriesTable.saveCount} - 1` })
      .where(eq(libraryEntriesTable.id, entryId));
    return res.json({ saved: false });
  }

  await db.insert(librarySavesTable).values({ userId, entryId });
  await db
    .update(libraryEntriesTable)
    .set({ saveCount: sql`${libraryEntriesTable.saveCount} + 1` })
    .where(eq(libraryEntriesTable.id, entryId));

  // Notify entry author (skip self-saves)
  const [entry] = await db
    .select({ authorId: libraryEntriesTable.authorId, title: libraryEntriesTable.title, slug: libraryEntriesTable.slug })
    .from(libraryEntriesTable)
    .where(eq(libraryEntriesTable.id, entryId))
    .limit(1);
  if (entry && entry.authorId !== userId) {
    await notify({
      userId: entry.authorId,
      actorId: userId,
      type: "library_save",
      message: `Your Library entry "${entry.title}" was saved.`,
      title: "Library entry saved",
      url: `/library/${entry.slug}`,
    }).catch(() => undefined);
  }

  return res.json({ saved: true });
});

// ── DELETE own entry ──────────────────────────────────────────────────────────
libraryRouter.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthedReq).currentUser.id;
  const entryId = parseInt(req.params.id);
  const [entry] = await db
    .select({ authorId: libraryEntriesTable.authorId })
    .from(libraryEntriesTable)
    .where(eq(libraryEntriesTable.id, entryId))
    .limit(1);
  if (!entry) return res.status(404).json({ error: "Not found" });
  if (entry.authorId !== userId) {
    return res.status(403).json({ error: "Not your entry" });
  }
  await db
    .delete(libraryEntriesTable)
    .where(eq(libraryEntriesTable.id, entryId));
  return res.json({ deleted: true });
});

// ── ADMIN: feature / approve ──────────────────────────────────────────────────
libraryRouter.patch("/:id/admin", requireAuth, async (req: Request, res: Response) => {
  const role = (req as AuthedReq).currentUser.role;
  if (!["admin", "super_admin"].includes(role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const entryId = parseInt(req.params.id);
  const { isFeatured, isApproved } = req.body as {
    isFeatured?: boolean;
    isApproved?: boolean;
  };
  await db
    .update(libraryEntriesTable)
    .set({
      ...(isFeatured !== undefined ? { isFeatured } : {}),
      ...(isApproved !== undefined ? { isApproved } : {}),
    })
    .where(eq(libraryEntriesTable.id, entryId));
  return res.json({ ok: true });
});
