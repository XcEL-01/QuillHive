import { Router, type Response } from "express";
import { db } from "@workspace/db";
import { postsTable, usersTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getViewerId } from "../../lib/auth-types";
import { findSimilarPosts, shingleHashes } from "./originality.service";

export const originalityRouter = Router();

originalityRouter.get("/posts/:id/originality", async (req, res: Response) => {
  const viewerId = getViewerId(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const [post] = await db.select({
    id: postsTable.id, authorId: postsTable.authorId, content: postsTable.content, fingerprint: postsTable.fingerprint,
  }).from(postsTable).where(eq(postsTable.id, id));
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (!viewerId || viewerId !== post.authorId) {
    return res.status(403).json({ error: "Originality results are visible to the author only" });
  }

  const hashes = shingleHashes(post.content || "");
  if (hashes.length === 0) {
    return res.json({ status: "insufficient_text", score: 1, similar: [] });
  }
  const similar = await findSimilarPosts(post.content || "", post.id, 0.6, 10);
  if (similar.length === 0) {
    return res.json({ status: "original", score: 1, similar: [] });
  }
  const ids = similar.map((s) => s.postId);
  const rows = await db.select({
    id: postsTable.id, title: postsTable.title, authorId: postsTable.authorId,
    authorUsername: usersTable.username, authorDisplayName: usersTable.displayName,
  }).from(postsTable).leftJoin(usersTable, eq(postsTable.authorId, usersTable.id)).where(inArray(postsTable.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const top = similar[0]?.similarity ?? 0;
  return res.json({
    status: top >= 0.85 ? "duplicate" : top >= 0.6 ? "near_duplicate" : "original",
    score: Math.max(0, 1 - top),
    similar: similar.map((s) => ({ ...s, post: byId.get(s.postId) ?? null })),
  });
});
