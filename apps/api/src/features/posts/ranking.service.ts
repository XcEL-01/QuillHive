export const HIGH_TRUST_AUTHOR_MULTIPLIER = 4;

const HIGH_TRUST_CREATOR_LEVELS = new Set(["established", "featured", "luminary"]);

export interface AuthorRankingSignals {
  isOfficialAccount?: boolean | null;
  role?: string | null;
  tier?: string | null;
  creatorLevel?: string | null;
}

export function isHighTrustAuthor(author: AuthorRankingSignals): boolean {
  return Boolean(author.isOfficialAccount) ||
    author.role === "super_admin" ||
    author.tier === "trusted" ||
    HIGH_TRUST_CREATOR_LEVELS.has(author.creatorLevel ?? "");
}

/** Permanent preference with a basic quality floor for empty or near-empty posts. */
export function getHighTrustAuthorMultiplier(
  author: AuthorRankingSignals,
  post: { content?: string | null; title?: string | null; excerpt?: string | null; imageUrl?: string | null },
): number {
  if (!isHighTrustAuthor(author)) return 1;
  const hasBasicQuality = Boolean(
    (post.content?.trim().length ?? 0) >= 20 ||
    post.title?.trim() ||
    post.excerpt?.trim() ||
    post.imageUrl,
  );
  return hasBasicQuality ? HIGH_TRUST_AUTHOR_MULTIPLIER : 1;
}