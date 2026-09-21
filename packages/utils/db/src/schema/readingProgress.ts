import { pgTable, serial, integer, real, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";
import { postsTable } from "./posts";

export const readingProgressTable = pgTable(
  "reading_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
    percent: real("percent").notNull().default(0),
    readTimeMs: integer("read_time_ms").notNull().default(0),
    lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqUserPost: uniqueIndex("reading_progress_user_post_idx").on(t.userId, t.postId),
  }),
);

export const insertReadingProgressSchema = createInsertSchema(readingProgressTable).omit({
  id: true,
  createdAt: true,
});

export type ReadingProgress = typeof readingProgressTable.$inferSelect;
export type InsertReadingProgress = z.infer<typeof insertReadingProgressSchema>;
