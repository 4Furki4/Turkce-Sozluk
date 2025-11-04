import { pgTable, serial, integer, unique, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { pronunciations } from "./pronunciations";

export const pronunciationVotes = pgTable(
    "pronunciation_votes",
    {
        id: serial("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        pronunciationId: integer("pronunciation_id")
            .notNull()
            .references(() => pronunciations.id, { onDelete: "cascade" }),
        voteType: integer("vote_type").notNull(), // 1 for upvote, -1 for downvote
    },
    (table) => {
        return [
            // Ensures a user can only vote once per pronunciation
            unique("unique_pronunciation_vote").on(table.userId, table.pronunciationId),
        ];
    }
);

// Define relationships for querying with Drizzle
export const pronunciationVotesRelations = relations(pronunciationVotes, ({ one }) => ({
    user: one(users, {
        fields: [pronunciationVotes.userId],
        references: [users.id],
    }),
    pronunciation: one(pronunciations, {
        fields: [pronunciationVotes.pronunciationId],
        references: [pronunciations.id],
    }),
}));

export type InsertPronunciationVote = typeof pronunciationVotes.$inferInsert;
export type SelectPronunciationVote = typeof pronunciationVotes.$inferSelect;


