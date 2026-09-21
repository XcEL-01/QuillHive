import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { readingProgressTable, postsTable, usersTable } from "@workspace/db/schema";
import { and, eq, desc, gte, lt } from "drizzle-orm";
import { getViewerId } from "../../lib/auth-types";

export const readingProgressRouter: Router = Router();

const upsertSchema = z.object({
  percent: z.number().min(0).max(100),
  readTimeMs: z.number().int().min(0).optional(),
});

readingProgressRouter.put("/:postId", async (req, res) => {
  const userId = getViewerId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const postId = Number(req.params.postId);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [post] = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.id, postId));
  if (!post) return res.status(404).json({ error: "Post not found" });

  await db
    .insert(readingProgressTable)
    .values({ userId, postId, percent: parsed.data.percent, readTimeMs: parsed.data.readTimeMs ?? 0 })
    .onConflictDoUpdate({
      target: [readingProgressTable.userId, readingProgressTable.postId],
      set: {
        percent: parsed.data.percent,
        ...(parsed.data.readTimeMs !== undefined ? { readTimeMs: parsed.data.readTimeMs } : {}),
        lastReadAt: new Date(),
      },
    });

  if (parsed.data.percent > 50) {
    (async () => {
      try {
        const { topicsTable } = await import("@workspace/db/schema");
        const { sql: _sql } = await import("drizzle-orm");
        const [post] = await db.select({ tags: postsTable.tags }).from(postsTable).where(eq(postsTable.id, postId));
        if (!post?.tags) return;
        const tags: string[] = (() => { try { return JSON.parse(post.tags); } catch { return []; } })();
        for (const tag of tags.slice(0, 5)) {
          const slug = tag.replace(/^#/, "").toLowerCase().replace(/[^a-z0-9_]/g, "");
          if (slug.length < 2) continue;
          await db.update(topicsTable)
            .set({ postCount: _sql`${topicsTable.postCount} + 1` })
            .where(eq(topicsTable.slug, slug));
        }
      } catch { /* never block reading progress save */ }
    })();
  }

  return res.json({ ok: true });
});

readingProgressRouter.get("/:postId", async (req, res) => {
  const userId = getViewerId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const postId = Number(req.params.postId);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  const [row] = await db
    .select()
    .from(readingProgressTable)
    .where(and(eq(readingProgressTable.userId, userId), eq(readingProgressTable.postId, postId)));

  return res.json(row ?? { percent: 0, lastReadAt: null });
});

readingProgressRouter.get("/", async (req, res) => {
  const userId = getViewerId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const rows = await db
    .select({
      id: readingProgressTable.id,
      postId: readingProgressTable.postId,
      percent: readingProgressTable.percent,
      readTimeMs: readingProgressTable.readTimeMs,
      lastReadAt: readingProgressTable.lastReadAt,
      postIdJoin: postsTable.id,
      postTitle: postsTable.title,
      postExcerpt: postsTable.excerpt,
      postType: postsTable.type,
      postImageUrl: postsTable.imageUrl,
      authorUsername: usersTable.username,
      authorDisplayName: usersTable.displayName,
      authorAvatarUrl: usersTable.avatarUrl,
    })
    .from(readingProgressTable)
    .innerJoin(postsTable, eq(postsTable.id, readingProgressTable.postId))
    .innerJoin(usersTable, eq(usersTable.id, postsTable.authorId))
    .where(
      and(
        eq(readingProgressTable.userId, userId),
        gte(readingProgressTable.percent, 1),
        lt(readingProgressTable.percent, 95),
        eq(postsTable.isPublished, true),
        eq(postsTable.isDeleted, false),
      ),
    )
    .orderBy(desc(readingProgressTable.lastReadAt))
    .limit(6);

  return res.json(
    rows.map((r) => ({
      id: r.id,
      postId: r.postId,
      percent: r.percent,
      readTimeMs: r.readTimeMs,
      lastReadAt: r.lastReadAt,
      post: {
        id: r.postIdJoin,
        title: r.postTitle,
        excerpt: r.postExcerpt,
        type: r.postType,
        imageUrl: r.postImageUrl,
        author: {
          username: r.authorUsername,
          displayName: r.authorDisplayName,
          avatarUrl: r.authorAvatarUrl,
        },
      },
    })),
  );
});
