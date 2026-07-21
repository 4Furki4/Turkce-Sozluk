/**
 * Deterministic, server-owned state transitions for ranked games.
 *
 * These helpers deliberately accept only a previously persisted snapshot,
 * persisted progress, a player action, and a server timestamp. They never
 * accept browser-reported scores, elapsed time, accuracy, or streaks.
 */

export type CompetitiveGameType = "speed_round" | "word_matching";

export type GameSessionStatus = "active" | "completed" | "expired" | "abandoned";

/**
 * Database timestamps are often Dates while JSON snapshots use numbers or
 * ISO strings. All are accepted at the boundary and normalized internally.
 */
export type ServerTimestamp = Date | number | string;

export interface SpeedRoundOptionSnapshot {
    /** Opaque token returned to the player instead of an answer index. */
    token: string;
    text: string;
}

export interface SpeedRoundQuestionSnapshot {
    /** Opaque question token for audit/event records. */
    token: string;
    word: string;
    options: readonly SpeedRoundOptionSnapshot[];
    /** Server-only answer key. Never include this in a start response. */
    correctOptionToken: string;
}

export interface SpeedRoundSessionSnapshot {
    gameType: "speed_round";
    questions: readonly SpeedRoundQuestionSnapshot[];
    timePerQuestionSeconds: number;
}

export interface PlayableSpeedRoundQuestion {
    token: string;
    word: string;
    options: readonly SpeedRoundOptionSnapshot[];
}

export interface WordMatchingPairSnapshot {
    /** Opaque tile tokens. The public board must not reveal their pairing. */
    wordToken: string;
    meaningToken: string;
    word: string;
    meaning: string;
}

export interface WordMatchingSessionSnapshot {
    gameType: "word_matching";
    pairs: readonly WordMatchingPairSnapshot[];
    /** Null means a relaxed/non-ranked round with no deadline. */
    timeLimitSeconds: number | null;
}

export interface PlayableWordTile {
    token: string;
    text: string;
}

export interface PlayableWordMatchingBoard {
    words: readonly PlayableWordTile[];
    meanings: readonly PlayableWordTile[];
}

export interface SpeedRoundSessionProgress {
    status: GameSessionStatus;
    currentStep: number;
    deadlineAt: ServerTimestamp;
    score: number;
    streak: number;
    maxStreak: number;
    correctCount: number;
    timeTakenMs: number;
    completedAt: ServerTimestamp | null;
}

export interface WordMatchingSessionProgress {
    status: GameSessionStatus;
    /** Number of pairs matched. It is persisted as the session current step. */
    currentStep: number;
    deadlineAt: ServerTimestamp | null;
    startedAt: ServerTimestamp;
    score: number;
    mistakes: number;
    /** Matched word tokens are sufficient because a pair is one-to-one. */
    matchedWordTokens: readonly string[];
    completedAt: ServerTimestamp | null;
}

export type GameSessionActionError =
    | "session_not_active"
    | "session_expired"
    | "invalid_step"
    | "question_not_ready"
    | "invalid_option"
    | "invalid_tile"
    | "already_matched"
    | "invalid_session_state";

interface RejectedSessionAction<TState> {
    ok: false;
    error: GameSessionActionError;
    /** Persist this state when an expiry changed the session status. */
    state: TState;
}

export interface SpeedRoundAnswerAction {
    questionIndex: number;
    /** null is an intentional skip. A deadline always records a timeout. */
    optionToken: string | null;
}

export interface ResolvedSpeedRoundAnswer {
    ok: true;
    isCorrect: boolean;
    timedOut: boolean;
    pointsEarned: number;
    streak: number;
    completed: boolean;
    questionToken: string;
    /** The actual action time, clamped to the server-owned deadline. */
    occurredAt: number;
    timeSpentMs: number;
    state: SpeedRoundSessionProgress;
}

export type SpeedRoundAnswerResolution =
    | ResolvedSpeedRoundAnswer
    | RejectedSessionAction<SpeedRoundSessionProgress>;

export interface WordMatchingAttemptAction {
    wordTileToken: string;
    meaningTileToken: string;
}

export interface ResolvedWordMatchingAttempt {
    ok: true;
    isCorrect: boolean;
    pointsEarned: number;
    streak: number;
    completed: boolean;
    occurredAt: number;
    state: WordMatchingSessionProgress;
}

export type WordMatchingAttemptResolution =
    | ResolvedWordMatchingAttempt
    | RejectedSessionAction<WordMatchingSessionProgress>;

export interface VerifiedGameScore {
    gameType: CompetitiveGameType;
    score: number;
    accuracy: number;
    maxStreak: number;
    questionCount: number;
    timeTakenSeconds: number;
}

