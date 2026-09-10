# High-trust ranking

QuillHive uses the existing account signals for permanent distribution preference:

- `users.isOfficialAccount = true`
- `users.role = "super_admin"`
- `user_trust_scores.tier = "trusted"`
- `user_trust_scores.creatorLevel` of `established`, `featured`, or `luminary`

Eligible posts from these accounts receive a **4.0x permanent author multiplier** in the shared post feed, the main home/trending scorer, topic feeds, and similar-post recommendations. Eligibility requires at least 20 non-whitespace content characters, a title, an excerpt, or an image, so empty or near-empty posts do not receive the multiplier. Published/deleted/blocked-post filters remain in force.

The existing official-post preference remains separate: it is **1.2x** in the shared post-feed scorer (up to **1.3x** with post priority) and **4.0x** in the main home/trending scorer. Active paid boosts remain multiplicative on top of the permanent author multiplier. This means an eligible official-account post with an active boost receives both advantages rather than one replacing the other.

Changed files:

- `apps/api/src/features/posts/ranking.service.ts`
- `apps/api/src/features/posts/post.service.ts`
- `apps/api/src/features/posts/post.controller.ts`
- `apps/api/src/features/topics/topics.routes.ts`
- `apps/api/src/features/discovery/recommendations.service.ts`
- `apps/api/src/features/profiles/profile.service.ts`
- `apps/web/src/components/post/PostCard.tsx`