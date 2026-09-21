import { pgTable, serial, integer, text, timestamp, real, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { postsTable } from "./posts";

export const boostRequestsTable = pgTable("boost_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  plan: text("plan").notNull(),
  durationHours: integer("duration_hours").notNull(),
  reachMultiplier: real("reach_multiplier").notNull().default(1),
  placementPriority: integer("placement_priority").notNull().default(0),
  targeting: jsonb("targeting").$type<Record<string, unknown> | null>(),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  grantedByAdminId: integer("granted_by_admin_id").references(() => usersTable.id),
  reviewedBy: integer("reviewed_by").references(() => usersTable.id),
  reviewedAt: timestamp("reviewed_at"),
  boostStartsAt: timestamp("boost_starts_at"),
  boostEndsAt: timestamp("boost_ends_at"),
  stripeSessionId: text("stripe_session_id"),
  flwTxRef: text("flw_tx_ref"),
  flwTransactionId: text("flw_transaction_id"),
  paidAmountCents: integer("paid_amount_cents"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  transactionRefUnique: uniqueIndex("boost_requests_flw_tx_ref_unique").on(t.flwTxRef),
}));

export type BoostRequest = typeof boostRequestsTable.$inferSelect;
