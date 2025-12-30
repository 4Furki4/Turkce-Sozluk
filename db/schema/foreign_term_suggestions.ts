import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import {
    integer,
    pgEnum,
    pgTable,
    serial,
    text,
    timestamp,
    boolean,
    unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { languages } from "./languages";

export const suggestionStatusEnum = pgEnum("suggestion_status", [
    "pending",
    "approved",
    "rejected",
]);

export type SuggestionStatus = (typeof suggestionStatusEnum.enumValues)[number];

export const foreignTermSuggestions = pgTable("foreign_term_suggestions", {
    id: serial("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    foreignTerm: text("foreign_term").notNull(),
    languageId: integer("language_id")
        .notNull()
        .references(() => languages.id),
    foreignMeaning: text("foreign_meaning").notNull(),
    suggestedTurkishWord: text("suggested_turkish_word").notNull(),
    isNewWord: boolean("is_new_word").notNull().default(true),
    reason: text("reason"),
    status: suggestionStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { mode: "date" }),
    resolvedBy: text("resolved_by").references(() => users.id),
    moderationReason: text("moderation_reason"),
    // Reference to the created word when approved
    createdWordId: integer("created_word_id"),
});

export const foreignTermSuggestionsRelations = relations(
    foreignTermSuggestions,
    ({ one }) => ({
        user: one(users, {
            fields: [foreignTermSuggestions.userId],
            references: [users.id],
            relationName: "suggestionUser",
        }),
        resolver: one(users, {
            fields: [foreignTermSuggestions.resolvedBy],
            references: [users.id],
            relationName: "suggestionResolver",
        }),
        language: one(languages, {
            fields: [foreignTermSuggestions.languageId],
            references: [languages.id],
        }),
    })
);

export type SelectForeignTermSuggestion = InferSelectModel<
    typeof foreignTermSuggestions
>;
export type InsertForeignTermSuggestion = InferInsertModel<
    typeof foreignTermSuggestions
>;
