import { Router } from "express";
import { db } from "@workspace/db";
import { groupsTable, groupMembersTable, postsTable } from "@workspace/db/schema";
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
  if (viewerId) {
    const membership = await db.select().from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, group.id), eq(groupMembersTable.userId, viewerId)));
    isMember = membership.length > 0;
  }

  return {
    ...group,
    membersCount: membersResult?.count ?? 0,
    postsCount: postsResult?.count ?? 0,
    isMember,
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

  const { name, description, category, avatarUrl, coverUrl } = req.body;
  if (!name || !category) return res.status(400).json({ error: "Name and category are required" });

  const [group] = await db.insert(groupsTable).values({
    name,
    description: description || null,
    category,
    avatarUrl: avatarUrl || null,
    coverUrl: coverUrl || null,
    creatorId: viewerId,
  }).returning();

  await db.insert(groupMembersTable).values({ groupId: group.id, userId: viewerId });

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

  const existing = await db.select().from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.userId, viewerId)));

  let isMember: boolean;
  if (existing.length > 0) {
    await db.delete(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.userId, viewerId)));
    isMember = false;
  } else {
    await db.insert(groupMembersTable).values({ groupId: id, userId: viewerId });
    isMember = true;
  }

  const [membersResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(groupMembersTable).where(eq(groupMembersTable.groupId, id));

  return res.json({ isMember, membersCount: membersResult?.count ?? 0 });
});

router.get("/:id/posts", async (req, res) => {
  const viewerId = getViewerId(req);
  const id = parseInt(req.params.id);
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;

  const posts = await db.select().from(postsTable)
    .where(and(eq(postsTable.groupId, id), eq(postsTable.isPublished, true)))
    .orderBy(desc(postsTable.createdAt))
    .limit(limit).offset((page - 1) * limit);

  const enriched = await Promise.all(posts.map(p => enrichPost(p, viewerId)));
  return res.json({ posts: enriched, total: enriched.length, page, limit });
});

export default router;
