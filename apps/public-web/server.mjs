import express from "express";

const app = express();
const PORT = process.env.PORT || 3001;
const API_URL = process.env.API_URL || "http://localhost:9000";
const APP_URL = process.env.APP_URL || "http://localhost:5000";

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlPage({ title, description, ogImage, ogUrl, ogType = "website", extra = "" }) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImg = escapeHtml(ogImage || `${APP_URL}/opengraph.jpg`);
  const safeUrl = escapeHtml(ogUrl || APP_URL);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />
  <meta property="og:site_name" content="QuillHive" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${safeImg}" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:type" content="${ogType}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeImg}" />
  ${extra}
</head>
<body>
  <script>window.location.replace("${APP_URL}" + window.location.pathname.replace(/^\\/p\\//, "/post/").replace(/^\\/u\\//, "/profile/"));</script>
  <noscript><a href="${safeUrl}">Continue to QuillHive →</a></noscript>
</body>
</html>`;
}

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /settings\nDisallow: /messages\nDisallow: /onboarding\nSitemap: ${APP_URL}/sitemap.xml`
  );
});

app.get("/sitemap.xml", async (_req, res) => {
  const base = [
    { url: APP_URL, freq: "daily", priority: "1.0" },
    { url: `${APP_URL}/explore`, freq: "hourly", priority: "0.9" },
    { url: `${APP_URL}/about`, freq: "monthly", priority: "0.5" },
    { url: `${APP_URL}/terms`, freq: "yearly", priority: "0.3" },
    { url: `${APP_URL}/privacy`, freq: "yearly", priority: "0.3" },
    { url: `${APP_URL}/content-policy`, freq: "yearly", priority: "0.3" },
  ];

  const data = await fetchJson(`${API_URL}/api/posts?limit=200&type=published`);
  const posts = data?.posts || [];

  const urlEntries = [
    ...base.map(({ url, freq, priority }) => `  <url><loc>${url}</loc><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`),
    ...posts.map((p) => {
      const lastmod = p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString();
      return `  <url><loc>${APP_URL}/post/${p.id}</loc><changefreq>weekly</changefreq><priority>0.7</priority><lastmod>${lastmod}</lastmod></url>`;
    }),
  ];

  res.type("application/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries.join("\n")}\n</urlset>`
  );
});

app.get("/p/:id", async (req, res) => {
  const post = await fetchJson(`${API_URL}/api/posts/${req.params.id}`);
  if (!post) {
    return res.status(404).send(htmlPage({
      title: "Post - QuillHive",
      description: "Your quill is your voice. Your hive is where it grows. QuillHive - for everyone with something to share.",
      ogUrl: `${APP_URL}/post/${req.params.id}`,
    }));
  }
  const plainContent = (post.content || "").replace(/<[^>]+>/g, "").slice(0, 160);
  const postDescription = post.excerpt || plainContent;
  res.send(htmlPage({
    title: `${post.title || "Untitled"} - QuillHive`,
    description: `${postDescription} on QuillHive - where everyone grows.`,
    ogImage: post.imageUrl || undefined,
    ogUrl: `${APP_URL}/post/${req.params.id}`,
    ogType: "article",
    extra: post.author?.displayName
      ? `<meta property="article:author" content="${escapeHtml(post.author.displayName)}" />`
      : "",
  }));
});

