import { Router, type Response } from "express";
import { db } from "@workspace/db";
import { postsTable, seriesTable } from "@workspace/db/schema";
import { and, asc, eq } from "drizzle-orm";

export const seriesNavRouter = Router();

seriesNavRouter.get("/posts/:id/series-nav", async (req, res: Response) => {
  const postId = Number(req.params.id);
  if (!Number.isFinite(postId)) return res.status(400).json({ error: "Invalid id" });
  const [post] = await db
    .select({ id: postsTable.id, seriesId: postsTable.seriesId, seriesOrder: postsTable.seriesOrder })
    .from(postsTable)
    .where(eq(postsTable.id, postId));
  if (!post || !post.seriesId) return res.json({ series: null, prev: null, next: null });

  const [series] = await db.select().from(seriesTable).where(eq(seriesTable.id, post.seriesId));

  const items = await db
    .select({
      id: postsTable.id,
      title: postsTable.title,
      seriesOrder: postsTable.seriesOrder,
    })
    .from(postsTable)
    .where(and(eq(postsTable.seriesId, post.seriesId), eq(postsTable.isDeleted, false), eq(postsTable.isPublished, true)))
    .orderBy(asc(postsTable.seriesOrder));

  const idx = items.findIndex((p) => p.id === post.id);
  const prev = idx > 0 ? items[idx - 1] : null;
  const next = idx >= 0 && idx < items.length - 1 ? items[idx + 1] : null;
  return res.json({
    series,
    position: idx + 1,
    total: items.length,
    prev,
    next,
  });
});
