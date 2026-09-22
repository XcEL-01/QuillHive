ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signup_ip_hash" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signup_user_agent" text;