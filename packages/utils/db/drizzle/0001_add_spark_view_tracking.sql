ALTER TABLE "posts" ADD COLUMN "viewed_by" jsonb DEFAULT '[]'::jsonb;
