import express, { type Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { appreciations, usersTable, postsTable } from "@workspace/db/schema";
import { getViewerId } from "../lib/auth-types";
import { notify } from "../features/notifications/notification.service";

const router: Router = express.Router();

const APPRECIATION_TYPES = new Set([
  "inspiring",
  "beautiful",
  "insightful",
  "brave",
  "masterpiece",
  "helpful",
  "energizing",
  "heartfelt",
]);

router.post("/posts/:id/appreciate", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { type } = req.body ?? {};
    const userId = getViewerId(req);

    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({ error: "Invalid post id" });
    }
    if (typeof type !== "string" || !APPRECIATION_TYPES.has(type)) {
      return res.status(400).json({ error: "Invalid appreciation type" });
    }

    const [existing] = await db
      .select()
      .from(appreciations)
      .where(and(eq(appreciations.postId, postId), eq(appreciations.userId, userId)));

    if (existing) {
      if (existing.type === type) {
        await db.delete(appreciations).where(eq(appreciations.id, existing.id));
        return res.json({ success: true, action: "removed" });
      }
      await db
        .update(appreciations)
        .set({ type, updatedAt: new Date() })
        .where(eq(appreciations.id, existing.id));
      return res.json({ success: true, action: "updated", type });
    }

    await db.insert(appreciations).values({ postId, userId, type });
    const [post] = await db.select({ authorId: postsTable.authorId }).from(postsTable).where(eq(postsTable.id, postId));
    if (post) {
      await notify({
        userId: post.authorId,
        actorId: userId,
        type: "appreciation",
        message: `appreciated your post (${type})`,
        postId,
        digestGroup: `appreciation:${postId}`,
      });
    }
    return res.json({ success: true, action: "added", type });
  } catch (err) {
    req.log?.error({ err }, "appreciation_failed");
    return res.status(500).json({ error: "Failed to process appreciation" });
  }
});

router.get("/posts/:id/appreciations", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({ error: "Invalid post id" });
    }

    const rows = await db
      .select({
        type: appreciations.type,
        userId: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
      })
      .from(appreciations)
      .leftJoin(usersTable, eq(usersTable.id, appreciations.userId))
      .where(eq(appreciations.postId, postId));

    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.type] = (counts[r.type] || 0) + 1;

    return res.json({
      counts,
      total: rows.length,
      users: rows.map((r: typeof rows[number]) => ({
        id: r.userId,
        username: r.username,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
      })),
    });
  } catch (err) {
    req.log?.error({ err }, "appreciations_fetch_failed");
    return res.status(500).json({ error: "Failed to fetch appreciations" });
  }
});

export default router;
