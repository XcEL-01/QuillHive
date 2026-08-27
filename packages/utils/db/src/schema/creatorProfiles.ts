import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { z } from "zod";

export const creatorProfilesTable = pgTable("creator_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  skills: text("skills").notNull().default("[]"),
  links: text("links").notNull().default("[]"),
  verified: boolean("verified").notNull().default(false),
  isAvailableForHire: boolean("is_available_for_hire").notNull().default(false),
  availableFor: text("available_for").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCreatorProfileSchema = createInsertSchema(creatorProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatorProfile = typeof creatorProfilesTable.$inferSelect;
export type InsertCreatorProfile = z.infer<typeof insertCreatorProfileSchema>;
