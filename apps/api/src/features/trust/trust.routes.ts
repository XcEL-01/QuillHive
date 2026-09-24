import { Router } from "express";
import { db } from "@workspace/db";
import { userTrustScoresTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { getSessionUserId } from "../../lib/auth";
import { requireAdmin } from "../../middleware/admin";
import { updateUserTrustScore, getUserTrustScore } from "./trust.service";
import { getUserReputationTimeline } from "./reputation.service";

export const trustRouter = Router();
export const adminTrustRouter = Router();
adminTrustRouter.use(requireAdmin);

function getViewerId(req: any): number | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return getSessionUserId(auth.slice(7));
}

trustRouter.get("/me", async (req, res) => {
  const userId = getViewerId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  let score = await getUserTrustScore(userId);
  if (!score) {
    score = await updateUserTrustScore(userId);
  }
  return res.json(score);
});

trustRouter.get("/timeline", async (req, res) => {
  const userId = getViewerId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const timeline = await getUserReputationTimeline(userId);
  return res.json(timeline);
});

trustRouter.get("/timeline/:userId", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });
  const targetId = parseInt(req.params.userId);
  if (isNaN(targetId)) return res.status(400).json({ error: "Invalid user id" });
  const timeline = await getUserReputationTimeline(targetId);
  return res.json(timeline);
});

trustRouter.get("/:userId", async (req, res) => {
  const targetId = parseInt(req.params.userId);
  if (isNaN(targetId)) return res.status(400).json({ error: "Invalid user id" });

  const score = await getUserTrustScore(targetId);
  if (!score) return res.json({ tier: "restricted", userId: targetId, uti: 0, cvs: 0, bcs: 0, cts: 0, avgCis: 0, creatorLevel: "new_voice", visibilityMultiplier: 0.3 });

  return res.json({ tier: score.tier, userId: targetId, uti: Math.round(score.uti), cvs: score.cvs, bcs: score.bcs, cts: score.cts, avgCis: score.avgCis, creatorLevel: score.creatorLevel ?? "new_voice", visibilityMultiplier: score.visibilityMultiplier });
});

trustRouter.post("/recalculate", async (req, res) => {
  const userId = getViewerId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const score = await updateUserTrustScore(userId);
  return res.json(score);
});

adminTrustRouter.get("/users", async (req, res) => {
  const scores = await db
    .select()
    .from(userTrustScoresTable)
    .orderBy(desc(userTrustScoresTable.uti))
    .limit(100);

  return res.json(scores);
});
