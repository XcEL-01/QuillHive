import { jsonb, pgTable, serial, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { collaborationRequestsTable } from "./collaborationRequests";
import { usersTable } from "./users";
import { z } from "zod";

export const collaborationRoomsTable = pgTable("collaboration_rooms", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => collaborationRequestsTable.id, { onDelete: "cascade" }),
  createdById: integer("created_by_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  brief: text("brief").notNull().default(""),
  splitSuggestion: jsonb("split_suggestion").$type<Record<string, number>>().notNull().default({}),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  requestUnique: uniqueIndex("collaboration_rooms_request_unique").on(table.requestId),
}));

export const insertCollaborationRoomSchema = createInsertSchema(collaborationRoomsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CollaborationRoom = typeof collaborationRoomsTable.$inferSelect;
export type InsertCollaborationRoom = z.infer<typeof insertCollaborationRoomSchema>;