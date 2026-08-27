import { pgTable, serial, integer, text, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";
import { postsTable } from "./posts";

export const pollsTable = pgTable("polls", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  allowMultiple: boolean("allow_multiple").notNull().default(false),
  closesAt: timestamp("closes_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pollOptionsTable = pgTable("poll_options", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull().references(() => pollsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  position: integer("position").notNull().default(0),
  voteCount: integer("vote_count").notNull().default(0),
});

export const pollVotesTable = pgTable(
  "poll_votes",
  {
    id: serial("id").primaryKey(),
    pollId: integer("poll_id").notNull().references(() => pollsTable.id, { onDelete: "cascade" }),
    optionId: integer("option_id").notNull().references(() => pollOptionsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqPollUserOption: uniqueIndex("poll_votes_unique_idx").on(t.pollId, t.userId, t.optionId),
  }),
);

export const insertPollSchema = createInsertSchema(pollsTable).omit({ id: true, createdAt: true });
export const insertPollOptionSchema = createInsertSchema(pollOptionsTable).omit({ id: true, voteCount: true });

export type Poll = typeof pollsTable.$inferSelect;
export type PollOption = typeof pollOptionsTable.$inferSelect;
export type PollVote = typeof pollVotesTable.$inferSelect;
export type InsertPoll = z.infer<typeof insertPollSchema>;
