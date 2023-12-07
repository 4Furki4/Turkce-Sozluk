import { integer, pgTable } from "drizzle-orm/pg-core";
import { words } from "./words";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";

export const relatedPhrases = pgTable("related_phrases", {
  wordId: integer("phrase_id")
    .notNull()
    .references(() => words.id, {
      onDelete: "cascade",
    }),
  relatedPhraseId: integer("related_phrase_id")
    .notNull()
    .references(() => words.id, {
      onDelete: "cascade",
    }),
});
export const relatedWordsToWordsRelations = relations(
  relatedPhrases,
  ({ one }) => ({
    word: one(words, {
      fields: [relatedPhrases.wordId],
      references: [words.id],
    }),
    relatedPhrase: one(words, {
      fields: [relatedPhrases.relatedPhraseId],
      references: [words.id],
    }),
  })
);

export type SelectRelatedPhrase = InferSelectModel<typeof relatedPhrases>;

export type InsertRelatedPhrase = InferInsertModel<typeof relatedPhrases>;