app.get("/u/:username", async (req, res) => {
  const profile = await fetchJson(`${API_URL}/api/users/${req.params.username}`);
  if (!profile) {
    return res.status(404).send(htmlPage({
      title: "Profile - QuillHive",
      description: "Your quill is your voice. Your hive is where it grows. QuillHive - for everyone with something to share.",
      ogUrl: `${APP_URL}/profile/${req.params.username}`,
    }));
  }
  res.send(htmlPage({
    title: `${profile.displayName || req.params.username} - QuillHive`,
    description: profile.bio || `Discover ${profile.displayName || req.params.username}'s work on QuillHive - where everyone grows, gets discovered, and finds real opportunities.`,
    ogImage: profile.avatarUrl || undefined,
    ogUrl: `${APP_URL}/profile/${req.params.username}`,
  }));
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const OWNER_EMAIL = process.env.OWNER_EMAIL || "support@quillhive.app";

function landingPageHtml() {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>QuillHive — Where Work Speaks</title>
<meta name="description" content="Proof over profile. QuillHive ranks creators by Trust Score, not follower count — built from streaks, real read time, and completed work. For talented people who are still invisible everywhere else." />
<meta property="og:title" content="QuillHive — Where Work Speaks" />
<meta property="og:description" content="Not famous. Trusted." />
<meta property="og:image" content="${APP_URL}/opengraph.jpg" />
<meta property="og:url" content="${APP_URL}" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="canonical" href="${APP_URL}" />
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0a0a0a;--surface:#111111;--border:#1f1f1f;--text:#f5f5f5;--muted:#737373;--primary:#8b5cf6;--primary-light:#a78bfa}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);line-height:1.6;min-height:100vh}
.nav{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 2rem;border-bottom:1px solid var(--border);position:sticky;top:0;background:rgba(10,10,10,.95);backdrop-filter:blur(12px);z-index:10}
.logo{font-size:1.25rem;font-weight:700;color:var(--text);text-decoration:none;letter-spacing:-.02em}
.nav-actions{display:flex;gap:.75rem;align-items:center}
.btn{display:inline-flex;align-items:center;padding:.5rem 1.25rem;border-radius:9999px;font-size:.875rem;font-weight:600;text-decoration:none;transition:opacity .15s;cursor:pointer;border:none}
.btn:hover{opacity:.85}
.btn-ghost{color:var(--muted);background:transparent}
.btn-primary{background:var(--primary);color:#fff}
.hero{max-width:860px;margin:0 auto;padding:6rem 2rem 4rem;text-align:center;background:linear-gradient(135deg, #0a0a1f 0%, #1e1040 50%, #2d1b4e 100%)}
.badge{display:inline-block;padding:.25rem .875rem;border-radius:9999px;font-size:.75rem;font-weight:600;border:1px solid var(--primary);color:var(--primary-light);margin-bottom:2rem;letter-spacing:.04em;text-transform:uppercase}
h1{font-size:clamp(2.5rem,6vw,4.5rem);font-weight:800;letter-spacing:-.03em;line-height:1.1;margin-bottom:1.5rem}
h1 span{color:var(--primary-light)}
.hero-sub{font-size:1.125rem;color:var(--muted);max-width:650px;margin:0 auto 1.25rem;line-height:1.7}
.hero-tagline{font-size:1rem;font-style:italic;color:#a78bfa;max-width:600px;margin:0 auto 2.5rem;line-height:1.7}
.hero-actions{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}
.btn-lg{padding:.875rem 2rem;font-size:1rem;border-radius:14px}
.features{max-width:1000px;margin:5rem auto;padding:0 2rem}
.features-label{text-align:center;text-transform:uppercase;letter-spacing:.08em;font-size:.75rem;color:var(--muted);margin-bottom:3rem}
.features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem}
.feature-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1.75rem}
.feature-icon{font-size:1.5rem;margin-bottom:1rem}
.feature-title{font-size:1rem;font-weight:700;margin-bottom:.5rem}
.feature-desc{font-size:.875rem;color:var(--muted);line-height:1.6}
.cta-section{text-align:center;padding:5rem 2rem;border-top:1px solid var(--border)}
.cta-section h2{font-size:clamp(1.75rem,4vw,2.75rem);font-weight:800;letter-spacing:-.02em;margin-bottom:1rem}
.cta-section p{color:var(--muted);margin-bottom:2rem;font-size:1rem}
footer{border-top:1px solid var(--border);padding:2rem;text-align:center}
.footer-links{display:flex;gap:1.5rem;justify-content:center;flex-wrap:wrap;margin-bottom:1rem}
.footer-links a{color:var(--muted);text-decoration:none;font-size:.875rem;transition:color .15s}
.footer-links a:hover{color:var(--text)}
.footer-copy{font-size:.8rem;color:var(--muted)}
@media(max-width:640px){.nav{padding:1rem}.hero{padding:4rem 1rem 3rem}.btn-ghost{display:none}}
</style>
</head>
<body>
<nav class="nav">
  <a href="/" class="logo">QuillHive</a>
  <div class="nav-actions">
    <a href="${APP_URL}/login" class="btn btn-ghost">Sign in</a>
    <a href="${APP_URL}/register" class="btn btn-primary">Join free</a>
  </div>
</nav>
<section class="hero">
  <div class="badge">Now in early access</div>
  <h1>Where work speaks.</h1>
  <p class="hero-sub">Followers can be bought. A streak can't. QuillHive ranks you by what you actually show up and do — not who you know, not who you paid. For the writer, designer, and developer who's talented and still invisible everywhere else.</p>
  <p class="hero-tagline">"Your quill is your voice. Your hive is where it grows." — free to join, always.</p>
  <div class="hero-actions">
    <a href="${APP_URL}/register" class="btn btn-primary btn-lg">Start building proof — join free</a>
    <a href="${APP_URL}/explore" class="btn btn-ghost btn-lg">See who's rising →</a>
  </div>
</section>
<section class="features">
  <p class="features-label">What makes QuillHive different</p>
  <div class="features-grid">
    <div class="feature-card"><div class="feature-icon">🏆</div><div class="feature-title">You can't fake a Trust Score</div><div class="feature-desc">We don't rank you by likes or connections. Your score is built from your writing streak, how consistently you show up, and how many Workspace jobs you've actually finished. It's not a popularity contest. It's a track record.</div></div>
    <div class="feature-card"><div class="feature-icon">🔍</div><div class="feature-title">We show what actually happened</div><div class="feature-desc">Instead of a like count, we show completion — how many people actually finished reading, not how many double-tapped. Serious readers and serious clients don't care about likes. Neither do we.</div></div>
    <div class="feature-card"><div class="feature-icon">📈</div><div class="feature-title">Fair discovery, on purpose</div><div class="feature-desc">Our feed doesn't just push whoever already has the biggest following. We deliberately surface high-trust, low-follower creators doing real work. QuillHive is built to find you before you blow up — not after.</div></div>
  </div>
</section>
<section class="cta-section">
  <h2>Join QuillHive - it's free</h2>
  <p>For everyone with something to share.</p>
  <a href="${APP_URL}/register" class="btn btn-primary btn-lg">Join QuillHive - it's free</a>
</section>
<footer>
  <div class="footer-links">
    <a href="${APP_URL}/about">About</a>
    <a href="${APP_URL}/explore">Explore</a>
    <a href="${APP_URL}/terms">Terms</a>
    <a href="${APP_URL}/privacy">Privacy</a>
    <a href="${APP_URL}/content-policy">Content Policy</a>
    <a href="mailto:${OWNER_EMAIL}">Contact</a>
  </div>
  <p class="footer-copy">&copy; ${year} QuillHive. All rights reserved.</p>
</footer>
</body>
</html>`;
}

app.get("/", (_req, res) => {
  res.type("text/html").send(landingPageHtml());
});

app.get("/*path", (req, res) => {
  const path = req.path;
  // Known SEO/deep-link paths handled above - redirect everything else
  res.redirect(APP_URL + path);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`QuillHive Public Web (SEO server) listening on port ${PORT}`);
});
