ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_username_change_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "show_posts_to_everyone" boolean DEFAULT true NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "allow_messages_from_anyone" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_goals" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signup_ip_hash" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_official_account" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notification_prefs" jsonb;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referral_source" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referred_by" integer;