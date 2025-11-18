// db/schema/daily_words.ts
import { pgTable, serial, integer, date, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { words } from "./words";

export const dailyWords = pgTable("daily_words", {
    id: serial("id").primaryKey(),
    wordId: integer("word_id").references(() => words.id).notNull(),
    date: date("date").notNull().unique(), // Ensures only one word per day
}, (t) => [
    index("date_idx").on(t.date),
]);

export const dailyWordsRelations = relations(dailyWords, ({ one }) => ({
    word: one(words, {
        fields: [dailyWords.wordId],
        references: [words.id],
    }),
}));        