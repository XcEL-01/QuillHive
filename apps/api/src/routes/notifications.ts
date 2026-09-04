import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getSessionUserId } from "../lib/auth";
import { getUserWithCounts } from "../features/profiles/profile.service";

const router = Router();

function getViewerId(req: any): number | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return getSessionUserId(auth.slice(7));
}

export function getNotificationPriority(type: string): { priority: string; category: string } {
  switch (type) {
    case "mention": return { priority: "high", category: "mention" };
    case "comment": return { priority: "normal", category: "social" };
    case "like": return { priority: "low", category: "social" };
    case "follow": return { priority: "normal", category: "social" };
    case "admin_action": return { priority: "urgent", category: "admin" };
    case "system": return { priority: "high", category: "system" };
    case "group_invite": return { priority: "high", category: "social" };
    case "milestone": return { priority: "high", category: "achievement" };
    case "view_milestone": return { priority: "normal", category: "achievement" };
    case "trending_notif": return { priority: "high", category: "achievement" };
    case "referral_reward": return { priority: "high", category: "social" };
    case "opportunity_nudge": return { priority: "high", category: "growth" };
    case "dormant_nudge": return { priority: "low", category: "growth" };
    case "share_nudge": return { priority: "normal", category: "growth" };
    case "level_up": return { priority: "high", category: "growth" };
    case "commission_request": return { priority: "high", category: "opportunity" };
    case "commission_response": return { priority: "high", category: "opportunity" };
    case "skill_endorsement": return { priority: "low", category: "social" };
    case "skill_endorsed": return { priority: "low", category: "social" };
    default: return { priority: "normal", category: "social" };
  }
}

router.get("/count", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });
  const rows = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, viewerId), eq(notificationsTable.isRead, false)));
  return res.json({ unread: rows.length });
});

router.get("/", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });

  const { priority } = req.query;

  let notifications;
  if (priority && typeof priority === "string") {
    notifications = await db
      .select()
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, viewerId), eq(notificationsTable.priority, priority)))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);
  } else {
    notifications = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, viewerId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);
  }

  const enriched = await Promise.all(notifications.map(async n => {
    const actor = await getUserWithCounts(n.actorId, null);
    return { ...n, actor };
  }));

  return res.json(enriched);
});

router.get("/digest", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, viewerId), eq(notificationsTable.isRead, false)))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  const byCategory: Record<string, typeof notifications> = {};
  for (const n of notifications) {
    const cat = n.category || "social";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(n);
  }

  const digest = Object.entries(byCategory).map(([category, items]) => ({
    category,
    count: items.length,
    latest: items.slice(0, 5),
  }));

  return res.json(digest);
});

router.post("/read", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });

  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, viewerId));

  return res.json({ success: true });
});

router.patch("/read-all", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });

  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, viewerId));

  return res.json({ success: true });
});

router.patch("/:id/read", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, viewerId)));

  return res.json({ success: true });
});

// Keep the original client contract working as well as the RESTful PATCH route.
router.post("/read-all", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });

  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, viewerId));

  return res.json({ success: true });
});

router.delete("/:id", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  await db
    .delete(notificationsTable)
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, viewerId)));

  return res.json({ success: true });
});

export default router;
