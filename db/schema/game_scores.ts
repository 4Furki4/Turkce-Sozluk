import { relations, InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
    integer,
    pgEnum,
    pgTable,
    serial,
    text,
    timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Enum for different game types
export const gameTypeEnum = pgEnum("game_type", [
    "speed_round",
    "word_matching",
    "flashcard",
]);

export type GameType = (typeof gameTypeEnum.enumValues)[number];

// Game scores table for leaderboard
export const gameScores = pgTable("game_scores", {
    id: serial("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    gameType: gameTypeEnum("game_type").notNull(),
    score: integer("score").notNull(),
    accuracy: integer("accuracy").notNull(), // 0-100
    maxStreak: integer("max_streak").default(0).notNull(),
    questionCount: integer("question_count").notNull(),
    timeTaken: integer("time_taken").notNull(), // in seconds
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
});

export const gameScoresRelations = relations(gameScores, ({ one }) => ({
    user: one(users, {
        fields: [gameScores.userId],
        references: [users.id],
    }),
}));

export type SelectGameScore = InferSelectModel<typeof gameScores>;
export type InsertGameScore = InferInsertModel<typeof gameScores>;
