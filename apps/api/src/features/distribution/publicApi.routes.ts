import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { createHash, randomBytes } from "crypto";
import { db } from "@workspace/db";
import { apiKeysTable, postsTable, usersTable } from "@workspace/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { requireSuperAdmin } from "../../middleware/admin";

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

const rateBuckets = new Map<string, { count: number; reset: number }>();

interface PublicApiRequest extends Request {
  apiKey?: { id: number; userId: number; rateLimitPerMinute: number };
}

async function requireApiKey(req: PublicApiRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.header("Authorization") || "";
  const raw = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!raw) {
    res.status(401).json({ error: "missing_api_key" });
    return;
  }
  const [row] = await db
    .select()
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.keyHash, hashKey(raw)), eq(apiKeysTable.isActive, true), isNull(apiKeysTable.revokedAt)));
  if (!row) {
    res.status(401).json({ error: "invalid_api_key" });
    return;
  }
  const now = Date.now();
  const bucket = rateBuckets.get(String(row.id));
  if (!bucket || bucket.reset < now) {
    rateBuckets.set(String(row.id), { count: 1, reset: now + 60_000 });
  } else {
    bucket.count += 1;
    if (bucket.count > row.rateLimitPerMinute) {
      res.status(429).json({ error: "rate_limited", retryAfterSeconds: Math.ceil((bucket.reset - now) / 1000) });
      return;
    }
  }
  void db.update(apiKeysTable).set({ lastUsedAt: new Date() }).where(eq(apiKeysTable.id, row.id));
  req.apiKey = { id: row.id, userId: row.userId, rateLimitPerMinute: row.rateLimitPerMinute };
  next();
}

export const publicApiRouter: IRouter = Router();

publicApiRouter.get("/posts", requireApiKey, async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query["limit"] || 20), 50);
  const offset = Math.max(Number(req.query["offset"] || 0), 0);
  const rows = await db
    .select({
      id: postsTable.id,
      title: postsTable.title,
      excerpt: postsTable.excerpt,
      imageUrl: postsTable.imageUrl,
      createdAt: postsTable.createdAt,
      authorUsername: usersTable.username,
      authorDisplayName: usersTable.displayName,
    })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(and(eq(postsTable.isPublished, true), eq(postsTable.isDeleted, false)))
    .orderBy(desc(postsTable.createdAt))
    .limit(limit)
    .offset(offset);
  res.json({ data: rows, limit, offset });
});

publicApiRouter.get("/posts/:id", requireApiKey, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }
  const [row] = await db
    .select({
      id: postsTable.id,
      title: postsTable.title,
      excerpt: postsTable.excerpt,
      content: postsTable.content,
      imageUrl: postsTable.imageUrl,
      tags: postsTable.tags,
      createdAt: postsTable.createdAt,
      authorUsername: usersTable.username,
      authorDisplayName: usersTable.displayName,
    })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(and(eq(postsTable.id, id), eq(postsTable.isPublished, true), eq(postsTable.isDeleted, false)));
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ data: row });
});

publicApiRouter.get("/users/:username", requireApiKey, async (req: Request, res: Response) => {
  const [row] = await db
    .select({
      username: usersTable.username,
      displayName: usersTable.displayName,
      bio: usersTable.bio,
      avatarUrl: usersTable.avatarUrl,
      headline: usersTable.headline,
    })
    .from(usersTable)
    .where(and(eq(usersTable.username, req.params.username as string), eq(usersTable.isBanned, false as boolean), eq(usersTable.isDeleted, false as boolean)));
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ data: row });
});

// Authenticated owner-side CRUD for managing API keys.
function getOwnerUserId(req: Request): number | null {
  const reqWithUser = req as Request & { currentUser?: { id?: number } };
  const v = reqWithUser.currentUser?.id;
  return typeof v === "number" ? v : null;
}

const createKeySchema = z.object({
  name: z.string().min(1).max(80),
  scopes: z.array(z.string()).default([]),
  rateLimitPerMinute: z.number().int().min(1).max(600).default(60),
});

export const apiKeysAdminRouter: IRouter = Router();
apiKeysAdminRouter.use(requireSuperAdmin);

apiKeysAdminRouter.get("/", async (req: Request, res: Response) => {
  const userId = getOwnerUserId(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const rows = await db
    .select({
      id: apiKeysTable.id,
      name: apiKeysTable.name,
      keyPrefix: apiKeysTable.keyPrefix,
      scopes: apiKeysTable.scopes,
      rateLimitPerMinute: apiKeysTable.rateLimitPerMinute,
      isActive: apiKeysTable.isActive,
      lastUsedAt: apiKeysTable.lastUsedAt,
      createdAt: apiKeysTable.createdAt,
    })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.userId, userId))
    .orderBy(desc(apiKeysTable.createdAt));
  res.json({ data: rows });
});

apiKeysAdminRouter.post("/", async (req: Request, res: Response) => {
  const userId = getOwnerUserId(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = createKeySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    return;
  }
  const raw = `qh_${randomBytes(24).toString("hex")}`;
  const [row] = await db
    .insert(apiKeysTable)
    .values({
      userId,
      name: parsed.data.name,
      keyHash: hashKey(raw),
      keyPrefix: raw.slice(0, 8),
      scopes: JSON.stringify(parsed.data.scopes),
      rateLimitPerMinute: parsed.data.rateLimitPerMinute,
    })
    .returning();
  res.status(201).json({ data: { id: row.id, name: row.name, key: raw, keyPrefix: row.keyPrefix } });
});

apiKeysAdminRouter.delete("/:id", async (req: Request, res: Response) => {
  const userId = getOwnerUserId(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }
  await db
    .update(apiKeysTable)
    .set({ isActive: false, revokedAt: new Date() })
    .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, userId)));
  res.status(204).end();
});
