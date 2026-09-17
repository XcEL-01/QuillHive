import { pgTable, text, serial, timestamp, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";
import { postsTable } from "./posts";

export const groupsTable = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  category: text("category").notNull().default("general"),
  creatorId: integer("creator_id").notNull().references(() => usersTable.id),
  privacy: text("privacy").notNull().default("open"),
  rules: text("rules"),
  isVerified: boolean("is_verified").notNull().default(false),
  isPromoted: boolean("is_promoted").notNull().default(false),
  promotedUntil: timestamp("promoted_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMembersTable = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (t) => ({
  memberUnique: uniqueIndex("group_members_group_user_unique").on(t.groupId, t.userId),
}));

export const groupJoinRequestsTable = pgTable("group_join_requests", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  reviewedBy: integer("reviewed_by").references(() => usersTable.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  requestUnique: uniqueIndex("group_join_requests_group_user_unique").on(t.groupId, t.userId),
}));

export const groupBansTable = pgTable("group_bans", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  bannedBy: integer("banned_by").notNull().references(() => usersTable.id),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  banUnique: uniqueIndex("group_bans_group_user_unique").on(t.groupId, t.userId),
}));

export const groupPinnedPostsTable = pgTable("group_pinned_posts", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  pinnedBy: integer("pinned_by").notNull().references(() => usersTable.id),
  pinnedAt: timestamp("pinned_at").defaultNow().notNull(),
});

export const insertGroupSchema = createInsertSchema(groupsTable).omit({ id: true, createdAt: true });
export const insertGroupMemberSchema = createInsertSchema(groupMembersTable).omit({ id: true, joinedAt: true });

export type Group = typeof groupsTable.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type GroupMember = typeof groupMembersTable.$inferSelect;
export type GroupJoinRequest = typeof groupJoinRequestsTable.$inferSelect;
export type GroupBan = typeof groupBansTable.$inferSelect;
export type GroupPinnedPost = typeof groupPinnedPostsTable.$inferSelect;
