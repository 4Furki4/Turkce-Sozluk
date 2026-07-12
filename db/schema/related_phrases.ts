import { date, index, integer, pgTable } from "drizzle-orm/pg-core";
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
  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at"),
}, (t) => [
  index("related_phrases_phrase_id_idx").on(t.wordId),
  index("related_phrases_related_phrase_id_idx").on(t.relatedPhraseId),
]);
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
