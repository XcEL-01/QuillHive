ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "privacy" text NOT NULL DEFAULT 'open';
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "rules" text;
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "is_verified" boolean NOT NULL DEFAULT false;
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "is_promoted" boolean NOT NULL DEFAULT false;
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "promoted_until" timestamp;

ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "company_name" text;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "apply_url" text;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "apply_email" text;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "is_approved" boolean NOT NULL DEFAULT true;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "moderation_status" text NOT NULL DEFAULT 'published';
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "is_featured" boolean NOT NULL DEFAULT false;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "featured_until" timestamp;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "view_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "click_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "category" text;