import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import {
  integer,
  index,
  pgTable,
  serial,
  text,
  varchar,
} from "drizzle-orm/pg-core";
import { words } from "./words";
import { users } from "./users";
import { languages } from "./languages";

export const roots = pgTable("roots", {
  id: serial("id").primaryKey(),
  root: varchar("root", { length: 255 }),
  languageId: integer('language_id').references(() => languages.id),
  userId: text("user_id"),
  wordId: integer("word_id").notNull().references(() => words.id, {
    onDelete: "cascade",
  }),
  requestType: varchar("request_type", { length: 255 }).default("root"),
}, (table) => [
  index("roots_word_id_idx").on(table.wordId),
]);

export const rootsRelations = relations(roots, ({ one }) => ({
  user: one(users, {
    fields: [roots.userId],
    references: [users.id],
  }),
  language: one(languages, {
    fields: [roots.languageId],
    references: [languages.id],
  }),
}));

export type SelectRoot = InferSelectModel<typeof roots>;

export type InsertRoot = InferInsertModel<typeof roots>;