const SPEED_ROUND_BASE_POINTS = 100;
const SPEED_ROUND_MAX_SPEED_BONUS = 50;
const SPEED_ROUND_MAX_STREAK_MULTIPLIER = 5;
const WORD_MATCHING_CORRECT_POINTS = 100;
const WORD_MATCHING_MISTAKE_PENALTY = 10;

/**
 * A leaderboard compares raw scores, so it needs one server-owned ruleset
 * per game. Other settings remain valid practice sessions but cannot affect
 * competitive rankings.
 */
export const COMPETITIVE_SPEED_ROUND_QUESTION_COUNT = 10;
export const COMPETITIVE_SPEED_ROUND_TIME_PER_QUESTION_SECONDS = 10;
export const COMPETITIVE_WORD_MATCHING_PAIR_COUNT = 6;
export const COMPETITIVE_WORD_MATCHING_TIME_LIMIT_SECONDS = 60;
/**
 * The UI shows answer feedback before the next question. Keep that pause on
 * the server too so players never lose answer time before a question appears.
 */
export const SPEED_ROUND_TRANSITION_DELAY_MS = 720;

export function isCompetitiveSpeedRoundRuleset(
    questionCount: number,
    timePerQuestionSeconds: number,
    source: "all" | "saved" = "all",
): boolean {
    return questionCount === COMPETITIVE_SPEED_ROUND_QUESTION_COUNT
        && timePerQuestionSeconds === COMPETITIVE_SPEED_ROUND_TIME_PER_QUESTION_SECONDS
        && source === "all";
}

export function isCompetitiveWordMatchingRuleset(
    pairCount: number,
    timeLimitSeconds: number | null,
    source: "all" | "saved" = "all",
): boolean {
    return pairCount === COMPETITIVE_WORD_MATCHING_PAIR_COUNT
        && timeLimitSeconds === COMPETITIVE_WORD_MATCHING_TIME_LIMIT_SECONDS
        && source === "all";
}

function toMilliseconds(value: ServerTimestamp): number | null {
    const milliseconds = value instanceof Date
        ? value.getTime()
        : typeof value === "number"
            ? value
            : Date.parse(value);

    return Number.isFinite(milliseconds) ? milliseconds : null;
}

function isNonEmptyToken(value: unknown): value is string {
    return typeof value === "string" && value.length > 0;
}

function hasUniqueTokens(tokens: readonly string[]): boolean {
    return new Set(tokens).size === tokens.length;
}

