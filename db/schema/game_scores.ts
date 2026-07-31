import { relations, InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
    boolean,
    index,
    integer,
    pgTable,
    serial,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { gameSessions, gameTypeEnum } from "./game_sessions";

export { gameTypeEnum, type GameType } from "./game_sessions";

// Game scores table for leaderboard
export const gameScores = pgTable(
    "game_scores",
    {
        id: serial("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        sessionId: text("session_id").references(() => gameSessions.id, { onDelete: "restrict" }),
        gameType: gameTypeEnum("game_type").notNull(),
        score: integer("score").notNull(),
        accuracy: integer("accuracy").notNull(), // 0-100
        maxStreak: integer("max_streak").default(0).notNull(),
        questionCount: integer("question_count").notNull(),
        timeTaken: integer("time_taken").notNull(), // server-derived seconds
        verified: boolean("verified").notNull().default(false),
        createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex("game_scores_session_id_unique").on(table.sessionId),
        index("game_scores_verified_leaderboard_idx").on(table.verified, table.gameType, table.score),
        index("game_scores_user_game_verified_idx").on(table.userId, table.gameType, table.verified),
    ],
);

export const gameScoresRelations = relations(gameScores, ({ one }) => ({
    user: one(users, {
        fields: [gameScores.userId],
        references: [users.id],
    }),
    session: one(gameSessions, {
        fields: [gameScores.sessionId],
        references: [gameSessions.id],
    }),
}));

export type SelectGameScore = InferSelectModel<typeof gameScores>;
export type InsertGameScore = InferInsertModel<typeof gameScores>;
