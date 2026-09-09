CREATE TABLE "collaboration_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"created_by_id" integer NOT NULL,
	"title" text NOT NULL,
	"brief" text DEFAULT '' NOT NULL,
	"split_suggestion" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collaboration_rooms" ADD CONSTRAINT "collaboration_rooms_request_id_collaboration_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "collaboration_requests"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "collaboration_rooms" ADD CONSTRAINT "collaboration_rooms_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "users"("id");
--> statement-breakpoint
CREATE UNIQUE INDEX "collaboration_rooms_request_unique" ON "collaboration_rooms" USING btree ("request_id");