function isNonNegativeInteger(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isActive(status: GameSessionStatus): boolean {
    return status === "active";
}

function rejectSpeed(
    error: GameSessionActionError,
    state: SpeedRoundSessionProgress,
): RejectedSessionAction<SpeedRoundSessionProgress> {
    return { ok: false, error, state };
}

function rejectMatching(
    error: GameSessionActionError,
    state: WordMatchingSessionProgress,
): RejectedSessionAction<WordMatchingSessionProgress> {
    return { ok: false, error, state };
}

function validateSpeedSnapshot(snapshot: SpeedRoundSessionSnapshot): boolean {
    if (!Number.isInteger(snapshot.timePerQuestionSeconds) || snapshot.timePerQuestionSeconds <= 0) {
        return false;
    }

    if (snapshot.questions.length === 0) return false;

    const questionTokens = snapshot.questions.map((question) => question.token);
    if (!questionTokens.every(isNonEmptyToken) || !hasUniqueTokens(questionTokens)) return false;

    return snapshot.questions.every((question) => {
        const optionTokens = question.options.map((option) => option.token);
        return question.options.length > 0
            && optionTokens.every(isNonEmptyToken)
            && hasUniqueTokens(optionTokens)
            && optionTokens.includes(question.correctOptionToken);
    });
}

function validateSpeedProgress(
    progress: SpeedRoundSessionProgress,
    questionCount: number,
): boolean {
    return isNonNegativeInteger(progress.currentStep)
        && progress.currentStep <= questionCount
        && (progress.status !== "active" || progress.currentStep < questionCount)
        && isNonNegativeInteger(progress.score)
        && isNonNegativeInteger(progress.streak)
        && isNonNegativeInteger(progress.maxStreak)
        && isNonNegativeInteger(progress.correctCount)
        && isNonNegativeInteger(progress.timeTakenMs)
        && progress.correctCount <= progress.currentStep
        && progress.maxStreak >= progress.streak
        && toMilliseconds(progress.deadlineAt) !== null;
}

function validateMatchingSnapshot(snapshot: WordMatchingSessionSnapshot): boolean {
    if (snapshot.pairs.length === 0) return false;
    if (snapshot.timeLimitSeconds !== null
        && (!Number.isInteger(snapshot.timeLimitSeconds) || snapshot.timeLimitSeconds <= 0)) {
        return false;
    }

    const wordTokens = snapshot.pairs.map((pair) => pair.wordToken);
    const meaningTokens = snapshot.pairs.map((pair) => pair.meaningToken);

    return wordTokens.every(isNonEmptyToken)
        && meaningTokens.every(isNonEmptyToken)
        && hasUniqueTokens(wordTokens)
        && hasUniqueTokens(meaningTokens);
}

function validateMatchingProgress(
    progress: WordMatchingSessionProgress,
    pairCount: number,
): boolean {
    return isNonNegativeInteger(progress.currentStep)
        && progress.currentStep <= pairCount
        && isNonNegativeInteger(progress.score)
        && isNonNegativeInteger(progress.mistakes)
        && progress.matchedWordTokens.every(isNonEmptyToken)
        && hasUniqueTokens(progress.matchedWordTokens)
        && progress.matchedWordTokens.length === progress.currentStep
        && toMilliseconds(progress.startedAt) !== null
        && (progress.deadlineAt === null || toMilliseconds(progress.deadlineAt) !== null);
}

function getNow(now: ServerTimestamp): number | null {
    return toMilliseconds(now);
}

function scoreSpeedRoundAnswer(
    isCorrect: boolean,
    remainingMs: number,
    questionDurationMs: number,
    currentStreak: number,
): number {
    if (!isCorrect) return 0;

    const speedBonus = Math.round(
        (Math.max(0, Math.min(remainingMs, questionDurationMs)) / questionDurationMs)
        * SPEED_ROUND_MAX_SPEED_BONUS,
    );
    const streakMultiplier = Math.min(currentStreak + 1, SPEED_ROUND_MAX_STREAK_MULTIPLIER);

    return (SPEED_ROUND_BASE_POINTS + speedBonus) * streakMultiplier;
}

/**
 * Produces the only Speed Round question shape that may be returned to a
 * browser. The answer token stays exclusively in the persisted snapshot.
 */
export function getPlayableSpeedRoundQuestion(
    snapshot: SpeedRoundSessionSnapshot,
    questionIndex: number,
): PlayableSpeedRoundQuestion | null {
    if (!validateSpeedSnapshot(snapshot) || !isNonNegativeInteger(questionIndex)) return null;

    const question = snapshot.questions[questionIndex];
    if (!question) return null;

    return {
        token: question.token,
        word: question.word,
        options: question.options.map((option) => ({
            token: option.token,
            text: option.text,
        })),
    };
}

/**
 * Produces opaque Word Matching tile collections without the server-only
 * relation between a word and its meaning. The session service should shuffle
 * these two arrays independently before returning them to the browser.
 */
export function getPlayableWordMatchingBoard(
    snapshot: WordMatchingSessionSnapshot,
): PlayableWordMatchingBoard | null {
    if (!validateMatchingSnapshot(snapshot)) return null;

    return {
        words: snapshot.pairs.map((pair) => ({ token: pair.wordToken, text: pair.word })),
        meanings: snapshot.pairs.map((pair) => ({ token: pair.meaningToken, text: pair.meaning })),
    };
}

/**
 * Creates the initial persisted state for a Speed Round. `startedAt` must be
 * generated by the server at the moment the session is created.
 */
export function createSpeedRoundProgress(
    snapshot: SpeedRoundSessionSnapshot,
    startedAt: ServerTimestamp,
): SpeedRoundSessionProgress {
    const startMs = toMilliseconds(startedAt);
    if (!validateSpeedSnapshot(snapshot) || startMs === null) {
        throw new Error("Cannot create Speed Round progress from an invalid server snapshot");
    }

    return {
        status: "active",
        currentStep: 0,
        deadlineAt: startMs + snapshot.timePerQuestionSeconds * 1000,
        score: 0,
        streak: 0,
        maxStreak: 0,
        correctCount: 0,
        timeTakenMs: 0,
        completedAt: null,
    };
}

/**
 * Resolves one answer using only server-owned state. A request received at or
 * after the deadline is always recorded as a timeout, even if it names the
 * correct option token.
 */
export function resolveSpeedRoundAnswer(
    snapshot: SpeedRoundSessionSnapshot,
    progress: SpeedRoundSessionProgress,
    action: SpeedRoundAnswerAction,
    now: ServerTimestamp,
): SpeedRoundAnswerResolution {
    if (!validateSpeedSnapshot(snapshot) || !validateSpeedProgress(progress, snapshot.questions.length)) {
        return rejectSpeed("invalid_session_state", progress);
    }

    if (!isActive(progress.status)) return rejectSpeed("session_not_active", progress);
    if (!isNonNegativeInteger(action.questionIndex) || action.questionIndex !== progress.currentStep) {
        return rejectSpeed("invalid_step", progress);
    }

    const nowMs = getNow(now);
    const deadlineMs = toMilliseconds(progress.deadlineAt);
    if (nowMs === null || deadlineMs === null) return rejectSpeed("invalid_session_state", progress);

    const question = snapshot.questions[progress.currentStep];
    if (!question) return rejectSpeed("invalid_session_state", progress);

    const questionDurationMs = snapshot.timePerQuestionSeconds * 1000;
    const questionStartedAt = deadlineMs - questionDurationMs;
    // The next question is released in the response before its feedback pause
    // ends, so the server must reject attempts made during that pause.
    if (nowMs < questionStartedAt) return rejectSpeed("question_not_ready", progress);

    const timedOut = nowMs >= deadlineMs;
    if (!timedOut && action.optionToken !== null && !question.options.some((option) => option.token === action.optionToken)) {
        return rejectSpeed("invalid_option", progress);
    }

    const occurredAt = timedOut ? deadlineMs : nowMs;
    const timeSpentMs = Math.max(0, Math.min(questionDurationMs, occurredAt - questionStartedAt));
    const remainingMs = Math.max(0, deadlineMs - occurredAt);
    const isCorrect = !timedOut && action.optionToken === question.correctOptionToken;
    const pointsEarned = scoreSpeedRoundAnswer(
        isCorrect,
        remainingMs,
        questionDurationMs,
        progress.streak,
    );
    const nextStreak = isCorrect ? progress.streak + 1 : 0;
    const nextCurrentStep = progress.currentStep + 1;
    const completed = nextCurrentStep === snapshot.questions.length;

    const nextState: SpeedRoundSessionProgress = {
        status: completed ? "completed" : "active",
        currentStep: nextCurrentStep,
        // Preserve the actual answer time as the next question's start time.
        // When catching up after a timeout this remains in the past, so a
        // delayed request cannot reset the server-owned clock.
        deadlineAt: completed
            ? deadlineMs
            : occurredAt + SPEED_ROUND_TRANSITION_DELAY_MS + questionDurationMs,
        score: progress.score + pointsEarned,
        streak: nextStreak,
        maxStreak: Math.max(progress.maxStreak, nextStreak),
        correctCount: progress.correctCount + (isCorrect ? 1 : 0),
        timeTakenMs: progress.timeTakenMs + timeSpentMs,
        completedAt: completed ? occurredAt : null,
    };

    return {
        ok: true,
        isCorrect,
        timedOut,
        pointsEarned,
        streak: nextStreak,
        completed,
        questionToken: question.token,
        occurredAt,
        timeSpentMs,
        state: nextState,
    };
}

/**
 * Creates the initial persisted state for Word Matching. `startedAt` is a
 * server timestamp; timed rounds get a server-owned deadline.
 */
export function createWordMatchingProgress(
    snapshot: WordMatchingSessionSnapshot,
    startedAt: ServerTimestamp,
): WordMatchingSessionProgress {
    const startMs = toMilliseconds(startedAt);
    if (!validateMatchingSnapshot(snapshot) || startMs === null) {
        throw new Error("Cannot create Word Matching progress from an invalid server snapshot");
    }

    return {
        status: "active",
        currentStep: 0,
        deadlineAt: snapshot.timeLimitSeconds === null
            ? null
            : startMs + snapshot.timeLimitSeconds * 1000,
        startedAt: startMs,
        score: 0,
        mistakes: 0,
        matchedWordTokens: [],
        completedAt: null,
    };
}

/**
 * Resolves one Word Matching tile pair. The correct relationship exists only
 * in the server snapshot. Reusing a matched word or meaning token is rejected
 * before it can affect the score.
 */
export function resolveWordMatchingAttempt(
    snapshot: WordMatchingSessionSnapshot,
    progress: WordMatchingSessionProgress,
    action: WordMatchingAttemptAction,
    now: ServerTimestamp,
): WordMatchingAttemptResolution {
    if (!validateMatchingSnapshot(snapshot) || !validateMatchingProgress(progress, snapshot.pairs.length)) {
        return rejectMatching("invalid_session_state", progress);
    }

    if (!isActive(progress.status)) return rejectMatching("session_not_active", progress);

    const nowMs = getNow(now);
    if (nowMs === null) return rejectMatching("invalid_session_state", progress);

    const deadlineMs = progress.deadlineAt === null ? null : toMilliseconds(progress.deadlineAt);
    if (deadlineMs === null && progress.deadlineAt !== null) {
        return rejectMatching("invalid_session_state", progress);
    }

    if (deadlineMs !== null && nowMs >= deadlineMs) {
        return rejectMatching("session_expired", {
            ...progress,
            status: "expired",
        });
    }

    const wordPair = snapshot.pairs.find((pair) => pair.wordToken === action.wordTileToken);
    const meaningPair = snapshot.pairs.find((pair) => pair.meaningToken === action.meaningTileToken);
    if (!wordPair || !meaningPair) return rejectMatching("invalid_tile", progress);

    if (progress.matchedWordTokens.includes(wordPair.wordToken)
        || progress.matchedWordTokens.includes(meaningPair.wordToken)) {
        return rejectMatching("already_matched", progress);
    }

    const isCorrect = wordPair.wordToken === meaningPair.wordToken;
    const matchedWordTokens = isCorrect
        ? [...progress.matchedWordTokens, wordPair.wordToken]
        : [...progress.matchedWordTokens];
    const mistakes = progress.mistakes + (isCorrect ? 0 : 1);
    const currentStep = matchedWordTokens.length;
    const completed = currentStep === snapshot.pairs.length;
    const score = Math.max(
        0,
        currentStep * WORD_MATCHING_CORRECT_POINTS - mistakes * WORD_MATCHING_MISTAKE_PENALTY,
    );

    const nextState: WordMatchingSessionProgress = {
        status: completed ? "completed" : "active",
        currentStep,
        deadlineAt: progress.deadlineAt,
        startedAt: progress.startedAt,
        score,
        mistakes,
        matchedWordTokens,
        completedAt: completed ? nowMs : null,
    };

    return {
        ok: true,
        isCorrect,
        pointsEarned: isCorrect ? WORD_MATCHING_CORRECT_POINTS : 0,
        // Word Matching currently has no streak rule; keep the normalized
        // response shape so the session service can use one result contract.
        streak: 0,
        completed,
        occurredAt: nowMs,
        state: nextState,
    };
}

/**
 * Returns a score row only after a session has completed through a
 * server-calculated transition. This makes it impossible to promote a client
 * aggregate into a leaderboard entry.
 */
export function createVerifiedGameScore(
    snapshot: SpeedRoundSessionSnapshot,
    progress: SpeedRoundSessionProgress,
): VerifiedGameScore | null;
export function createVerifiedGameScore(
    snapshot: WordMatchingSessionSnapshot,
    progress: WordMatchingSessionProgress,
): VerifiedGameScore | null;
export function createVerifiedGameScore(
    snapshot: SpeedRoundSessionSnapshot | WordMatchingSessionSnapshot,
    progress: SpeedRoundSessionProgress | WordMatchingSessionProgress,
): VerifiedGameScore | null {
    if (snapshot.gameType === "speed_round") {
        const speedProgress = progress as SpeedRoundSessionProgress;
        if (!validateSpeedSnapshot(snapshot)
            || !validateSpeedProgress(speedProgress, snapshot.questions.length)
            || speedProgress.status !== "completed") {
            return null;
        }

        return {
            gameType: "speed_round",
            score: speedProgress.score,
            accuracy: calculateAccuracy(speedProgress.correctCount, snapshot.questions.length),
            maxStreak: speedProgress.maxStreak,
            questionCount: snapshot.questions.length,
            timeTakenSeconds: Math.ceil(speedProgress.timeTakenMs / 1000),
        };
    }

    const matchingProgress = progress as WordMatchingSessionProgress;
    if (!validateMatchingSnapshot(snapshot)
        || !validateMatchingProgress(matchingProgress, snapshot.pairs.length)
        || matchingProgress.status !== "completed"
        // Relaxed boards are practice: their server-calculated result is
        // useful to the player but must never compete with timed sessions.
        || snapshot.timeLimitSeconds === null) {
        return null;
    }

    const startedAt = toMilliseconds(matchingProgress.startedAt);
    const completedAt = matchingProgress.completedAt === null
        ? null
        : toMilliseconds(matchingProgress.completedAt);
    if (startedAt === null || completedAt === null || completedAt < startedAt) return null;

    return {
        gameType: "word_matching",
        score: matchingProgress.score,
        accuracy: calculateAccuracy(snapshot.pairs.length, snapshot.pairs.length + matchingProgress.mistakes),
        maxStreak: 0,
        questionCount: snapshot.pairs.length,
        timeTakenSeconds: Math.ceil((completedAt - startedAt) / 1000),
    };
}

function calculateAccuracy(correct: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
}
