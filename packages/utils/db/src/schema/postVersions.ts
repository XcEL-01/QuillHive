import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";
import { postsTable } from "./posts";

export const postVersionsTable = pgTable("post_versions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  editorId: integer("editor_id").notNull().references(() => usersTable.id),
  title: text("title"),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPostVersionSchema = createInsertSchema(postVersionsTable).omit({ id: true, createdAt: true });

export type PostVersion = typeof postVersionsTable.$inferSelect;
export type InsertPostVersion = z.infer<typeof insertPostVersionSchema>;
