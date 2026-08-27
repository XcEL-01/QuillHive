import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { postsTable, usersTable, libraryEntriesTable } from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";

const SITEMAP_LIMIT = 5000;

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

export const sitemapRouter: IRouter = Router();

sitemapRouter.get("/robots.txt", (req: Request, res: Response) => {
  const origin = originFor(req);
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /admin",
    "Disallow: /settings",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600");
  res.send(body);
});

sitemapRouter.get("/sitemap.xml", async (req: Request, res: Response) => {
  const origin = originFor(req);
  try {
    const posts = await db
      .select({ id: postsTable.id, updatedAt: postsTable.updatedAt })
      .from(postsTable)
      .where(and(eq(postsTable.isPublished, true), eq(postsTable.isDeleted, false)))
      .orderBy(desc(postsTable.updatedAt))
      .limit(SITEMAP_LIMIT);

    const users = await db
      .select({ username: usersTable.username, updatedAt: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.isBanned, false), eq(usersTable.isDeleted, false)))
      .limit(SITEMAP_LIMIT);

    const staticPaths = ["/", "/explore", "/trending", "/topics", "/about", "/contact", "/privacy", "/terms"];

    const urls: string[] = [];
    for (const p of staticPaths) {
      urls.push(`<url><loc>${escapeXml(`${origin}${p}`)}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`);
    }
    for (const post of posts) {
      const last = post.updatedAt instanceof Date ? post.updatedAt.toISOString() : new Date().toISOString();
      urls.push(
        `<url><loc>${escapeXml(`${origin}/post/${post.id}`)}</loc><lastmod>${last}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
      );
    }
    for (const user of users) {
      urls.push(
        `<url><loc>${escapeXml(`${origin}/profile/${user.username}`)}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`,
      );
    }

    // Library entries
    const libraryEntries = await db
      .select({
        slug: libraryEntriesTable.slug,
        updatedAt: libraryEntriesTable.updatedAt,
        isFeatured: libraryEntriesTable.isFeatured,
      })
      .from(libraryEntriesTable)
      .where(and(eq(libraryEntriesTable.isPublic, true), eq(libraryEntriesTable.isApproved, true)))
      .orderBy(desc(libraryEntriesTable.publishedAt))
      .limit(10000);

    // Static library index
    urls.push(`<url><loc>${escapeXml(`${origin}/library`)}</loc><changefreq>daily</changefreq><priority>0.9</priority></url>`);

    for (const e of libraryEntries) {
      const last = e.updatedAt instanceof Date ? e.updatedAt.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
      urls.push(`<url><loc>${escapeXml(`${origin}/library/${e.slug}`)}</loc><lastmod>${last}</lastmod><changefreq>monthly</changefreq><priority>${e.isFeatured ? "0.9" : "0.7"}</priority></url>`);
    }

    // Public profiles at /u/:username
    for (const user of users) {
      urls.push(`<url><loc>${escapeXml(`${origin}/u/${user.username}`)}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=1800");
    res.send(xml);
  } catch {
    res.status(500).set("Content-Type", "application/xml").send('<?xml version="1.0"?><error/>');
  }
});
