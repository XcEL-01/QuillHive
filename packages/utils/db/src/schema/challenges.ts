import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { postsTable } from "./posts";

export const challengesTable = pgTable("challenges", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  description: text("description"),
  type: text("type").notNull().default("open"),
  wordLimit: integer("word_limit"),
  startsAt: timestamp("starts_at").defaultNow().notNull(),
  endsAt: timestamp("ends_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdBy: integer("created_by").notNull().references(() => usersTable.id),
  submissionCount: integer("submission_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const challengeSubmissionsTable = pgTable("challenge_submissions", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id").notNull().references(() => challengesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  postId: integer("post_id").references(() => postsTable.id, { onDelete: "set null" }),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export type Challenge = typeof challengesTable.$inferSelect;
export type ChallengeSubmission = typeof challengeSubmissionsTable.$inferSelect;
