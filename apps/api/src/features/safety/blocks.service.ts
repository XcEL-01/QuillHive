import { db } from "@workspace/db";
import { mutedUsersTable, safetyPreferencesTable } from "@workspace/db/schema";
import { and, eq, or, sql } from "drizzle-orm";

const cache = new Map<number, { ids: number[]; until: number }>();
const TTL_MS = 30_000;

function parseIds(text: string | null | undefined): number[] {
  try {
    const v = JSON.parse(text || "[]");
    return Array.isArray(v) ? v.filter((n) => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

/** IDs of users whom `userId` has blocked. */
export async function getBlockedByUser(userId: number): Promise<number[]> {
  const cached = cache.get(userId);
  if (cached && cached.until > Date.now()) return cached.ids;
  const [row] = await db
    .select({ blocked: safetyPreferencesTable.blockedUserIds })
    .from(safetyPreferencesTable)
    .where(eq(safetyPreferencesTable.userId, userId));
  const ids = parseIds(row?.blocked);
  cache.set(userId, { ids, until: Date.now() + TTL_MS });
  return ids;
}

/** IDs of users who have blocked `userId` (slow path; uses LIKE on JSON text). */
export async function getBlockersOfUser(userId: number): Promise<number[]> {
  const rows = await db
    .select({ userId: safetyPreferencesTable.userId, blocked: safetyPreferencesTable.blockedUserIds })
    .from(safetyPreferencesTable)
    .where(sql`${safetyPreferencesTable.blockedUserIds} LIKE ${"%" + userId + "%"}`);
  return rows.filter((r) => parseIds(r.blocked).includes(userId)).map((r) => r.userId);
}

/** Both directions: IDs the viewer should never see content from. */
export async function getMutualBlockSet(viewerId: number): Promise<Set<number>> {
  const [a, b] = await Promise.all([getBlockedByUser(viewerId), getBlockersOfUser(viewerId)]);
  return new Set([...a, ...b]);
}

/** True if `viewerId` is blocked by `targetId` or has blocked `targetId`. */
export async function isBlockedBetween(viewerId: number, targetId: number): Promise<boolean> {
  if (viewerId === targetId) return false;
  const [aBlockedB, bBlockedA] = await Promise.all([
    getBlockedByUser(viewerId),
    getBlockedByUser(targetId),
  ]);
  return aBlockedB.includes(targetId) || bBlockedA.includes(viewerId);
}

/** Add a user to viewer's block list. */
export async function blockUser(viewerId: number, targetId: number): Promise<void> {
  if (viewerId === targetId) return;
  const [row] = await db
    .select()
    .from(safetyPreferencesTable)
    .where(eq(safetyPreferencesTable.userId, viewerId));
  if (!row) {
    await db
      .insert(safetyPreferencesTable)
      .values({ userId: viewerId, blockedUserIds: JSON.stringify([targetId]) });
  } else {
    const ids = new Set(parseIds(row.blockedUserIds));
    ids.add(targetId);
    await db
      .update(safetyPreferencesTable)
      .set({ blockedUserIds: JSON.stringify([...ids]), updatedAt: new Date() })
      .where(eq(safetyPreferencesTable.userId, viewerId));
  }
  cache.delete(viewerId);
}

export async function unblockUser(viewerId: number, targetId: number): Promise<void> {
  const [row] = await db
    .select()
    .from(safetyPreferencesTable)
    .where(eq(safetyPreferencesTable.userId, viewerId));
  if (!row) return;
  const ids = parseIds(row.blockedUserIds).filter((id) => id !== targetId);
  await db
    .update(safetyPreferencesTable)
    .set({ blockedUserIds: JSON.stringify(ids), updatedAt: new Date() })
    .where(eq(safetyPreferencesTable.userId, viewerId));
  cache.delete(viewerId);
}

export async function getMutedByUser(userId: number): Promise<number[]> {
  const rows = await db
    .select({ mutedId: mutedUsersTable.mutedId })
    .from(mutedUsersTable)
    .where(eq(mutedUsersTable.muterId, userId));
  return rows.map((row) => row.mutedId);
}

export async function muteUser(viewerId: number, targetId: number): Promise<void> {
  if (viewerId === targetId) return;
  await db.insert(mutedUsersTable).values({ muterId: viewerId, mutedId: targetId }).onConflictDoNothing();
}

export async function unmuteUser(viewerId: number, targetId: number): Promise<void> {
  await db.delete(mutedUsersTable).where(and(eq(mutedUsersTable.muterId, viewerId), eq(mutedUsersTable.mutedId, targetId)));
}
