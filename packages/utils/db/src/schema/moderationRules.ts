import { pgTable, text, serial, timestamp, integer, boolean, real } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const moderationRulesTable = pgTable("moderation_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  triggerType: text("trigger_type").notNull(),
  thresholdValue: real("threshold_value").notNull(),
  windowMinutes: integer("window_minutes").notNull().default(60),
  action: text("action").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ModerationRule = typeof moderationRulesTable.$inferSelect;
