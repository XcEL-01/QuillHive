import { describe, expect, it } from "vitest";
import { calculateRankingScore } from "../features/posts/ranking.service";

const post = { content: "A sufficiently substantial post for ranking." };

describe("calculateRankingScore", () => {
  it("gives high-trust authors a permanent advantage", () => {
    const normal = calculateRankingScore({ author: {}, post, engagementScore: 20 });
    const official = calculateRankingScore({ author: { isOfficialAccount: true }, post, engagementScore: 20 });

    expect(official).toBeGreaterThanOrEqual(normal * 4);
  });

  it("applies active boost reach and placement, while an absent boost has no effect", () => {
    const baseline = calculateRankingScore({ author: {}, post, engagementScore: 20 });
    const boosted = calculateRankingScore({
      author: {},
      post,
      engagementScore: 20,
      activeBoost: { reachMultiplier: 3.5, placementPriority: 30 },
    });
    const expired = calculateRankingScore({ author: {}, post, engagementScore: 20, activeBoost: null });

    expect(boosted).toBeGreaterThan(baseline);
    expect(expired).toBe(baseline);
  });
});