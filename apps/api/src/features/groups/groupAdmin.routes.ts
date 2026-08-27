import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  groupsTable,
  groupMembersTable,
  groupPinnedPostsTable,
  postsTable,
} from "@workspace/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireAuth } from "../../middleware/admin";
import { enrichPost } from "../profiles/profile.service";

interface AuthedRequest extends Request {
  currentUser: { id: number };
}

export const groupAdminRouter = Router();

type GroupRole = "member" | "moderator" | "admin";
const ALLOWED_ROLES: GroupRole[] = ["member", "moderator", "admin"];

async function getActorRole(groupId: number, userId: number): Promise<GroupRole | null> {
  const [group] = await db.select({ creatorId: groupsTable.creatorId }).from(groupsTable).where(eq(groupsTable.id, groupId));
  if (group?.creatorId === userId) return "admin";
  const [member] = await db
    .select({ role: groupMembersTable.role })
    .from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)));
  if (!member) return null;
  return (member.role as GroupRole) ?? "member";
}

function canModerate(role: GroupRole | null): boolean {
  return role === "admin" || role === "moderator";
}

groupAdminRouter.get("/:id/pinned", async (req, res: Response) => {
  const groupId = Number(req.params.id);
  if (!Number.isFinite(groupId)) return res.status(400).json({ error: "Invalid id" });
  const auth = req.headers.authorization;
  let viewerId: number | null = null;
  if (auth?.startsWith("Bearer ")) {
    const { getSessionUserId } = await import("../../lib/auth");
    viewerId = getSessionUserId(auth.slice(7));
  }
  const pinned = await db
    .select({ post: postsTable, pinnedAt: groupPinnedPostsTable.pinnedAt })
    .from(groupPinnedPostsTable)
    .innerJoin(postsTable, eq(postsTable.id, groupPinnedPostsTable.postId))
    .where(eq(groupPinnedPostsTable.groupId, groupId))
    .orderBy(desc(groupPinnedPostsTable.pinnedAt))
    .limit(10);
  const enriched = await Promise.all(pinned.map((row) => enrichPost(row.post, viewerId)));
  return res.json({ pinned: enriched });
});

groupAdminRouter.post("/:id/posts/:postId/pin", requireAuth, async (req, res: Response) => {
  const userId = (req as AuthedRequest).currentUser.id;
  const groupId = Number(req.params.id);
  const postId = Number(req.params.postId);
  if (!Number.isFinite(groupId) || !Number.isFinite(postId)) return res.status(400).json({ error: "Invalid id" });
  const role = await getActorRole(groupId, userId);
  if (!canModerate(role)) return res.status(403).json({ error: "Forbidden" });
  const [post] = await db.select({ id: postsTable.id }).from(postsTable).where(and(eq(postsTable.id, postId), eq(postsTable.groupId, groupId)));
  if (!post) return res.status(404).json({ error: "Post not in this group" });
  await db
    .insert(groupPinnedPostsTable)
    .values({ groupId, postId, pinnedBy: userId })
    .onConflictDoNothing();
  return res.json({ ok: true });
});

groupAdminRouter.delete("/:id/posts/:postId/pin", requireAuth, async (req, res: Response) => {
  const userId = (req as AuthedRequest).currentUser.id;
  const groupId = Number(req.params.id);
  const postId = Number(req.params.postId);
  if (!Number.isFinite(groupId) || !Number.isFinite(postId)) return res.status(400).json({ error: "Invalid id" });
  const role = await getActorRole(groupId, userId);
  if (!canModerate(role)) return res.status(403).json({ error: "Forbidden" });
  await db
    .delete(groupPinnedPostsTable)
    .where(and(eq(groupPinnedPostsTable.groupId, groupId), eq(groupPinnedPostsTable.postId, postId)));
  return res.json({ ok: true });
});

groupAdminRouter.get("/:id/members", async (req, res: Response) => {
  const groupId = Number(req.params.id);
  if (!Number.isFinite(groupId)) return res.status(400).json({ error: "Invalid id" });
  const members = await db
    .select({
      id: groupMembersTable.id,
      userId: groupMembersTable.userId,
      role: groupMembersTable.role,
      joinedAt: groupMembersTable.joinedAt,
    })
    .from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, groupId))
    .orderBy(desc(groupMembersTable.joinedAt))
    .limit(200);
  return res.json({ members });
});

groupAdminRouter.patch("/:id/members/:userId", requireAuth, async (req, res: Response) => {
  const actorId = (req as AuthedRequest).currentUser.id;
  const groupId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  if (!Number.isFinite(groupId) || !Number.isFinite(targetUserId)) return res.status(400).json({ error: "Invalid id" });
  const role = req.body?.role as string | undefined;
  if (!role || !ALLOWED_ROLES.includes(role as GroupRole)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  const actorRole = await getActorRole(groupId, actorId);
  if (actorRole !== "admin") return res.status(403).json({ error: "Only group admins can change roles" });
  const [updated] = await db
    .update(groupMembersTable)
    .set({ role })
    .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, targetUserId)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Member not found" });
  return res.json({ ok: true, member: updated });
});

groupAdminRouter.get("/:id/my-role", requireAuth, async (req, res: Response) => {
  const userId = (req as AuthedRequest).currentUser.id;
  const groupId = Number(req.params.id);
  if (!Number.isFinite(groupId)) return res.status(400).json({ error: "Invalid id" });
  const role = await getActorRole(groupId, userId);
  return res.json({ role });
});

// ensure sql import retained for future use
void sql;
