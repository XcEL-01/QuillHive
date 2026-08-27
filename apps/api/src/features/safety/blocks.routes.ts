import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getViewerId } from "../../lib/auth-types";
import { blockUser, unblockUser, getBlockedByUser } from "./blocks.service";

export const blocksRouter: Router = Router();

blocksRouter.get("/", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });
  const ids = await getBlockedByUser(viewerId);
  if (ids.length === 0) return res.json([]);
  const users = await db
    .select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl })
    .from(usersTable)
    .where(inArray(usersTable.id, ids));
  return res.json(users);
});

blocksRouter.post("/:userId", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });
  const targetId = Number(req.params.userId);
  if (!Number.isInteger(targetId) || targetId <= 0) return res.status(400).json({ error: "Invalid id" });
  if (targetId === viewerId) return res.status(400).json({ error: "Cannot block yourself" });
  const [target] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, targetId));
  if (!target) return res.status(404).json({ error: "User not found" });
  await blockUser(viewerId, targetId);
  return res.json({ ok: true, blocked: true });
});

blocksRouter.delete("/:userId", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });
  const targetId = Number(req.params.userId);
  if (!Number.isInteger(targetId) || targetId <= 0) return res.status(400).json({ error: "Invalid id" });
  await unblockUser(viewerId, targetId);
  return res.json({ ok: true, blocked: false });
});
