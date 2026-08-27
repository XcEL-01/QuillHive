import { integer, pgTable, serial, timestamp } from 'drizzle-orm/pg-core';
import { usersTable } from './users';
import { postsTable } from './posts';

export const mentionsTable = pgTable('mentions', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').references(() => postsTable.id, { onDelete: 'cascade' }),
  mentionedUserId: integer('mentioned_user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  mentioningUserId: integer('mentioning_user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
