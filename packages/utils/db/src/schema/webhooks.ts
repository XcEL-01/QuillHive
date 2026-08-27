import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const webhooksTable = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: text("events").notNull().default("[]"),
  isActive: boolean("is_active").notNull().default(true),
  failureCount: integer("failure_count").notNull().default(0),
  lastDeliveryAt: timestamp("last_delivery_at"),
  lastSuccessAt: timestamp("last_success_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookDeliveriesTable = pgTable("webhook_deliveries", {
  id: serial("id").primaryKey(),
  webhookId: integer("webhook_id").notNull().references(() => webhooksTable.id),
  eventType: text("event_type").notNull(),
  payload: text("payload").notNull(),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
  succeeded: boolean("succeeded").notNull().default(false),
});

export const insertWebhookSchema = createInsertSchema(webhooksTable).omit({
  id: true,
  createdAt: true,
  lastDeliveryAt: true,
  lastSuccessAt: true,
  failureCount: true,
  secret: true,
});
export type Webhook = typeof webhooksTable.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveriesTable.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
