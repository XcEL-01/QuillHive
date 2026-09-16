CREATE TABLE IF NOT EXISTS "boost_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "post_id" integer NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "plan" text NOT NULL,
  "duration_hours" integer NOT NULL,
  "reach_multiplier" real NOT NULL DEFAULT 1,
  "placement_priority" integer NOT NULL DEFAULT 0,
  "targeting" jsonb,
  "status" text NOT NULL DEFAULT 'pending',
  "admin_note" text,
  "reviewed_by" integer REFERENCES "users"("id"),
  "reviewed_at" timestamp,
  "boost_starts_at" timestamp,
  "boost_ends_at" timestamp,
  "stripe_session_id" text,
  "flw_tx_ref" text,
  "flw_transaction_id" text,
  "paid_amount_cents" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "reach_multiplier" real NOT NULL DEFAULT 1;
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "placement_priority" integer NOT NULL DEFAULT 0;
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'pending';
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "boost_starts_at" timestamp;
ALTER TABLE "boost_requests" ADD COLUMN IF NOT EXISTS "boost_ends_at" timestamp;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "boost_requests_flw_tx_ref_unique" ON "boost_requests" ("flw_tx_ref");