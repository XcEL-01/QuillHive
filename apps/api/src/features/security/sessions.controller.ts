import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { sessionsTable, loginEventsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { getViewerId } from "../../lib/auth-types";

function maskIpHash(hash: string | null): string | null {
  if (!hash) return null;
  return `${hash.slice(0, 8)}…`;
}

export async function listMySessions(req: Request, res: Response) {
  const userId = getViewerId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const sessions = await db
    .select({
      id: sessionsTable.id,
      userAgent: sessionsTable.userAgent,
      ipHash: sessionsTable.ipHash,
      createdAt: sessionsTable.createdAt,
      expiresAt: sessionsTable.expiresAt,
    })
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, userId))
    .orderBy(desc(sessionsTable.createdAt))
    .limit(10);

  return res.json(
    sessions.map((s) => ({
      ...s,
      ipHash: maskIpHash(s.ipHash),
    })),
  );
}

export async function listMyLoginActivity(req: Request, res: Response) {
  const userId = getViewerId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const events = await db
    .select({
      id: loginEventsTable.id,
      ipHash: loginEventsTable.ipHash,
      userAgent: loginEventsTable.userAgent,
      country: loginEventsTable.country,
      timezone: loginEventsTable.timezone,
      integrityStatus: loginEventsTable.integrityStatus,
      riskScore: loginEventsTable.riskScore,
      createdAt: loginEventsTable.createdAt,
    })
    .from(loginEventsTable)
    .where(eq(loginEventsTable.userId, userId))
    .orderBy(desc(loginEventsTable.createdAt))
    .limit(5);

  return res.json(
    events.map((e) => ({
      ...e,
      ipHash: maskIpHash(e.ipHash),
    })),
  );
}

export async function revokeAllMySessions(req: Request, res: Response) {
  const userId = getViewerId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const deleted = await db
    .delete(sessionsTable)
    .where(eq(sessionsTable.userId, userId))
    .returning({ id: sessionsTable.id });

  return res.json({ revoked: deleted.length });
}
