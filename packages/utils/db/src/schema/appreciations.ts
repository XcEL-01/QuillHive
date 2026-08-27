import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { usersTable } from './users';
import { postsTable } from './posts';

export const appreciations = pgTable('appreciations', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: integer('post_id').notNull().references(() => postsTable.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // inspiring, beautiful, insightful, brave, masterpiece, helpful, energizing, heartfelt
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const appreciationsTable = appreciations;
