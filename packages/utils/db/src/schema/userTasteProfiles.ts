import { pgTable, serial, integer, real, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { topicsTable } from "./topics";

export const userTopicAffinityTable = pgTable(
  "user_topic_affinity",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id),
    topicId: integer("topic_id").notNull().references(() => topicsTable.id),
    viewCount: integer("view_count").notNull().default(0),
    readDepthTotal: real("read_depth_total").notNull().default(0),
    likeCount: integer("like_count").notNull().default(0),
    saveCount: integer("save_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    affinityScore: real("affinity_score").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqueUserTopic: uniqueIndex("user_topic_affinity_unique").on(t.userId, t.topicId),
    idxAffinityUser: index("idx_user_topic_affinity_user").on(t.userId),
    idxAffinityScore: index("idx_user_topic_affinity_score").on(t.affinityScore),
  }),
);

export const userTasteProfileTable = pgTable("user_taste_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  topTopicIds: text("top_topic_ids").notNull().default("[]"),
  preferredContentTypes: text("preferred_content_types").notNull().default("[]"),
  avgReadDepth: real("avg_read_depth").notNull().default(0),
  avgSessionLength: integer("avg_session_length").notNull().default(0),
  creatorAffinities: text("creator_affinities").notNull().default("{}"),
  diversityScore: real("diversity_score").notNull().default(0.5),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userCreatorAffinityTable = pgTable(
  "user_creator_affinity",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id),
    creatorId: integer("creator_id").notNull().references(() => usersTable.id),
    readCount: integer("read_count").notNull().default(0),
    likeCount: integer("like_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    saveCount: integer("save_count").notNull().default(0),
    affinityScore: real("affinity_score").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqueUserCreator: uniqueIndex("user_creator_affinity_unique").on(t.userId, t.creatorId),
  }),
);

export const creatorSimilarityTable = pgTable(
  "creator_similarity",
  {
    id: serial("id").primaryKey(),
    creatorAId: integer("creator_a_id").notNull().references(() => usersTable.id),
    creatorBId: integer("creator_b_id").notNull().references(() => usersTable.id),
    similarityScore: real("similarity_score").notNull().default(0),
    sharedTopicIds: text("shared_topic_ids").notNull().default("[]"),
    audienceOverlap: real("audience_overlap").notNull().default(0),
    styleScore: real("style_score").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqueCreatorPair: uniqueIndex("creator_similarity_unique").on(t.creatorAId, t.creatorBId),
  }),
);

export type UserTopicAffinity = typeof userTopicAffinityTable.$inferSelect;
export type UserTasteProfile = typeof userTasteProfileTable.$inferSelect;
export type UserCreatorAffinity = typeof userCreatorAffinityTable.$inferSelect;
export type CreatorSimilarity = typeof creatorSimilarityTable.$inferSelect;
