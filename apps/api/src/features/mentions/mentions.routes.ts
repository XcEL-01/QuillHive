import { Router, type Request } from "express";
import { db } from "@workspace/db";
import { mentionsTable, usersTable } from "@workspace/db/schema";
import { eq, ilike } from "drizzle-orm";
import { getSessionUserId } from "../../lib/auth";
import { notify } from "../notifications/notification.service";
import { dispatchWebhook } from "../distribution/webhooks.service";

export const mentionsRouter = Router();

function getViewerId(req: Request): number | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return getSessionUserId(auth.slice(7));
}

function parseMentions(content: string): string[] {
  const regex = /@([a-zA-Z0-9_]{2,30})/g;
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    matches.push(m[1].toLowerCase());
  }
  return [...new Set(matches)];
}

export async function processMentions(postId: number, content: string, mentioningUserId: number): Promise<void> {
  const usernames = parseMentions(content);
  if (usernames.length === 0) return;

  for (const username of usernames) {
    try {
      const [mentioned] = await db
        .select({ id: usersTable.id, username: usersTable.username })
        .from(usersTable)
        .where(eq(usersTable.username, username))
        .limit(1);

      if (!mentioned || mentioned.id === mentioningUserId) continue;

      await db.insert(mentionsTable).values({
        postId,
        mentionedUserId: mentioned.id,
        mentioningUserId,
      }).onConflictDoNothing();

      await notify({
        userId: mentioned.id,
        actorId: mentioningUserId,
        type: "mention",
        message: "mentioned you in a post",
        postId,
        digestGroup: `mention:${postId}`,
      });
      void dispatchWebhook({
        userId: mentioned.id,
        event: "mention.created",
        data: { postId, mentionedUserId: mentioned.id, mentioningUserId },
      });
    } catch {
      /* ignore per-mention errors */
    }
  }
}

mentionsRouter.get("/search", async (req, res) => {
  const q = (req.query.q as string || "").trim().replace(/^@/, "");
  if (!q || q.length < 1) return res.json([]);

  try {
    const users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
      })
      .from(usersTable)
      .where(ilike(usersTable.username, `${q}%`))
      .limit(8);

    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: "Search failed" });
  }
});

mentionsRouter.post("/parse", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });

  const { content, postId } = req.body;
  if (!content || !postId) return res.status(400).json({ error: "content and postId required" });

  await processMentions(postId, content, viewerId);
  return res.json({ ok: true });
});
