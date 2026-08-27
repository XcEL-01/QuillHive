import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { postsTable } from "./posts";
import { usersTable } from "./users";

export const postViewsTable = pgTable("post_views", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id),
  viewerId: integer("viewer_id").references(() => usersTable.id),
  ipHash: text("ip_hash").notNull(),
  userAgent: text("user_agent"),
  country: text("country"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PostView = typeof postViewsTable.$inferSelect;