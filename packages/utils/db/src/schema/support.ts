import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { uploadedFilesTable } from "./files";

export const supportTicketsTable = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  subject: text("subject").notNull(),
  category: text("category").notNull().default("general"),
  severity: text("severity").notNull().default("normal"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const supportMessagesTable = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTicketsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  message: text("message").notNull(),
  fileId: integer("file_id").references(() => uploadedFilesTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const safetyPreferencesTable = pgTable("safety_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  mutedWords: text("muted_words").notNull().default("[]"),
  blockedUserIds: text("blocked_user_ids").notNull().default("[]"),
  contentFilter: text("content_filter").notNull().default("standard"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SupportTicket = typeof supportTicketsTable.$inferSelect;
export type SupportMessage = typeof supportMessagesTable.$inferSelect;