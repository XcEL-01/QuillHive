import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const featuredSlotsTable = pgTable("featured_slots", {
  id: serial("id").primaryKey(),
  slotKey: text("slot_key").notNull().unique(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  title: text("title"),
  description: text("description"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  isActive: boolean("is_active").notNull().default(true),
  assignedBy: integer("assigned_by").references(() => usersTable.id),
  startsAt: timestamp("starts_at").defaultNow().notNull(),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FeaturedSlot = typeof featuredSlotsTable.$inferSelect;
