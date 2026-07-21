import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import {
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    primaryKey,
    serial,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { meanings } from "./meanings";
import { users } from "./users";

export const flashcardDirectionEnum = pgEnum("flashcard_direction", ["word", "meaning"]);
export const flashcardRatingEnum = pgEnum("flashcard_rating", ["again", "hard", "good", "easy"]);

export type FlashcardDirection = (typeof flashcardDirectionEnum.enumValues)[number];
export type FlashcardRating = (typeof flashcardRatingEnum.enumValues)[number];

export type FlashcardReviewEventOutcome = {
    meaningId: number;
    direction: FlashcardDirection;
    rating: FlashcardRating;
    dueAt: string;
    repetitions: number;
    lapses: number;
    easeFactor: number;
    intervalDays: number;
};

/**
 * Per-user learning state. This intentionally has no relationship to
 * saved_words: reviewing a card neither creates nor deletes a bookmark.
 */
export const flashcardReviewStates = pgTable(
    "flashcard_review_states",
    {
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        meaningId: integer("meaning_id")
            .notNull()
            .references(() => meanings.id, { onDelete: "cascade" }),
        direction: flashcardDirectionEnum("direction").notNull(),
        repetitions: integer("repetitions").notNull().default(0),
        lapses: integer("lapses").notNull().default(0),
        // Stored as a whole-number percentage multiplier: 250 means 2.50x.
        easeFactor: integer("ease_factor").notNull().default(250),
        intervalDays: integer("interval_days").notNull().default(0),
        dueAt: timestamp("due_at", { mode: "date", withTimezone: true }).notNull(),
        lastReviewedAt: timestamp("last_reviewed_at", { mode: "date", withTimezone: true }).notNull(),
        createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        primaryKey({ columns: [table.userId, table.meaningId, table.direction] }),
        index("flashcard_review_states_user_due_idx").on(table.userId, table.dueAt),
    ],
);

/**
 * Immutable action outcomes make a retried rating safe: a user/action ID can
 * only schedule one state transition, even if the original response is lost.
 */
export const flashcardReviewEvents = pgTable(
    "flashcard_review_events",
    {
        id: serial("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        meaningId: integer("meaning_id")
            .notNull()
            .references(() => meanings.id, { onDelete: "cascade" }),
        direction: flashcardDirectionEnum("direction").notNull(),
        rating: flashcardRatingEnum("rating").notNull(),
        actionId: text("action_id").notNull(),
        outcome: jsonb("outcome").$type<FlashcardReviewEventOutcome>().notNull(),
        createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex("flashcard_review_events_user_action_idx").on(table.userId, table.actionId),
        index("flashcard_review_events_user_created_idx").on(table.userId, table.createdAt),
    ],
);

export const flashcardReviewStatesRelations = relations(flashcardReviewStates, ({ one }) => ({
    user: one(users, {
        fields: [flashcardReviewStates.userId],
        references: [users.id],
    }),
    meaning: one(meanings, {
        fields: [flashcardReviewStates.meaningId],
        references: [meanings.id],
    }),
}));

export const flashcardReviewEventsRelations = relations(flashcardReviewEvents, ({ one }) => ({
    user: one(users, {
        fields: [flashcardReviewEvents.userId],
        references: [users.id],
    }),
    meaning: one(meanings, {
        fields: [flashcardReviewEvents.meaningId],
        references: [meanings.id],
    }),
}));

export type SelectFlashcardReviewState = InferSelectModel<typeof flashcardReviewStates>;
export type InsertFlashcardReviewState = InferInsertModel<typeof flashcardReviewStates>;
export type SelectFlashcardReviewEvent = InferSelectModel<typeof flashcardReviewEvents>;
export type InsertFlashcardReviewEvent = InferInsertModel<typeof flashcardReviewEvents>;
