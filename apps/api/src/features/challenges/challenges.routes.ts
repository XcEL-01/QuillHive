import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { challengesTable, challengeSubmissionsTable, usersTable } from "@workspace/db/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../../middleware/admin";

interface AuthedReq extends Request {
  currentUser: { id: number; role: string };
}

export const challengesRouter: Router = Router();

challengesRouter.get("/", async (_req: Request, res: Response) => {
  const now = new Date();
  const challenges = await db
    .select({
      id: challengesTable.id,
      title: challengesTable.title,
      prompt: challengesTable.prompt,
      description: challengesTable.description,
      type: challengesTable.type,
      wordLimit: challengesTable.wordLimit,
      startsAt: challengesTable.startsAt,
      endsAt: challengesTable.endsAt,
      isFeatured: challengesTable.isFeatured,
      isActive: challengesTable.isActive,
      submissionCount: challengesTable.submissionCount,
      createdAt: challengesTable.createdAt,
      creatorName: usersTable.displayName,
      creatorUsername: usersTable.username,
    })
    .from(challengesTable)
    .leftJoin(usersTable, eq(usersTable.id, challengesTable.createdBy))
    .where(and(eq(challengesTable.isActive, true), gte(challengesTable.endsAt, now)))
    .orderBy(desc(challengesTable.isFeatured), desc(challengesTable.createdAt))
    .limit(50);
  return res.json({ challenges });
});

challengesRouter.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
  const [challenge] = await db.select().from(challengesTable).where(eq(challengesTable.id, id));
  if (!challenge) return res.status(404).json({ error: "Not found" });
  return res.json({ challenge });
});

challengesRouter.post("/:id/submit", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthedReq).currentUser.id;
  const challengeId = parseInt(req.params.id, 10);
  if (!Number.isInteger(challengeId) || challengeId <= 0) return res.status(400).json({ error: "Invalid id" });
  const postIdRaw = (req.body as { postId?: number | string }).postId;
  const postId = typeof postIdRaw === "string" ? Number.parseInt(postIdRaw, 10) : postIdRaw;
  if (!postId || !Number.isInteger(postId) || postId <= 0) return res.status(400).json({ error: "postId required" });

  const [challenge] = await db.select().from(challengesTable).where(eq(challengesTable.id, challengeId));
  if (!challenge || !challenge.isActive || new Date() > challenge.endsAt) {
    return res.status(400).json({ error: "Challenge is not active or has ended" });
  }

  const existing = await db
    .select()
    .from(challengeSubmissionsTable)
    .where(and(eq(challengeSubmissionsTable.challengeId, challengeId), eq(challengeSubmissionsTable.userId, userId)));
  if (existing.length > 0) return res.status(409).json({ error: "Already submitted" });

  const [submission] = await db
    .insert(challengeSubmissionsTable)
    .values({ challengeId, userId, postId })
    .returning();

  await db
    .update(challengesTable)
    .set({ submissionCount: sql`${challengesTable.submissionCount} + 1` })
    .where(eq(challengesTable.id, challengeId));

  return res.status(201).json({ submission });
});

challengesRouter.post("/", requireAdmin, async (req: Request, res: Response) => {
  const adminId = (req as AuthedReq).currentUser.id;
  const body = req.body as {
    title: string;
    prompt: string;
    description?: string;
    type?: string;
    wordLimit?: number;
    endsAt: string;
    isFeatured?: boolean;
  };
  if (!body.title || !body.prompt || !body.endsAt) return res.status(400).json({ error: "title, prompt, endsAt required" });
  const endsAt = new Date(body.endsAt);
  if (Number.isNaN(endsAt.getTime())) return res.status(400).json({ error: "Invalid endsAt" });
  const [challenge] = await db
    .insert(challengesTable)
    .values({
      title: body.title,
      prompt: body.prompt,
      description: body.description,
      type: body.type || "open",
      wordLimit: body.wordLimit,
      endsAt,
      isFeatured: body.isFeatured ?? false,
      createdBy: adminId,
    })
    .returning();
  return res.status(201).json({ challenge });
});

challengesRouter.patch("/:id/feature", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
  const { isFeatured } = req.body as { isFeatured: boolean };
  await db.update(challengesTable).set({ isFeatured: Boolean(isFeatured) }).where(eq(challengesTable.id, id));
  return res.json({ success: true });
});

challengesRouter.patch("/:id/deactivate", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
  await db.update(challengesTable).set({ isActive: false }).where(eq(challengesTable.id, id));
  return res.json({ success: true });
});
