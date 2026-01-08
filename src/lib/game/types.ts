/**
 * Shared game types used across all game components
 */
import type { Session } from "@/src/lib/auth-client";

/** Common game state for all games */
export type GameState = "setup" | "loading" | "playing" | "finished";

/** Word source selection for games */
export type GameSource = "all" | "saved";

/** Supported locales */
export type GameLocale = "en" | "tr";

/** Base props shared by all game components */
export interface BaseGameProps {
    session: Session | null;
    locale: GameLocale;
}

/** Common game settings interface */
export interface GameSettings {
    source: GameSource;
    questionCount?: number;
    pairCount?: number;
    timePerQuestion?: number;
}

/** Leaderboard entry structure */
export interface LeaderboardEntry {
    userId: string;
    userName: string | null;
    userImage: string | null;
    bestScore: number;
    rank: number;
}
