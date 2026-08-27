import { db } from "@workspace/db";
import { collaborationRequestsTable } from "@workspace/db/schema";
import { eq, and, or } from "drizzle-orm";
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
