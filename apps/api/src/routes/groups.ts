import { Router } from "express";
import { db } from "@workspace/db";
import { groupsTable, groupMembersTable, groupJoinRequestsTable, groupBansTable, postsTable } from "@workspace/db/schema";
import { eq, and, sql, ilike, desc, gt, isNull, or } from "drizzle-orm";
import { getSessionUserId } from "../lib/auth";
import { enrichPost } from "../features/profiles/profile.service";

const router = Router();

function getViewerId(req: any): number | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return getSessionUserId(auth.slice(7));
}

async function enrichGroup(group: any, viewerId: number | null) {
  const [membersResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(groupMembersTable).where(eq(groupMembersTable.groupId, group.id));

  const [postsResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(postsTable).where(and(eq(postsTable.groupId, group.id), eq(postsTable.isPublished, true)));

  let isMember = false;
  let memberRole: string | null = null;
  let hasPendingJoinRequest = false;
  if (viewerId) {
    const membership = await db.select({ role: groupMembersTable.role }).from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, group.id), eq(groupMembersTable.userId, viewerId)));
    isMember = membership.length > 0;
    memberRole = membership[0]?.role ?? (group.creatorId === viewerId ? "admin" : null);
    const [request] = await db.select({ id: groupJoinRequestsTable.id }).from(groupJoinRequestsTable)
      .where(and(eq(groupJoinRequestsTable.groupId, group.id), eq(groupJoinRequestsTable.userId, viewerId), eq(groupJoinRequestsTable.status, "pending")));
    hasPendingJoinRequest = Boolean(request);
  }

  return {
    ...group,
    membersCount: membersResult?.count ?? 0,
    postsCount: postsResult?.count ?? 0,
    isMember,
    memberRole,
    hasPendingJoinRequest,
  };
}

router.get("/", async (req, res) => {
  const viewerId = getViewerId(req);
  const search = req.query.search as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;

  let query = db.select().from(groupsTable).$dynamic();
  if (search) {
    query = query.where(ilike(groupsTable.name, `%${search}%`));
  }

  const groups = await query
    .orderBy(
      sql`(case when ${groupsTable.isPromoted} = true and (${groupsTable.promotedUntil} is null or ${groupsTable.promotedUntil} > now()) then 0 else 1 end)`,
      desc(groupsTable.createdAt),
    )
    .limit(limit)
    .offset((page - 1) * limit);
  void or; void isNull; void gt;
  const enriched = await Promise.all(groups.map(g => enrichGroup(g, viewerId)));

  return res.json({ groups: enriched, total: enriched.length, page });
});

router.post("/", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });

  const { name, description, category, avatarUrl, coverUrl, privacy, rules } = req.body;
  if (!name || !category) return res.status(400).json({ error: "Name and category are required" });
  if (privacy && !["open", "private"].includes(privacy)) return res.status(400).json({ error: "Invalid privacy" });

  const [group] = await db.insert(groupsTable).values({
    name,
    description: description || null,
    category,
    avatarUrl: avatarUrl || null,
    coverUrl: coverUrl || null,
    creatorId: viewerId,
    privacy: privacy || "open",
    rules: rules || null,
  }).returning();

  await db.insert(groupMembersTable).values({ groupId: group.id, userId: viewerId, role: "admin" });

  const enriched = await enrichGroup(group, viewerId);
  return res.status(201).json(enriched);
});

router.get("/:id", async (req, res) => {
  const viewerId = getViewerId(req);
  const id = parseInt(req.params.id);

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, id));
  if (!group) return res.status(404).json({ error: "Group not found" });

  const enriched = await enrichGroup(group, viewerId);
  return res.json(enriched);
});

router.post("/:id/join", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });
  const id = parseInt(req.params.id);

  const [group] = await db.select({ privacy: groupsTable.privacy }).from(groupsTable).where(eq(groupsTable.id, id));
  if (!group) return res.status(404).json({ error: "Group not found" });
  const [ban] = await db.select({ id: groupBansTable.id }).from(groupBansTable)
    .where(and(eq(groupBansTable.groupId, id), eq(groupBansTable.userId, viewerId)));
  if (ban) return res.status(403).json({ error: "You are banned from this group" });

  const existing = await db.select().from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.userId, viewerId)));

  let isMember: boolean;
  if (existing.length > 0) {
    await db.delete(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.userId, viewerId)));
    isMember = false;
  } else {
    if (group.privacy === "private") {
      await db.insert(groupJoinRequestsTable).values({ groupId: id, userId: viewerId, status: "pending" })
        .onConflictDoUpdate({ target: [groupJoinRequestsTable.groupId, groupJoinRequestsTable.userId], set: { status: "pending", reviewedBy: null, reviewedAt: null } });
      return res.json({ isMember: false, hasPendingJoinRequest: true });
    }
    await db.insert(groupMembersTable).values({ groupId: id, userId: viewerId, role: "member" });
    isMember = true;
  }

  const [membersResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(groupMembersTable).where(eq(groupMembersTable.groupId, id));

  return res.json({ isMember, hasPendingJoinRequest: false, membersCount: membersResult?.count ?? 0 });
});

router.get("/:id/posts", async (req, res) => {
  const viewerId = getViewerId(req);
  const id = parseInt(req.params.id);
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;

  const [group] = await db.select({ privacy: groupsTable.privacy }).from(groupsTable).where(eq(groupsTable.id, id));
  if (!group) return res.status(404).json({ error: "Group not found" });
  if (group.privacy === "private") {
    if (!viewerId) return res.status(403).json({ error: "Join this private group to view its posts" });
    const [membership] = await db.select({ id: groupMembersTable.id }).from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.userId, viewerId)));
    if (!membership) return res.status(403).json({ error: "Join this private group to view its posts" });
  }

  const posts = await db.select().from(postsTable)
    .where(and(eq(postsTable.groupId, id), eq(postsTable.isPublished, true)))
    .orderBy(desc(postsTable.createdAt))
    .limit(limit).offset((page - 1) * limit);

  const enriched = await Promise.all(posts.map(p => enrichPost(p, viewerId)));
  return res.json({ posts: enriched, total: enriched.length, page, limit });
});

export default router;
