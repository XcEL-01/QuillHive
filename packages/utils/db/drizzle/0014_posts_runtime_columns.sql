-- Keep production databases aligned with the columns used by the posts schema.
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "share_click_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "viewed_by" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "is_sponsored" boolean NOT NULL DEFAULT false;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "sponsor_name" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "sponsor_logo_url" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "sponsor_url" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "is_official_post" boolean NOT NULL DEFAULT false;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "post_category" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "official_post_priority" integer NOT NULL DEFAULT 0;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "cta_buttons" jsonb;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "official_target_audience" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "official_language" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "challenge_hashtag" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "challenge_ends_at" timestamp;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "challenge_reward_text" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "featured_creator_id" integer;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "quoted_post_id" integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_quoted_post_id_posts_id_fk'
  ) THEN
    ALTER TABLE "posts"
      ADD CONSTRAINT "posts_quoted_post_id_posts_id_fk"
      FOREIGN KEY ("quoted_post_id") REFERENCES "posts"("id");
  END IF;
END $$;

ALTER TABLE "post_shares" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "post_shares" ADD COLUMN IF NOT EXISTS "source" text;
ALTER TABLE "post_shares" ADD COLUMN IF NOT EXISTS "click_count" integer NOT NULL DEFAULT 0;