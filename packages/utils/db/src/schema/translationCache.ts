import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const translationCacheTable = pgTable('translation_cache', {
  id: serial('id').primaryKey(),
  originalHash: text('original_hash').notNull(),
  sourceLang: text('source_lang').notNull().default('en'),
  targetLang: text('target_lang').notNull(),
  translatedText: text('translated_text').notNull(),
  hitCount: integer('hit_count').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
