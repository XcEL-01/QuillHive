import { pgTable, text, serial, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const achievementsTable = pgTable(
  "achievements",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull().default("Award"),
    category: text("category").notNull().default("milestone"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    keyUnique: uniqueIndex("achievements_key_unique").on(table.key),
  }),
);

export const userAchievementsTable = pgTable(
  "user_achievements",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id),
    achievementId: integer("achievement_id").notNull().references(() => achievementsTable.id),
    unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  },
  (table) => ({
    userAchievementUnique: uniqueIndex("user_achievements_user_achievement_unique").on(table.userId, table.achievementId),
  }),
);

export type AchievementRow = typeof achievementsTable.$inferSelect;
export type UserAchievementRow = typeof userAchievementsTable.$inferSelect;
