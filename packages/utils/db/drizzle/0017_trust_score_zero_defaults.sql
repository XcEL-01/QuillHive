ALTER TABLE "user_trust_scores" ALTER COLUMN "cvs" SET DEFAULT 0;
ALTER TABLE "user_trust_scores" ALTER COLUMN "bcs" SET DEFAULT 0;
ALTER TABLE "user_trust_scores" ALTER COLUMN "cts" SET DEFAULT 0;
ALTER TABLE "user_trust_scores" ALTER COLUMN "avg_cis" SET DEFAULT 0;
ALTER TABLE "user_trust_scores" ALTER COLUMN "uti" SET DEFAULT 0;
ALTER TABLE "user_trust_scores" ALTER COLUMN "visibility_multiplier" SET DEFAULT 0.3;
ALTER TABLE "user_trust_scores" ALTER COLUMN "tier" SET DEFAULT 'restricted';

UPDATE "user_trust_scores" AS scores
SET "cvs" = 0,
    "bcs" = 0,
    "cts" = 0,
    "avg_cis" = 0,
    "uti" = 0,
    "visibility_multiplier" = 0.3,
    "tier" = 'restricted',
    "creator_level" = 'new_voice',
    "updated_at" = NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM "posts" AS posts
  WHERE posts."author_id" = scores."user_id"
    AND posts."is_published" = true
    AND posts."is_deleted" = false
);