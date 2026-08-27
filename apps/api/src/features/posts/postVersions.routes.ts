import { Router } from "express";
import { db } from "@workspace/db";
import { postVersionsTable, postsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { loadCurrentUser } from "../../lib/auth-types";

export const postVersionsRouter: Router = Router();

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

postVersionsRouter.get("/posts/:id/versions", async (req, res) => {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  const user = await loadCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
  if (!post) return res.status(404).json({ error: "Post not found" });

  const isOwner = post.authorId === user.id;
  const isAdmin = ADMIN_ROLES.has(user.role);
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "Forbidden" });

  const versions = await db
    .select({
      id: postVersionsTable.id,
      editorId: postVersionsTable.editorId,
      title: postVersionsTable.title,
      excerpt: postVersionsTable.excerpt,
      changeReason: postVersionsTable.changeReason,
      createdAt: postVersionsTable.createdAt,
      contentLength: postVersionsTable.content,
    })
    .from(postVersionsTable)
    .where(eq(postVersionsTable.postId, postId))
    .orderBy(desc(postVersionsTable.createdAt))
    .limit(50);

  return res.json(
    versions.map((v) => ({
      id: v.id,
      editorId: v.editorId,
      title: v.title,
      excerpt: v.excerpt,
      changeReason: v.changeReason,
      createdAt: v.createdAt,
      contentLength: v.contentLength?.length ?? 0,
    })),
  );
});

postVersionsRouter.get("/posts/:id/versions/:versionId", async (req, res) => {
  const postId = Number(req.params.id);
  const versionId = Number(req.params.versionId);
  if (!Number.isInteger(postId) || !Number.isInteger(versionId)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const user = await loadCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
  if (!post) return res.status(404).json({ error: "Post not found" });

  const isOwner = post.authorId === user.id;
  const isAdmin = ADMIN_ROLES.has(user.role);
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "Forbidden" });

  const [version] = await db
    .select()
    .from(postVersionsTable)
    .where(eq(postVersionsTable.id, versionId));

  if (!version || version.postId !== postId) {
    return res.status(404).json({ error: "Version not found" });
  }

  return res.json(version);
});
