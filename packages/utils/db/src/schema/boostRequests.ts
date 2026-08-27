import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { postsTable } from "./posts";

export const boostRequestsTable = pgTable("boost_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  plan: text("plan").notNull(),
  durationHours: integer("duration_hours").notNull(),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  reviewedBy: integer("reviewed_by").references(() => usersTable.id),
  reviewedAt: timestamp("reviewed_at"),
  boostStartsAt: timestamp("boost_starts_at"),
  boostEndsAt: timestamp("boost_ends_at"),
  stripeSessionId: text("stripe_session_id"),
  paidAmountCents: integer("paid_amount_cents"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BoostRequest = typeof boostRequestsTable.$inferSelect;
