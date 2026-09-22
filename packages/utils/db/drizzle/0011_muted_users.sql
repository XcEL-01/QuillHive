CREATE TABLE IF NOT EXISTS "muted_users" (
  "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "muter_id" integer NOT NULL REFERENCES "users"("id"),
  "muted_id" integer NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "muted_users_muter_id_muted_id_unique" UNIQUE("muter_id", "muted_id")
);
