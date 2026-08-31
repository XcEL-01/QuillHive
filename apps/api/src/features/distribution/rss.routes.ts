import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { postsTable, usersTable } from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";

const RSS_LIMIT = 50;

function originFor(req: Request): string {
  return process.env["APP_URL"] || `${req.protocol}://${req.get("host")}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

interface RssItem {
  id: number;
  title: string | null;
  excerpt: string | null;
  content: string;
  imageUrl: string | null;
  authorName: string;
  authorUsername: string;
  createdAt: Date;
}

function renderRss(channelTitle: string, channelLink: string, channelDescription: string, items: RssItem[]): string {
  const itemsXml = items
    .map((item) => {
      const url = `${channelLink.replace(/\/$/, "")}/post/${item.id}`;
      const title = item.title || "Untitled post";
      const desc = item.excerpt || item.content.replace(/<[^>]+>/g, "").slice(0, 280);
      const pub = item.createdAt.toUTCString();
      return [
        "<item>",
        `<title>${cdata(title)}</title>`,
        `<link>${escapeXml(url)}</link>`,
        `<guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `<pubDate>${pub}</pubDate>`,
        `<dc:creator>${cdata(item.authorName)}</dc:creator>`,
        `<description>${cdata(desc)}</description>`,
        `<content:encoded>${cdata(item.content)}</content:encoded>`,
        item.imageUrl ? `<enclosure url="${escapeXml(item.imageUrl)}" type="image/jpeg"/>` : "",
        "</item>",
      ].filter(Boolean).join("");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(channelDescription)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(channelLink)}" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itemsXml}
  </channel>
</rss>`;
}

export const rssRouter: IRouter = Router();

rssRouter.get("/rss/posts", async (req: Request, res: Response) => {
  const origin = originFor(req);
  try {
    const rows = await db
      .select({
        id: postsTable.id,
        title: postsTable.title,
        excerpt: postsTable.excerpt,
        content: postsTable.content,
        imageUrl: postsTable.imageUrl,
        createdAt: postsTable.createdAt,
        authorName: usersTable.displayName,
        authorUsername: usersTable.username,
      })
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .where(and(eq(postsTable.isPublished, true), eq(postsTable.isDeleted, false)))
      .orderBy(desc(postsTable.createdAt))
      .limit(RSS_LIMIT);

    const xml = renderRss("QuillHive - Latest Posts", origin, "Latest posts from creators on QuillHive.", rows);
    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=600");
    res.send(xml);
  } catch {
    res.status(500).set("Content-Type", "application/rss+xml").send('<?xml version="1.0"?><error/>');
  }
});

rssRouter.get("/rss/users/:username", async (req: Request, res: Response) => {
  const origin = originFor(req);
  const username = req.params.username;
  try {
    const [user] = await db
      .select({ id: usersTable.id, displayName: usersTable.displayName, username: usersTable.username })
      .from(usersTable)
      .where(and(eq(usersTable.username, username as string), eq(usersTable.isBanned, false), eq(usersTable.isDeleted, false)));
    if (!user) {
      res.status(404).set("Content-Type", "application/rss+xml").send('<?xml version="1.0"?><error>not found</error>');
      return;
    }
    const rows = await db
      .select({
        id: postsTable.id,
        title: postsTable.title,
        excerpt: postsTable.excerpt,
        content: postsTable.content,
        imageUrl: postsTable.imageUrl,
        createdAt: postsTable.createdAt,
        authorName: usersTable.displayName,
        authorUsername: usersTable.username,
      })
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .where(and(
        eq(postsTable.authorId, user.id),
        eq(postsTable.isPublished, true),
        eq(postsTable.isDeleted, false),
      ))
      .orderBy(desc(postsTable.createdAt))
      .limit(RSS_LIMIT);

    const xml = renderRss(
      `${user.displayName || user.username} on QuillHive`,
      `${origin}/profile/${user.username}`,
      `Posts by ${user.displayName || user.username} on QuillHive.`,
      rows,
    );
    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=600");
    res.send(xml);
  } catch {
    res.status(500).set("Content-Type", "application/rss+xml").send('<?xml version="1.0"?><error/>');
  }
});
