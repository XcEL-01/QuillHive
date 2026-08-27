import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { postsTable } from "./posts";

export const writingStreaksTable = pgTable("writing_streaks", {
  userId: integer("user_id").primaryKey().references(() => usersTable.id),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastWriteDate: text("last_write_date"),
  totalDaysWritten: integer("total_days_written").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const writingActivityTable = pgTable(
  "writing_activity",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id),
    postId: integer("post_id").notNull().references(() => postsTable.id),
    writeDate: text("write_date").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userPostDateUnique: uniqueIndex("writing_activity_user_post_date_unique").on(
      table.userId,
      table.postId,
      table.writeDate,
    ),
  }),
);

export type WritingStreakRow = typeof writingStreaksTable.$inferSelect;
export type WritingActivityRow = typeof writingActivityTable.$inferSelect;
