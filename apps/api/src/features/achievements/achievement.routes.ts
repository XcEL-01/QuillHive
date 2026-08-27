import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getAllAchievements, getUserAchievements } from "./achievement.service";

export const achievementsRouter = Router();

achievementsRouter.get("/", async (_req: Request, res: Response) => {
  const all = await getAllAchievements();
  return res.json(all);
});

achievementsRouter.get("/user/:username", async (req: Request, res: Response) => {
  const { username } = req.params;
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username as string));
  if (!user) return res.status(404).json({ error: "User not found" });
  const unlocked = await getUserAchievements(user.id);
  return res.json(unlocked);
});
