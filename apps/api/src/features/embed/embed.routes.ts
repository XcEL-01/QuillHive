import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { postsTable, usersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { validateParams } from "../../middleware/validate";

export const embedRouter = Router();

const idParams = z.object({ id: z.coerce.number().int().positive() });

embedRouter.get("/:id", validateParams(idParams), async (req, res) => {
  const [post] = await db
    .select({
      id: postsTable.id,
      title: postsTable.title,
      excerpt: postsTable.excerpt,
      content: postsTable.content,
      imageUrl: postsTable.imageUrl,
      createdAt: postsTable.createdAt,
      authorId: postsTable.authorId,
      authorName: usersTable.displayName,
      authorUsername: usersTable.username,
      authorAvatar: usersTable.avatarUrl,
    })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(and(eq(postsTable.id, Number(req.params.id)), eq(postsTable.isPublished, true), eq(postsTable.isDeleted, false)));

  if (!post) return res.status(404).send("<p>Post not found</p>");

  const origin = process.env.APP_URL || `https://${req.hostname}`;
  const postUrl = `${origin}/post/${post.id}`;
  const image = post.imageUrl || "";
  const excerpt = post.excerpt || post.content?.slice(0, 200) || "";
  const safeTitle = (post.title || "QuillHive Post").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeExcerpt = excerpt.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeAuthor = (post.authorName || post.authorUsername).replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${safeTitle} — QuillHive</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#0f0f11;color:#e2e2e6;min-height:100vh;display:flex;align-items:center;justify-content:center}
.card{max-width:480px;width:100%;border:1px solid #27272a;border-radius:12px;overflow:hidden;background:#18181b}
.img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}
.body{padding:16px}
.title{font-size:1.1rem;font-weight:700;line-height:1.3;margin-bottom:8px;color:#f4f4f5}
.excerpt{font-size:.875rem;color:#a1a1aa;line-height:1.5;margin-bottom:12px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.footer{display:flex;align-items:center;justify-content:space-between;font-size:.75rem;color:#71717a}
.author{display:flex;align-items:center;gap:6px}
.avatar{width:20px;height:20px;border-radius:50%;background:#3f3f46}
.btn{background:#8b5cf6;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:.75rem;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}
.quillhive{font-weight:700;background:linear-gradient(135deg,#8b5cf6,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
</style>
</head>
<body>
<div class="card">
${image ? `<img class="img" src="${image}" alt=""/>` : ""}
<div class="body">
<div class="title">${safeTitle}</div>
<div class="excerpt">${safeExcerpt}</div>
<div class="footer">
<div class="author">
${post.authorAvatar ? `<img class="avatar" src="${post.authorAvatar}" alt=""/>` : `<div class="avatar"></div>`}
<span>${safeAuthor}</span>
</div>
<a class="btn" href="${postUrl}" target="_blank" rel="noopener">Read on <span class="quillhive">QuillHive</span></a>
</div>
</div>
</div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Frame-Options", "ALLOWALL");
  res.setHeader("Content-Security-Policy", "frame-ancestors *");
  return res.send(html);
});

embedRouter.get("/:id/meta", validateParams(idParams), async (req, res) => {
  const [post] = await db
    .select({ id: postsTable.id, title: postsTable.title })
    .from(postsTable)
    .where(and(eq(postsTable.id, Number(req.params.id)), eq(postsTable.isPublished, true), eq(postsTable.isDeleted, false)));
  if (!post) return res.status(404).json({ error: "Not found" });
  const origin = process.env.APP_URL || `https://${req.hostname}`;
  return res.json({
    iframe: `<iframe src="${origin}/embed/${post.id}" width="500" height="280" frameborder="0" scrolling="no" style="border-radius:12px;border:1px solid #27272a;overflow:hidden" allowfullscreen></iframe>`,
    url: `${origin}/embed/${post.id}`,
  });
});
