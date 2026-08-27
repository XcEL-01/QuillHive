import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { postsTable } from "./posts";

export const postFingerprintsTable = pgTable(
  "post_fingerprints",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
    shingle: text("shingle").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    shingleIdx: index("post_fingerprints_shingle_idx").on(t.shingle),
    postIdx: index("post_fingerprints_post_idx").on(t.postId),
  }),
);

export type PostFingerprint = typeof postFingerprintsTable.$inferSelect;
