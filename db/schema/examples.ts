import { index, integer, pgTable, serial, text, varchar } from "drizzle-orm/pg-core";
import { authors } from "./authors";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import { meanings } from "./meanings";

export const examples = pgTable("examples", {
  id: serial("id").primaryKey(),
  sentence: text("sentence").notNull(),
  authorId: integer("author_id").references(() => authors.id, {
    onDelete: "cascade",
  }),
  requestType: varchar("request_type", { length: 255 }).default("example"),
  meaningId: integer("meaning_id").notNull().references(() => meanings.id, {
    onDelete: "cascade",
  }),
}, (table) => [
  index("examples_meaning_id_idx").on(table.meaningId),
]);

export const examplesRelations = relations(examples, ({ one }) => ({
  author: one(authors, {
    fields: [examples.authorId],
    references: [authors.id],
  }),
  meaning: one(meanings, {
    fields: [examples.meaningId],
    references: [meanings.id],
  })
}));

export type SelectExample = InferSelectModel<typeof examples>;

export type InsertExample = InferInsertModel<typeof examples>;
