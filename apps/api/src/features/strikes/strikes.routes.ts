import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { moderationStrikesTable } from "@workspace/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { requireAuth } from "../../middleware/admin";

interface AuthedRequest extends Request {
  currentUser: { id: number };
}

export const strikesRouter = Router();

strikesRouter.get("/me", requireAuth, async (req, res: Response) => {
  const userId = (req as AuthedRequest).currentUser.id;
  const rows = await db
    .select()
    .from(moderationStrikesTable)
    .where(eq(moderationStrikesTable.userId, userId))
    .orderBy(desc(moderationStrikesTable.createdAt));
  return res.json({ strikes: rows });
});

strikesRouter.get("/me/unacknowledged", requireAuth, async (req, res: Response) => {
  const userId = (req as AuthedRequest).currentUser.id;
  const rows = await db
    .select()
    .from(moderationStrikesTable)
    .where(and(eq(moderationStrikesTable.userId, userId), isNull(moderationStrikesTable.acknowledgedAt)))
    .orderBy(desc(moderationStrikesTable.createdAt));
  return res.json({ strikes: rows, count: rows.length });
});

strikesRouter.post("/:id/acknowledge", requireAuth, async (req, res: Response) => {
  const userId = (req as AuthedRequest).currentUser.id;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  const [strike] = await db
    .select()
    .from(moderationStrikesTable)
    .where(eq(moderationStrikesTable.id, id));
  if (!strike) return res.status(404).json({ error: "Strike not found" });
  if (strike.userId !== userId) return res.status(403).json({ error: "Forbidden" });
  const [updated] = await db
    .update(moderationStrikesTable)
    .set({ acknowledgedAt: new Date() })
    .where(eq(moderationStrikesTable.id, id))
    .returning();
  return res.json({ ok: true, strike: updated });
});
