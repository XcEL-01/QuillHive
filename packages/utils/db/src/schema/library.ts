import {
  pgTable, serial, text, integer, boolean, timestamp,
  index, uniqueIndex, jsonb,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const LIBRARY_CATEGORIES = [
  "writing_literature",
  "science_research",
  "technology_code",
  "business_strategy",
  "art_design",
  "music_audio",
  "film_motion",
  "philosophy_ideas",
  "history_culture",
  "education_learning",
  "health_wellbeing",
  "environment_nature",
  "law_society",
  "language_communication",
  "open_reference",
] as const;

export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number];

export const libraryEntriesTable = pgTable(
  "library_entries",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    authorId: integer("author_id")
      .notNull()
      .references(() => usersTable.id),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    body: text("body"),
    category: text("category").notNull().default("open_reference"),
    tags: jsonb("tags").default([]).notNull(),
    contentType: text("content_type").notNull().default("article"),
    mediaUrl: text("media_url"),
    thumbnailUrl: text("thumbnail_url"),
    externalUrl: text("external_url"),
    license: text("license").notNull().default("cc_by"),
    isPublic: boolean("is_public").notNull().default(true),
    isApproved: boolean("is_approved").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    viewCount: integer("view_count").notNull().default(0),
    saveCount: integer("save_count").notNull().default(0),
    downloadCount: integer("download_count").notNull().default(0),
    schemaType: text("schema_type").notNull().default("Article"),
    publishedAt: timestamp("published_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_library_author").on(t.authorId),
    index("idx_library_category").on(t.category),
    index("idx_library_public").on(t.isPublic),
    index("idx_library_featured").on(t.isFeatured),
    uniqueIndex("idx_library_slug").on(t.slug),
  ],
);

export const librarySavesTable = pgTable(
  "library_saves",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id),
    entryId: integer("entry_id")
      .notNull()
      .references(() => libraryEntriesTable.id, { onDelete: "cascade" }),
    savedAt: timestamp("saved_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("idx_library_saves_unique").on(t.userId, t.entryId),
  ],
);

export type LibraryEntry = typeof libraryEntriesTable.$inferSelect;
export type LibraryEntryInsert = typeof libraryEntriesTable.$inferInsert;
export type LibrarySave = typeof librarySavesTable.$inferSelect;
