import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { words } from "./words";

export const galatiMeshur = pgTable("galatimeshur", {
    id: serial("id").primaryKey(),
    wordId: integer("word_id")
        .notNull()
        .references(() => words.id, { onDelete: "cascade" }),
    explanation: text("explanation").notNull(), // The story behind the mistake
    correctUsage: text("correct_usage"), // Optional: What it technically should be
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const galatiMeshurRelations = relations(galatiMeshur, ({ one }) => ({
    word: one(words, {
        fields: [galatiMeshur.wordId],
        references: [words.id],
    }),
}));