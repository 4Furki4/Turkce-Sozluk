import { date, index, integer, pgTable, primaryKey, text, varchar } from "drizzle-orm/pg-core";
import { words } from "./words";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import { users } from "./users";

export const relatedWords = pgTable("related_words", {
  wordId: integer("word_id")
    .notNull()
    .references(() => words.id, {
      onDelete: "cascade",
    }),
  relatedWordId: integer("related_word_id")
    .notNull()
    .references(() => words.id, {
      onDelete: "cascade",
    }),
  relationType: varchar("relation_type", { length: 255 }).default("relatedWord"), // relatedWord, antonym, synonym, correction, compound, see_also, turkish_equivalent, obsolete
  requestType: varchar("request_type", { length: 255 }).default("relatedWord"),
  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at"),
  userId: text("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
}, (t) => [
  primaryKey({ columns: [t.wordId, t.relatedWordId] }),
  index("related_words_related_word_id_idx").on(t.relatedWordId),
]
);
export const relatedWordsToWordsRelations = relations(
  relatedWords,
  ({ one }) => ({
    word: one(words, {
      fields: [relatedWords.wordId],
      references: [words.id],
    }),
    relatedWord: one(words, {
      fields: [relatedWords.relatedWordId],
      references: [words.id],
    }),
    user: one(users, {
      fields: [relatedWords.userId],
      references: [users.id],
    }),
  })
);

export type SelectRelatedWord = InferSelectModel<typeof relatedWords>;

export type InsertRelatedWord = InferInsertModel<typeof relatedWords>;
