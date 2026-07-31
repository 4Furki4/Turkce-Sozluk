import { relations, sql, type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import {
    boolean,
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    serial,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const gameTypeEnum = pgEnum("game_type", [
    "speed_round",
    "word_matching",
    "flashcard",
]);

export const gameSessionStatusEnum = pgEnum("game_session_status", [
    "active",
    "completed",
    "expired",
    "abandoned",
]);

export const gameSessionEventTypeEnum = pgEnum("game_session_event_type", [
    "speed_answer",
    "matching_attempt",
    "timeout",
]);

export type GameType = (typeof gameTypeEnum.enumValues)[number];
export type GameSessionStatus = (typeof gameSessionStatusEnum.enumValues)[number];
export type GameSessionEventType = (typeof gameSessionEventTypeEnum.enumValues)[number];

/** Server-only snapshot data. The client only receives redacted projections. */
export type GameSessionSnapshot = Record<string, unknown>;

export type GameSessionSettings = {
    source: "all" | "saved";
    questionCount?: number;
    pairCount?: number;
    timePerQuestion?: number;
    mode?: "relaxed" | "timed";
    /** Missing on legacy rows, which were already active when created. */
    activationState?: "pending" | "active";
    /** ISO timestamp written by the server when a prepared round becomes playable. */
    activatedAt?: string;
};

export const gameSessions = pgTable(
    "game_sessions",
    {
        id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        gameType: gameTypeEnum("game_type").notNull(),
        status: gameSessionStatusEnum("status").notNull().default("active"),
        settings: jsonb("settings").$type<GameSessionSettings>().notNull(),
        snapshot: jsonb("snapshot").$type<GameSessionSnapshot>().notNull(),
        currentStep: integer("current_step").notNull().default(0),
        streak: integer("streak").notNull().default(0),
        maxStreak: integer("max_streak").notNull().default(0),
        score: integer("score").notNull().default(0),
        correctCount: integer("correct_count").notNull().default(0),
        mistakeCount: integer("mistake_count").notNull().default(0),
        matchedTokens: jsonb("matched_tokens").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
        elapsedMs: integer("elapsed_ms").notNull().default(0),
        questionStartedAt: timestamp("question_started_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
        deadlineAt: timestamp("deadline_at", { mode: "date", withTimezone: true }),
        expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
        completedAt: timestamp("completed_at", { mode: "date", withTimezone: true }),
        createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        index("game_sessions_user_status_idx").on(table.userId, table.status),
        index("game_sessions_game_status_idx").on(table.gameType, table.status),
        index("game_sessions_expires_at_idx").on(table.expiresAt),
    ],
);

export const gameSessionEvents = pgTable(
    "game_session_events",
    {
        id: serial("id").primaryKey(),
        sessionId: text("session_id")
            .notNull()
            .references(() => gameSessions.id, { onDelete: "cascade" }),
        actionId: text("action_id").notNull(),
        sequence: integer("sequence").notNull(),
        eventType: gameSessionEventTypeEnum("event_type").notNull(),
        payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
        outcome: jsonb("outcome").$type<Record<string, unknown>>().notNull(),
        isCorrect: boolean("is_correct"),
        pointsEarned: integer("points_earned").notNull().default(0),
        createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex("game_session_events_session_action_idx").on(table.sessionId, table.actionId),
        uniqueIndex("game_session_events_session_sequence_idx").on(table.sessionId, table.sequence),
        index("game_session_events_session_idx").on(table.sessionId),
    ],
);

export const gameSessionsRelations = relations(gameSessions, ({ one, many }) => ({
    user: one(users, {
        fields: [gameSessions.userId],
        references: [users.id],
    }),
    events: many(gameSessionEvents),
}));

export const gameSessionEventsRelations = relations(gameSessionEvents, ({ one }) => ({
    session: one(gameSessions, {
        fields: [gameSessionEvents.sessionId],
        references: [gameSessions.id],
    }),
}));

export type SelectGameSession = InferSelectModel<typeof gameSessions>;
export type InsertGameSession = InferInsertModel<typeof gameSessions>;
export type SelectGameSessionEvent = InferSelectModel<typeof gameSessionEvents>;
export type InsertGameSessionEvent = InferInsertModel<typeof gameSessionEvents>;
