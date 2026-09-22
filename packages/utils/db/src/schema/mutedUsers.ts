import { pgTable, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const mutedUsersTable = pgTable("muted_users", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  muterId: integer("muter_id").notNull().references(() => usersTable.id),
  mutedId: integer("muted_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueMute: unique().on(table.muterId, table.mutedId),
}));
