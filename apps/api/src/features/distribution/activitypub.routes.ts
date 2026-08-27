import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

function originFor(req: Request): string {
  return process.env["APP_URL"] || `${req.protocol}://${req.get("host")}`;
}

function hostOf(origin: string): string {
  return origin.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export const activityPubRouter: IRouter = Router();

activityPubRouter.get("/.well-known/webfinger", async (req: Request, res: Response) => {
  const resource = String(req.query["resource"] || "");
  const match = resource.match(/^acct:([^@]+)@(.+)$/);
  if (!match) {
    res.status(400).json({ error: "invalid resource" });
    return;
  }
  const username = match[1];
  const origin = originFor(req);
  const host = hostOf(origin);
  if (match[2] !== host) {
    res.status(404).json({ error: "host mismatch" });
    return;
  }
  const [user] = await db
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(and(eq(usersTable.username, username), eq(usersTable.isBanned, false), eq(usersTable.isDeleted, false)));
  if (!user) {
    res.status(404).json({ error: "user not found" });
    return;
  }
  res.set("Content-Type", "application/jrd+json");
  res.json({
    subject: `acct:${user.username}@${host}`,
    aliases: [`${origin}/profile/${user.username}`],
    links: [
      { rel: "http://webfinger.net/rel/profile-page", type: "text/html", href: `${origin}/profile/${user.username}` },
      { rel: "self", type: "application/activity+json", href: `${origin}/activitypub/users/${user.username}` },
    ],
  });
});

activityPubRouter.get("/activitypub/users/:username", async (req: Request, res: Response) => {
  const origin = originFor(req);
  const [user] = await db
    .select({
      username: usersTable.username,
      displayName: usersTable.displayName,
      bio: usersTable.bio,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(usersTable)
    .where(and(eq(usersTable.username, req.params.username as string), eq(usersTable.isBanned, false as boolean), eq(usersTable.isDeleted, false as boolean)));
  if (!user) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.set("Content-Type", "application/activity+json");
  res.json({
    "@context": ["https://www.w3.org/ns/activitystreams"],
    id: `${origin}/activitypub/users/${user.username}`,
    type: "Person",
    preferredUsername: user.username,
    name: user.displayName || user.username,
    summary: user.bio || "",
    url: `${origin}/profile/${user.username}`,
    icon: user.avatarUrl ? { type: "Image", url: user.avatarUrl } : undefined,
    inbox: `${origin}/activitypub/users/${user.username}/inbox`,
    outbox: `${origin}/activitypub/users/${user.username}/outbox`,
  });
});
