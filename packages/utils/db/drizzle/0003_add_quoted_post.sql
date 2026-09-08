ALTER TABLE "posts" ADD COLUMN "quoted_post_id" integer;
ALTER TABLE "posts" ADD CONSTRAINT "posts_quoted_post_id_posts_id_fk" FOREIGN KEY ("quoted_post_id") REFERENCES "posts"("id");