import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const incomeLogsTable = pgTable("income_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  source: text("source").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertIncomeLogSchema = createInsertSchema(incomeLogsTable).omit({ id: true, createdAt: true });

export type IncomeLog = typeof incomeLogsTable.$inferSelect;
export type InsertIncomeLog = z.infer<typeof insertIncomeLogSchema>;
