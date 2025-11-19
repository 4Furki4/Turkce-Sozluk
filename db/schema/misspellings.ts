import { pgTable, serial, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { words } from "./words";

export const misspellings = pgTable("misspellings", {
    id: serial("id").primaryKey(),
    correctWordId: integer("correct_word_id")
        .notNull()
        .references(() => words.id, { onDelete: "cascade" }),
    incorrectSpelling: varchar("incorrect_spelling", { length: 255 }).notNull(),
    frequency: integer("frequency").default(0), // To rank "most" mistyped
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const misspellingsRelations = relations(misspellings, ({ one }) => ({
    correctWord: one(words, {
        fields: [misspellings.correctWordId],
        references: [words.id],
    }),
}));