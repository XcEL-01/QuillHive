import { Router } from "express";
import { db } from "@workspace/db";
import {
  jobsTable, usersTable, topicFollowsTable, topicsTable,
  creatorProfilesTable, userTrustScoresTable, postsTable,
} from "@workspace/db/schema";
import { eq, desc, and, or, isNull, gt, sql, inArray, gte } from "drizzle-orm";
import { getSessionUserId } from "../lib/auth";
import { getUserWithCounts } from "../features/profiles/profile.service";

// ── Match scoring ──────────────────────────────────────────────────────────────
const IDENTITY_KEYWORDS: Record<string, string[]> = {
  writer:       ["writing", "content", "copy", "blog", "article", "fiction", "editorial", "poet", "author", "script"],
  artist:       ["design", "illustration", "art", "visual", "graphic", "creative", "motion", "animation"],
  builder:      ["developer", "engineer", "technical", "code", "software", "web", "app"],
  professional: ["consulting", "business", "marketing", "strategy", "brand", "pr", "comms"],
  student:      ["research", "academic", "education", "intern", "entry-level"],
  community:    ["community", "social", "engagement", "moderator", "growth"],
};

function scoreJobForCreator(
  job: { skills: string; category: string | null; title: string; description: string },
  userSkills: string[],
  userTopicNames: string[],
  identityType: string | null,
  trustUti: number,
  trustTier: string,
  recentPosts: number,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const jobSkillsArr: string[] = JSON.parse(job.skills || "[]");
  const jobText = `${job.title} ${job.description} ${job.category ?? ""} ${jobSkillsArr.join(" ")}`.toLowerCase();

  // 1. Skill overlap (max 40 pts)
  const matchedSkills = userSkills
    .map(s => s.toLowerCase())
    .filter(s => jobSkillsArr.some(js => js.toLowerCase().includes(s) || s.includes(js.toLowerCase())) || jobText.includes(s));
  if (matchedSkills.length > 0) {
    score += Math.min(40, matchedSkills.length * 14);
    reasons.push(`Skills match: ${matchedSkills.slice(0, 2).join(", ")}`);
  }

  // 2. Topic/interest overlap (max 25 pts)
  const matchedTopics = userTopicNames.map(t => t.toLowerCase()).filter(t => jobText.includes(t));
  if (matchedTopics.length > 0) {
    score += Math.min(25, matchedTopics.length * 12);
    reasons.push(`Matches your ${matchedTopics[0]} interest`);
  }

  // 3. Identity alignment (max 20 pts)
  const aligned = (IDENTITY_KEYWORDS[identityType ?? ""] ?? []).filter(kw => jobText.includes(kw));
  if (aligned.length > 0) {
    score += 20;
    reasons.push("Matches your creator type");
  }

  // 4. Trust quality signal (max 10 pts)
  const trustBonus = trustTier === "trusted" ? 10 : trustUti > 70 ? 7 : trustUti > 50 ? 4 : 0;
  if (trustBonus > 0) {
    score += trustBonus;
    if (trustTier === "trusted") reasons.push("Your trust score qualifies you");
  }

  // 5. Activity bonus (max 5 pts)
  if (recentPosts > 0) {
    score += Math.min(5, recentPosts);
    reasons.push("Active creator");
  }

  return { score: Math.min(100, Math.round(score)), reasons };
}

function scoreCreatorForJob(
  jobSkillsArr: string[],
  jobText: string,
  creatorSkills: string[],
  topicNames: string[],
  identityType: string | null,
  trustUti: number,
  trustTier: string,
  recentPosts: number,
): { score: number; reasons: string[] } {
  return scoreJobForCreator(
    { skills: JSON.stringify(jobSkillsArr), category: null, title: jobText.slice(0, 80), description: jobText },
    creatorSkills, topicNames, identityType, trustUti, trustTier, recentPosts,
  );
}

const router = Router();

function getViewerId(req: any): number | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return getSessionUserId(auth.slice(7));
}

async function enrichJob(job: any, viewerId: number | null) {
  const author = await getUserWithCounts(job.authorId, viewerId);
  return {
    ...job,
    skills: JSON.parse(job.skills || "[]"),
    author,
  };
}

