import {
  pgTable,
  serial,
  varchar,
  date,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { InferInsertModel, InferSelectModel, relations, sql } from "drizzle-orm";
import { SelectMeaning, meanings } from "./meanings";
import { pronunciations } from "./pronunciations";
import { savedWords } from "./saved_words";
import { roots } from "./roots";
import { wordSources } from "./word_sources";

export const words = pgTable("words", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phonetic: varchar("phonetic", { length: 255 }),
  rootId: integer("root_id"),
  created_at: date("created_at").defaultNow(),
  updated_at: date("updated_at"),
  prefix: varchar("prefix", { length: 255 }),
  suffix: varchar("suffix", { length: 255 }),
  viewCount: integer("view_count").default(0),
  variant: integer("variant").default(0),
  requestType: varchar("request_type", { length: 255 }).default("word"),
  sourceId: integer("source_id").references(() => wordSources.id),
}, (t) => [
  index("name_idx").using('gin', sql`name gin_trgm_ops`)
]);

export const wordsRelations = relations(words, ({ many, one }) => ({
  meanings: many(meanings),
  saved_words: many(savedWords),
  pronounciations: many(pronunciations),
  root: one(roots, {
    fields: [words.rootId],
    references: [roots.id],
  }),
  source: one(wordSources, {
    fields: [words.sourceId],
    references: [wordSources.id],
  }),
}));

export type SelectWordWithMeanings = InferSelectModel<typeof words> & {
  meanings: SelectMeaning[];
};
export type SelectWord = InferSelectModel<typeof words>;

export type InsertWord = InferInsertModel<typeof words>;
