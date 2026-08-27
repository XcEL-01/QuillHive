import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const profileViewsTable = pgTable("profile_views", {
  id: serial("id").primaryKey(),
  profileUserId: integer("profile_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  viewerUserId: integer("viewer_user_id")
    .references(() => usersTable.id, { onDelete: "set null" }),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
});
