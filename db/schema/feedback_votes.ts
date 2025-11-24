import { pgTable, serial, integer, unique, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { feedbacks } from "./feedbacks";

export const feedbackVotes = pgTable(
    "feedback_votes",
    {
        id: serial("id").primaryKey(),
        userId: varchar("user_id") // Keep as varchar to match the users table's uuid
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        feedbackId: integer("feedback_id")
            .notNull()
            .references(() => feedbacks.id, { onDelete: "cascade" }),
        voteType: integer("vote_type").notNull().default(1),
    },
    (table) => {
        return [
            // Ensures a user can only vote once per feedback item.
            unique("unique_vote").on(table.userId, table.feedbackId),
        ];
    }
);

// Define relationships for querying with Drizzle.
export const feedbackVotesRelations = relations(feedbackVotes, ({ one }) => ({
    // A vote belongs to one user.
    user: one(users, {
        fields: [feedbackVotes.userId],
        references: [users.id],
    }),
    // A vote belongs to one piece of feedback.
    feedback: one(feedbacks, {
        fields: [feedbackVotes.feedbackId],
        references: [feedbacks.id],
    }),
}));