router.get("/", async (req, res) => {
  const viewerId = getViewerId(req);
  const type = req.query.type as string | undefined;
  const category = req.query.category as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;
  const now = new Date();

  const conds = [
    eq(jobsTable.isActive, true),
    eq(jobsTable.isApproved, true),
    or(isNull(jobsTable.expiresAt), gt(jobsTable.expiresAt, now)),
  ];
  if (type) conds.push(eq(jobsTable.type, type));
  if (category) conds.push(eq(jobsTable.category, category));

  const jobs = await db
    .select()
    .from(jobsTable)
    .where(and(...conds))
    .orderBy(
      // Featured (and not expired) first
      sql`(case when ${jobsTable.isFeatured} = true and (${jobsTable.featuredUntil} is null or ${jobsTable.featuredUntil} > now()) then 0 else 1 end)`,
      desc(jobsTable.createdAt),
    )
    .limit(limit)
    .offset((page - 1) * limit);

  const enriched = await Promise.all(jobs.map((j) => enrichJob(j, viewerId)));
  return res.json({ jobs: enriched, total: enriched.length, page });
});

router.post("/", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });

  const {
    title, description, type, skills, compensation, remote, location,
    isPaid, budget, companyName, applyUrl, applyEmail, category,
  } = req.body;
  if (!title || !description || !type) {
    return res.status(400).json({ error: "Title, description, and type are required" });
  }

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60_000);

  const [job] = await db.insert(jobsTable).values({
    authorId: viewerId,
    title,
    description,
    type,
    skills: JSON.stringify(skills || []),
    compensation: compensation || null,
    remote: remote ?? true,
    location: location || null,
    isPaid: isPaid ?? false,
    budget: budget ?? null,
    companyName: companyName || null,
    applyUrl: applyUrl || null,
    applyEmail: applyEmail || null,
    category: category || null,
    expiresAt,
  }).returning();

  const enriched = await enrichJob(job, viewerId);
  try {
    const { dispatchWebhook } = await import("../features/distribution/webhooks.service");
    void dispatchWebhook({
      userId: viewerId,
      event: "job.created",
      data: { jobId: job.id, title: job.title, type: job.type, isPaid: job.isPaid },
    });
  } catch { /* webhook is best-effort */ }
  return res.status(201).json(enriched);
});

// ── GET /my-matches — top matched opportunities for the logged-in creator ──────
router.get("/my-matches", async (req, res) => {
  const viewerId = getViewerId(req);
  if (!viewerId) return res.status(401).json({ error: "Unauthorized" });

  // 1. Pull creator context in parallel
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60_000);
  const [userRow, cpRow, trustRow, topicFollowRows, recentPostRows] = await Promise.all([
    db.select({ identityType: usersTable.identityType, hireMeEnabled: usersTable.hireMeEnabled })
      .from(usersTable).where(eq(usersTable.id, viewerId)).limit(1),
    db.select({ skills: creatorProfilesTable.skills })
      .from(creatorProfilesTable).where(eq(creatorProfilesTable.userId, viewerId)).limit(1),
    db.select({ uti: userTrustScoresTable.uti, tier: userTrustScoresTable.tier })
      .from(userTrustScoresTable).where(eq(userTrustScoresTable.userId, viewerId)).limit(1),
    db.select({ topicId: topicFollowsTable.topicId })
      .from(topicFollowsTable).where(eq(topicFollowsTable.userId, viewerId)),
    db.select({ id: postsTable.id })
      .from(postsTable)
      .where(and(eq(postsTable.authorId, viewerId), gte(postsTable.createdAt, thirtyDaysAgo)))
      .limit(10),
  ]);

  // 2. Resolve topic names
  const topicIds = topicFollowRows.map(r => r.topicId);
  const topicNames: string[] = [];
  if (topicIds.length > 0) {
    const topicRows = await db.select({ name: topicsTable.name })
      .from(topicsTable).where(inArray(topicsTable.id, topicIds));
    topicNames.push(...topicRows.map(r => r.name));
  }

  const userSkills: string[] = JSON.parse(cpRow[0]?.skills ?? "[]");
  const identityType = userRow[0]?.identityType ?? null;
  const trustUti = trustRow[0]?.uti ?? 0;
  const trustTier = trustRow[0]?.tier ?? "new";
  const recentPosts = Math.min(recentPostRows.length, 5);

  // 3. Pull active jobs
  const now = new Date();
  const jobs = await db.select().from(jobsTable)
    .where(and(eq(jobsTable.isActive, true), eq(jobsTable.isApproved, true),
      or(isNull(jobsTable.expiresAt), gt(jobsTable.expiresAt, now))))
    .orderBy(desc(jobsTable.createdAt))
    .limit(50);

  // 4. Score and rank
  const scored = jobs
    .map(job => {
      const { score, reasons } = scoreJobForCreator(
        job, userSkills, topicNames, identityType, trustUti, trustTier, recentPosts,
      );
      return { job, score, reasons };
    })
    .filter(r => r.score >= 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const enriched = await Promise.all(scored.map(async r => {
    const enrichedJob = await enrichJob(r.job, viewerId);
    return { ...enrichedJob, matchScore: r.score, matchReasons: r.reasons };
  }));

  return res.json({ matches: enriched });
});

