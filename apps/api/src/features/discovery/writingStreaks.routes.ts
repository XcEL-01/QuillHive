import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getViewerId } from "../../lib/auth-types";
import {
  getWritingStreak,
  getRecentWritingActivity,
} from "./writingStreaks.service";

export const writingStreaksRouter: Router = Router();

writingStreaksRouter.get("/me", async (req, res) => {
  const userId = getViewerId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const streak = await getWritingStreak(userId);
  const activity = await getRecentWritingActivity(userId);
  return res.json({ streak, activity });
});

writingStreaksRouter.get("/user/:username", async (req, res) => {
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, req.params.username));
  if (!user) return res.status(404).json({ error: "User not found" });
  const streak = await getWritingStreak(user.id);
  const activity = await getRecentWritingActivity(user.id);
  return res.json({ streak, activity });
});
