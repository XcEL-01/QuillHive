import { pgTable, text, serial, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { postsTable } from "./posts";

export const topicsTable = pgTable("topics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  iconName: text("icon_name"),
  postCount: integer("post_count").notNull().default(0),
  followerCount: integer("follower_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const topicFollowsTable = pgTable("topic_follows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  topicId: integer("topic_id").notNull().references(() => topicsTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique().on(t.userId, t.topicId)]);

export const postTopicsTable = pgTable("post_topics", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id),
  topicId: integer("topic_id").notNull().references(() => topicsTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique().on(t.postId, t.topicId)]);

export const DEFAULT_TOPICS = [
  { name: "Writing", slug: "writing", iconName: "pen-line", description: "The craft and world of writing" },
  { name: "Poetry", slug: "poetry", iconName: "feather", description: "Verse, rhyme, and lyrical expression" },
  { name: "Fiction", slug: "fiction", iconName: "book-open", description: "Stories, novels, and imagined worlds" },
  { name: "Non-Fiction", slug: "non-fiction", iconName: "book", description: "Essays, memoir, and true stories" },
  { name: "Art", slug: "art", iconName: "palette", description: "Visual arts and creative expression" },
  { name: "Photography", slug: "photography", iconName: "camera", description: "The world through a lens" },
  { name: "Music", slug: "music", iconName: "music", description: "Sound, rhythm, and melody" },
  { name: "Film", slug: "film", iconName: "film", description: "Cinema and moving image" },
  { name: "Design", slug: "design", iconName: "layers", description: "Form, function, and aesthetics" },
  { name: "Technology", slug: "technology", iconName: "cpu", description: "Innovation and the digital world" },
  { name: "Science", slug: "science", iconName: "microscope", description: "Discovery and understanding" },
  { name: "Philosophy", slug: "philosophy", iconName: "brain", description: "Ideas, ethics, and meaning" },
  { name: "History", slug: "history", iconName: "scroll", description: "The past and its lessons" },
  { name: "Travel", slug: "travel", iconName: "map-pin", description: "Journeys and new perspectives" },
  { name: "Food", slug: "food", iconName: "utensils", description: "Culinary arts and culture" },
  { name: "Wellness", slug: "wellness", iconName: "heart", description: "Health, mindfulness, and living well" },
  { name: "Business", slug: "business", iconName: "briefcase", description: "Entrepreneurship and commerce" },
  { name: "Education", slug: "education", iconName: "graduation-cap", description: "Learning and knowledge sharing" },
  { name: "Culture", slug: "culture", iconName: "globe", description: "Society, identity, and expression" },
  { name: "Gaming", slug: "gaming", iconName: "gamepad-2", description: "Interactive entertainment and gaming culture" },
];

export type Topic = typeof topicsTable.$inferSelect;
export type TopicFollow = typeof topicFollowsTable.$inferSelect;
export type PostTopic = typeof postTopicsTable.$inferSelect;
