ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "group_count" integer DEFAULT 1;