import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import {
    integer,
    pgEnum,
    pgTable,
    serial,
    text,
    varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const sourceTypeEnum = pgEnum("source_type", [
    "tdk",
    "user_contribution",
    "foreign_term_suggestion",
    "other",
]);

export type SourceType = (typeof sourceTypeEnum.enumValues)[number];

export const wordSources = pgTable("word_sources", {
    id: serial("id").primaryKey(),
    sourceType: sourceTypeEnum("source_type").notNull(),
    sourceUrl: varchar("source_url", { length: 512 }),
    sourceDescription: text("source_description"),
    contributorId: text("contributor_id").references(() => users.id),
});

export const wordSourcesRelations = relations(wordSources, ({ one }) => ({
    contributor: one(users, {
        fields: [wordSources.contributorId],
        references: [users.id],
    }),
}));

export type SelectWordSource = InferSelectModel<typeof wordSources>;
export type InsertWordSource = InferInsertModel<typeof wordSources>;
