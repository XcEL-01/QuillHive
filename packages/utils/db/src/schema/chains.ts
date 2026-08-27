import { pgTable, serial, integer, text, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";
import { postsTable } from "./posts";

export const chainsTable = pgTable(
  "chains",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    creatorId: integer("creator_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    prompt: text("prompt"),
    maxEntries: integer("max_entries").default(10),
    isComplete: boolean("is_complete").default(false),
    isPublic: boolean("is_public").default(true),
    coverImage: text("cover_image"),
    category: text("category"),
    totalViews: integer("total_views").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    idxChainCreator: index("idx_chains_creator_id").on(t.creatorId),
    idxChainPublic: index("idx_chains_is_public").on(t.isPublic),
    idxChainComplete: index("idx_chains_is_complete").on(t.isComplete),
  }),
);

export const chainEntriesTable = pgTable(
  "chain_entries",
  {
    id: serial("id").primaryKey(),
    chainId: integer("chain_id").notNull().references(() => chainsTable.id, { onDelete: "cascade" }),
    postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
    authorId: integer("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqueChainPost: uniqueIndex("chain_entries_chain_post_idx").on(t.chainId, t.postId),
    idxChainEntriesChain: index("idx_chain_entries_chain_id").on(t.chainId),
    idxChainEntriesAuthor: index("idx_chain_entries_author_id").on(t.authorId),
  }),
);

export const insertChainSchema = createInsertSchema(chainsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalViews: true,
  isComplete: true,
});

export type Chain = typeof chainsTable.$inferSelect;
export type ChainEntry = typeof chainEntriesTable.$inferSelect;
export type InsertChain = z.infer<typeof insertChainSchema>;
