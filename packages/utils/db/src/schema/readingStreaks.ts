import { pgTable, serial, integer, text, timestamp, date, index, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const readingStreaksTable = pgTable("reading_streaks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastReadDate: date("last_read_date"),
  totalDaysRead: integer("total_days_read").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({ userIdx: uniqueIndex("reading_streaks_user_idx").on(t.userId) }));

export const readingActivityTable = pgTable("reading_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  postId: integer("post_id").notNull(),
  readDate: date("read_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userDateIdx: index("reading_activity_user_date_idx").on(t.userId, t.readDate),
}));

export type ReadingStreak = typeof readingStreaksTable.$inferSelect;
export type ReadingActivity = typeof readingActivityTable.$inferSelect;
