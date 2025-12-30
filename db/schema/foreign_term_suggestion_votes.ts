import { relations } from "drizzle-orm";
import {
    integer,
    pgTable,
    serial,
    text,
    unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { foreignTermSuggestions } from "./foreign_term_suggestions";

export const foreignTermSuggestionVotes = pgTable(
    "foreign_term_suggestion_votes",
    {
        id: serial("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        suggestionId: integer("suggestion_id")
            .notNull()
            .references(() => foreignTermSuggestions.id, { onDelete: "cascade" }),
        voteType: integer("vote_type").notNull(), // 1 = upvote, -1 = downvote
    },
    (table) => [
        // Ensures a user can only vote once per suggestion
        unique("unique_suggestion_vote").on(table.userId, table.suggestionId),
    ]
);

export const foreignTermSuggestionVotesRelations = relations(
    foreignTermSuggestionVotes,
    ({ one }) => ({
        user: one(users, {
            fields: [foreignTermSuggestionVotes.userId],
            references: [users.id],
        }),
        suggestion: one(foreignTermSuggestions, {
            fields: [foreignTermSuggestionVotes.suggestionId],
            references: [foreignTermSuggestions.id],
        }),
    })
);
