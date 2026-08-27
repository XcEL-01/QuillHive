import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const uploadedFilesTable = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").references(() => usersTable.id),
  originalName: text("original_name").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  category: text("category").notNull().default("general"),
  moderationStatus: text("moderation_status").notNull().default("approved"),
  thumbnailPath: text("thumbnail_path"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UploadedFile = typeof uploadedFilesTable.$inferSelect;