import { db } from "@workspace/db";
import { collaborationRequestsTable, collaborationRoomsTable } from "@workspace/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { getUserWithCounts } from "../profiles/profile.service";
import { startConversation, sendMessage } from "../messaging/messaging.service";

export async function sendCollaborationRequest(
  senderId: number,
  receiverId: number,
  message: string
) {
  const existing = await db
    .select()
    .from(collaborationRequestsTable)
    .where(
      and(
        eq(collaborationRequestsTable.senderId, senderId),
        eq(collaborationRequestsTable.receiverId, receiverId),
        eq(collaborationRequestsTable.status, "pending")
      )
    );

  if (existing.length > 0) {
    return { request: existing[0], duplicate: true };
  }

  const [request] = await db
    .insert(collaborationRequestsTable)
    .values({ senderId, receiverId, message, status: "pending" })
    .returning();

  const sender = await getUserWithCounts(senderId, null);
  const receiver = await getUserWithCounts(receiverId, null);

  return {
    request: { ...request, sender, receiver },
    duplicate: false,
  };
}

export async function getReceivedRequests(userId: number) {
  const requests = await db
    .select()
    .from(collaborationRequestsTable)
    .where(eq(collaborationRequestsTable.receiverId, userId));

  return Promise.all(
    requests.map(async r => {
      const sender = await getUserWithCounts(r.senderId, userId);
      return { ...r, sender };
    })
  );
}

export async function getSentRequests(userId: number) {
  const requests = await db
    .select()
    .from(collaborationRequestsTable)
    .where(eq(collaborationRequestsTable.senderId, userId));

  return Promise.all(
    requests.map(async r => {
      const receiver = await getUserWithCounts(r.receiverId, userId);
      return { ...r, receiver };
    })
  );
}

export async function updateRequestStatus(
  id: number,
  userId: number,
  status: "accepted" | "rejected"
) {
  const [request] = await db
    .select()
    .from(collaborationRequestsTable)
    .where(eq(collaborationRequestsTable.id, id));

  if (!request) return null;
  if (request.receiverId !== userId) throw new Error("Forbidden");

  const [updated] = await db
    .update(collaborationRequestsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(collaborationRequestsTable.id, id))
    .returning();

  if (status === "accepted") {
    const { conversationId } = await startConversation(request.senderId, request.receiverId);
    await sendMessage(request.receiverId, {
      conversationId,
      content: `I accepted your collaboration request! Let's connect.`,
    });
  }

  const sender = await getUserWithCounts(updated.senderId, userId);
  return { ...updated, sender };
}

function canAccessRoom(roomRequest: { senderId: number; receiverId: number }, userId: number) {
  return roomRequest.senderId === userId || roomRequest.receiverId === userId;
}

export async function getRooms(userId: number) {
  const requests = await db
    .select()
    .from(collaborationRequestsTable)
    .where(and(or(eq(collaborationRequestsTable.senderId, userId), eq(collaborationRequestsTable.receiverId, userId)), eq(collaborationRequestsTable.status, "accepted")));
  if (requests.length === 0) return [];

  const rooms = await db.select().from(collaborationRoomsTable).orderBy(desc(collaborationRoomsTable.updatedAt));
  return rooms
    .filter(room => requests.some(request => request.id === room.requestId))
    .map(room => ({ ...room, request: requests.find(request => request.id === room.requestId) }));
}

export async function createRoom(userId: number, input: { requestId: number; title: string; brief?: string; splitSuggestion?: Record<string, number> }) {
  const [request] = await db.select().from(collaborationRequestsTable).where(and(eq(collaborationRequestsTable.id, input.requestId), eq(collaborationRequestsTable.status, "accepted")));
  if (!request) return { kind: "missing" as const };
  if (!canAccessRoom(request, userId)) return { kind: "forbidden" as const };

  const [existing] = await db.select().from(collaborationRoomsTable).where(eq(collaborationRoomsTable.requestId, input.requestId));
  if (existing) return { kind: "exists" as const, room: existing };

  const [room] = await db.insert(collaborationRoomsTable).values({
    requestId: input.requestId,
    createdById: userId,
    title: input.title,
    brief: input.brief ?? "",
    splitSuggestion: input.splitSuggestion ?? {},
  }).returning();
  return { kind: "created" as const, room };
}

export async function updateRoom(userId: number, roomId: number, input: { title?: string; brief?: string; splitSuggestion?: Record<string, number> }) {
  const [room] = await db.select().from(collaborationRoomsTable).where(eq(collaborationRoomsTable.id, roomId));
  if (!room) return { kind: "missing" as const };
  const [request] = await db.select().from(collaborationRequestsTable).where(eq(collaborationRequestsTable.id, room.requestId));
  if (!request) return { kind: "missing" as const };
  if (!canAccessRoom(request, userId)) return { kind: "forbidden" as const };

  const [updated] = await db.update(collaborationRoomsTable).set({ ...input, updatedAt: new Date() }).where(eq(collaborationRoomsTable.id, roomId)).returning();
  return { kind: "updated" as const, room: updated };
}
