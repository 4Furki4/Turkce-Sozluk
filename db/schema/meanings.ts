import {
  date,
  integer,
  index,
  pgTable,
  serial,
  text,
  varchar,
} from "drizzle-orm/pg-core";
import { words } from "./words";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import { partOfSpeechs } from "./part_of_speechs";
import { meaningsAttributes } from "./meaning_attributes";
import { examples } from "./examples";

export const meanings = pgTable("meanings", {
  id: serial("id").primaryKey(),
  meaning: text("meaning").notNull(),
  wordId: integer("word_id")
    .notNull()
    .references(() => words.id, {
      onDelete: "cascade",
    }),
  imageUrl: varchar("imageUrl", { length: 255 }),
  order: integer("order").notNull().default(1),
  partOfSpeechId: integer("part_of_speech_id")
    .references(() => partOfSpeechs.id),
  requestType: varchar("request_type", { length: 255 }).default("meaning"),
  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at"),
}, (table) => [
  index("meanings_word_id_id_idx").on(table.wordId, table.id),
]);

export const meaningsRelations = relations(meanings, ({ one, many }) => ({
  word: one(words, {
    fields: [meanings.wordId],
    references: [words.id],
  }),
  partOfSpeech: one(partOfSpeechs, {
    fields: [meanings.partOfSpeechId],
    references: [partOfSpeechs.id],
  }),
  attributes: many(meaningsAttributes),
  examples: many(examples),
}));

export type SelectMeaning = InferSelectModel<typeof meanings>;

export type InsertMeaning = InferInsertModel<typeof meanings>;