// ── GET /:id/creator-matches — top creators matching a specific job ────────────
router.get("/:id/creator-matches", async (req, res) => {
  const viewerId = getViewerId(req);
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) return res.status(404).json({ error: "Not found" });

  const jobSkillsArr: string[] = JSON.parse(job.skills || "[]");
  const jobText = `${job.title} ${job.description} ${job.category ?? ""} ${jobSkillsArr.join(" ")}`.toLowerCase();

  // Pull all hireable creators
  const hireableUsers = await db.select({
    id: usersTable.id,
    identityType: usersTable.identityType,
  }).from(usersTable).where(eq(usersTable.hireMeEnabled, true)).limit(100);

  const now30 = new Date(Date.now() - 30 * 24 * 60 * 60_000);

  const scored = await Promise.all(hireableUsers.map(async u => {
    const [cpRow, trustRow, topicFollowRows, recentPostRows] = await Promise.all([
      db.select({ skills: creatorProfilesTable.skills })
        .from(creatorProfilesTable).where(eq(creatorProfilesTable.userId, u.id)).limit(1),
      db.select({ uti: userTrustScoresTable.uti, tier: userTrustScoresTable.tier })
        .from(userTrustScoresTable).where(eq(userTrustScoresTable.userId, u.id)).limit(1),
      db.select({ topicId: topicFollowsTable.topicId })
        .from(topicFollowsTable).where(eq(topicFollowsTable.userId, u.id)),
      db.select({ id: postsTable.id })
        .from(postsTable)
        .where(and(eq(postsTable.authorId, u.id), gte(postsTable.createdAt, now30))).limit(5),
    ]);

    const topicIds = topicFollowRows.map(r => r.topicId);
    const topicNames: string[] = [];
    if (topicIds.length > 0) {
      const rows = await db.select({ name: topicsTable.name })
        .from(topicsTable).where(inArray(topicsTable.id, topicIds));
      topicNames.push(...rows.map(r => r.name));
    }

    const creatorSkills: string[] = JSON.parse(cpRow[0]?.skills ?? "[]");
    const { score, reasons } = scoreCreatorForJob(
      jobSkillsArr, jobText, creatorSkills, topicNames,
      u.identityType, trustRow[0]?.uti ?? 0, trustRow[0]?.tier ?? "new",
      Math.min(recentPostRows.length, 5),
    );
    return { userId: u.id, score, reasons };
  }));

  const top = scored.filter(r => r.score >= 10).sort((a, b) => b.score - a.score).slice(0, 8);
  const enriched = await Promise.all(top.map(async r => {
    const user = await getUserWithCounts(r.userId, viewerId);
    return { ...user, matchScore: r.score, matchReasons: r.reasons };
  }));

  return res.json({ creators: enriched.filter(Boolean) });
});

router.get("/creators", async (req, res) => {
  const viewerId = getViewerId(req);
  const limit = Math.min(parseInt(req.query.limit as string) || 12, 50);
  const page = parseInt(req.query.page as string) || 1;

  const creators = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
      bio: usersTable.bio,
    })
    .from(usersTable)
    .where(eq(usersTable.hireMeEnabled, true))
    .limit(limit)
    .offset((page - 1) * limit);

  const enriched = await Promise.all(creators.map(c => getUserWithCounts(c.id, viewerId)));
  return res.json({ creators: enriched.filter(Boolean), total: enriched.length, page });
});

router.get("/:id", async (req, res) => {
  const viewerId = getViewerId(req);
  const id = parseInt(req.params.id);

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) return res.status(404).json({ error: "Job not found" });

  // Fire-and-forget view increment (non-blocking, never crashes the request)
  void db
    .update(jobsTable)
    .set({ viewCount: sql`${jobsTable.viewCount} + 1` })
    .where(eq(jobsTable.id, id))
    .catch(() => undefined);

  const enriched = await enrichJob(job, viewerId);
  return res.json(enriched);
});

router.post("/:id/click", async (req, res) => {
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db
    .update(jobsTable)
    .set({ clickCount: sql`${jobsTable.clickCount} + 1` })
    .where(eq(jobsTable.id, id));
  return res.json({ ok: true });
});

export default router;
