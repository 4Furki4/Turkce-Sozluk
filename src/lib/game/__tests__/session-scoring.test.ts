import {
    createSpeedRoundProgress,
    createVerifiedGameScore,
    createWordMatchingProgress,
    getPlayableSpeedRoundQuestion,
    getPlayableWordMatchingBoard,
    isCompetitiveSpeedRoundRuleset,
    isCompetitiveWordMatchingRuleset,
    resolveSpeedRoundAnswer,
    resolveWordMatchingAttempt,
    type SpeedRoundSessionSnapshot,
    type WordMatchingSessionSnapshot,
} from "../session-scoring";

describe("competitive rulesets", () => {
    it("accepts only the comparable server-owned settings for rankings", () => {
        expect(isCompetitiveSpeedRoundRuleset(10, 10)).toBe(true);
        expect(isCompetitiveSpeedRoundRuleset(30, 10)).toBe(false);
        expect(isCompetitiveSpeedRoundRuleset(10, 15)).toBe(false);
        expect(isCompetitiveSpeedRoundRuleset(10, 10, "saved")).toBe(false);

        expect(isCompetitiveWordMatchingRuleset(6, 60)).toBe(true);
        expect(isCompetitiveWordMatchingRuleset(6, null)).toBe(false);
        expect(isCompetitiveWordMatchingRuleset(8, 60)).toBe(false);
        expect(isCompetitiveWordMatchingRuleset(6, 60, "saved")).toBe(false);
    });
});

const speedSnapshot: SpeedRoundSessionSnapshot = {
    gameType: "speed_round",
    timePerQuestionSeconds: 10,
    questions: [
        {
            token: "question-1",
            word: "kitap",
            options: [
                { token: "option-a", text: "A correct meaning" },
                { token: "option-b", text: "A distractor" },
            ],
            correctOptionToken: "option-a",
        },
        {
            token: "question-2",
            word: "kalem",
            options: [
                { token: "option-c", text: "Another correct meaning" },
                { token: "option-d", text: "Another distractor" },
            ],
            correctOptionToken: "option-c",
        },
    ],
};

const matchingSnapshot: WordMatchingSessionSnapshot = {
    gameType: "word_matching",
    timeLimitSeconds: 60,
    pairs: [
        {
            wordToken: "word-1",
            meaningToken: "meaning-1",
            word: "kitap",
            meaning: "book",
        },
        {
            wordToken: "word-2",
            meaningToken: "meaning-2",
            word: "kalem",
            meaning: "pen",
        },
    ],
};

describe("server-owned Speed Round scoring", () => {
    it("creates a playable question without exposing its server-only answer token", () => {
        const question = getPlayableSpeedRoundQuestion(speedSnapshot, 0);

        expect(question).toEqual({
            token: "question-1",
            word: "kitap",
            options: [
                { token: "option-a", text: "A correct meaning" },
                { token: "option-b", text: "A distractor" },
            ],
        });
        expect(question).not.toHaveProperty("correctOptionToken");
    });

    it("calculates score and elapsed time from the server clock, ignoring extra client aggregates", () => {
        const progress = createSpeedRoundProgress(speedSnapshot, 1_000);
        const result = resolveSpeedRoundAnswer(
            speedSnapshot,
            progress,
            {
                questionIndex: 0,
                optionToken: "option-a",
                // Browser-supplied totals are not part of the action contract and
                // cannot affect the deterministic result at runtime either.
                score: 999_999,
                accuracy: 100,
            } as never,
            3_100,
        );

        expect(result).toMatchObject({
            ok: true,
            isCorrect: true,
            pointsEarned: 140,
            streak: 1,
            completed: false,
            timeSpentMs: 2_100,
        });
        if (!result.ok) return;
        expect(result.state.score).toBe(140);
        expect(result.state.timeTakenMs).toBe(2_100);
        expect(result.state.deadlineAt).toBe(13_820);
    });

    it("turns a late correct answer into a server-timestamped timeout", () => {
        const progress = createSpeedRoundProgress(speedSnapshot, 1_000);
        const result = resolveSpeedRoundAnswer(
            speedSnapshot,
            progress,
            { questionIndex: 0, optionToken: "option-a" },
            11_000,
        );

        expect(result).toMatchObject({
            ok: true,
            isCorrect: false,
            timedOut: true,
            pointsEarned: 0,
            streak: 0,
            occurredAt: 11_000,
            timeSpentMs: 10_000,
        });
        if (!result.ok) return;
        // The next deadline is based on the old deadline, plus the fixed
        // feedback pause, so a delayed request cannot restart the timer.
        expect(result.state.deadlineAt).toBe(21_720);
    });

    it("accepts a correct answer one millisecond before the server deadline", () => {
        const progress = createSpeedRoundProgress(speedSnapshot, 1_000);
        const result = resolveSpeedRoundAnswer(
            speedSnapshot,
            progress,
            { questionIndex: 0, optionToken: "option-a" },
            10_999,
        );

        expect(result).toMatchObject({
            ok: true,
            isCorrect: true,
            timedOut: false,
            timeSpentMs: 9_999,
        });
        if (!result.ok) return;
        expect(result.state.score).toBeGreaterThan(0);
        expect(result.state.deadlineAt).toBe(21_719);
    });

    it("classifies the exact server deadline as a timeout even with a correct option token", () => {
        const progress = createSpeedRoundProgress(speedSnapshot, 1_000);
        const result = resolveSpeedRoundAnswer(
            speedSnapshot,
            progress,
            { questionIndex: 0, optionToken: "option-a" },
            11_000,
        );

        expect(result).toMatchObject({
            ok: true,
            isCorrect: false,
            timedOut: true,
            pointsEarned: 0,
            timeSpentMs: 10_000,
        });
    });

    it("starts a repeated round with independent zeroed statistics", () => {
        const firstRound = createSpeedRoundProgress(speedSnapshot, 0);
        const resolvedFirstRound = resolveSpeedRoundAnswer(
            speedSnapshot,
            firstRound,
            { questionIndex: 0, optionToken: "option-a" },
            1_000,
        );
        if (!resolvedFirstRound.ok) throw new Error("Expected first round answer to resolve");
        expect(resolvedFirstRound.state.score).toBeGreaterThan(0);
        expect(resolvedFirstRound.state.correctCount).toBe(1);

        const secondRound = createSpeedRoundProgress(speedSnapshot, 30_000);
        expect(secondRound).toMatchObject({
            currentStep: 0,
            score: 0,
            streak: 0,
            maxStreak: 0,
            correctCount: 0,
            timeTakenMs: 0,
        });

        const resolvedSecondRound = resolveSpeedRoundAnswer(
            speedSnapshot,
            secondRound,
            { questionIndex: 0, optionToken: "option-b" },
            31_000,
        );
        expect(resolvedSecondRound).toMatchObject({
            ok: true,
            isCorrect: false,
            pointsEarned: 0,
            streak: 0,
            timeSpentMs: 1_000,
        });
    });

    it("does not accept the next answer until its feedback pause is over", () => {
        const initial = createSpeedRoundProgress(speedSnapshot, 0);
        const first = resolveSpeedRoundAnswer(
            speedSnapshot,
            initial,
            { questionIndex: 0, optionToken: "option-a" },
            1_000,
        );
        if (!first.ok) throw new Error("Expected first answer to resolve");

        expect(resolveSpeedRoundAnswer(
            speedSnapshot,
            first.state,
            { questionIndex: 1, optionToken: "option-c" },
            1_100,
        )).toMatchObject({ ok: false, error: "question_not_ready" });
    });

    it("rejects skipped, forged, or duplicate steps before scoring", () => {
        const progress = createSpeedRoundProgress(speedSnapshot, 0);

        expect(resolveSpeedRoundAnswer(
            speedSnapshot,
            progress,
            { questionIndex: 1, optionToken: "option-c" },
            1_000,
        )).toMatchObject({ ok: false, error: "invalid_step" });

        expect(resolveSpeedRoundAnswer(
            speedSnapshot,
            progress,
            { questionIndex: 0, optionToken: "not-in-this-question" },
            1_000,
        )).toMatchObject({ ok: false, error: "invalid_option" });

        const firstAnswer = resolveSpeedRoundAnswer(
            speedSnapshot,
            progress,
            { questionIndex: 0, optionToken: "option-a" },
            1_000,
        );
        if (!firstAnswer.ok) throw new Error("Expected first answer to resolve");

        expect(resolveSpeedRoundAnswer(
            speedSnapshot,
            firstAnswer.state,
            { questionIndex: 0, optionToken: "option-a" },
            2_000,
        )).toMatchObject({ ok: false, error: "invalid_step" });
    });

    it("creates a verified score only after every server-owned question completes", () => {
        const initial = createSpeedRoundProgress(speedSnapshot, 0);
        const first = resolveSpeedRoundAnswer(
            speedSnapshot,
            initial,
            { questionIndex: 0, optionToken: "option-a" },
            1_000,
        );
        if (!first.ok) throw new Error("Expected first answer to resolve");

        expect(createVerifiedGameScore(speedSnapshot, first.state)).toBeNull();

        const second = resolveSpeedRoundAnswer(
            speedSnapshot,
            first.state,
            { questionIndex: 1, optionToken: "option-c" },
            2_720,
        );
        if (!second.ok) throw new Error("Expected second answer to resolve");

        expect(second.completed).toBe(true);
        expect(createVerifiedGameScore(speedSnapshot, second.state)).toEqual({
            gameType: "speed_round",
            score: 435,
            accuracy: 100,
            maxStreak: 2,
            questionCount: 2,
            timeTakenSeconds: 2,
        });
    });
});

describe("server-owned Word Matching scoring", () => {
    it("creates opaque public tile collections without pairing keys", () => {
        const board = getPlayableWordMatchingBoard(matchingSnapshot);

        expect(board).toEqual({
            words: [
                { token: "word-1", text: "kitap" },
                { token: "word-2", text: "kalem" },
            ],
            meanings: [
                { token: "meaning-1", text: "book" },
                { token: "meaning-2", text: "pen" },
            ],
        });
        expect(board).not.toHaveProperty("pairs");
    });

    it("uses opaque pairing in the server snapshot and applies the deterministic penalty", () => {
        const progress = createWordMatchingProgress(matchingSnapshot, 1_000);
        const wrong = resolveWordMatchingAttempt(
            matchingSnapshot,
            progress,
            { wordTileToken: "word-1", meaningTileToken: "meaning-2" },
            2_000,
        );
        if (!wrong.ok) throw new Error("Expected wrong pair to resolve");

        expect(wrong).toMatchObject({ ok: true, isCorrect: false, pointsEarned: 0, completed: false });
        expect(wrong.state).toMatchObject({ mistakes: 1, score: 0, currentStep: 0 });

        const correct = resolveWordMatchingAttempt(
            matchingSnapshot,
            wrong.state,
            { wordTileToken: "word-1", meaningTileToken: "meaning-1" },
            3_000,
        );
        if (!correct.ok) throw new Error("Expected correct pair to resolve");

        // Match score is based on all server-recorded mistakes, rather than a
        // client-supplied score delta.
        expect(correct.state).toMatchObject({ score: 90, mistakes: 1, currentStep: 1 });
    });

    it("rejects invalid and reused tiles without changing the state", () => {
        const progress = createWordMatchingProgress(matchingSnapshot, 0);

        expect(resolveWordMatchingAttempt(
            matchingSnapshot,
            progress,
            { wordTileToken: "word-1", meaningTileToken: "invented" },
            1_000,
        )).toMatchObject({ ok: false, error: "invalid_tile" });

        const first = resolveWordMatchingAttempt(
            matchingSnapshot,
            progress,
            { wordTileToken: "word-1", meaningTileToken: "meaning-1" },
            1_000,
        );
        if (!first.ok) throw new Error("Expected match to resolve");

        expect(resolveWordMatchingAttempt(
            matchingSnapshot,
            first.state,
            { wordTileToken: "word-1", meaningTileToken: "meaning-1" },
            2_000,
        )).toMatchObject({ ok: false, error: "already_matched" });
    });

    it("expires timed rounds from the server deadline and never emits a verified score", () => {
        const progress = createWordMatchingProgress(matchingSnapshot, 1_000);
        const expired = resolveWordMatchingAttempt(
            matchingSnapshot,
            progress,
            { wordTileToken: "word-1", meaningTileToken: "meaning-1" },
            61_000,
        );

        expect(expired).toMatchObject({ ok: false, error: "session_expired" });
        if (expired.ok) return;
        expect(expired.state.status).toBe("expired");
        expect(createVerifiedGameScore(matchingSnapshot, expired.state)).toBeNull();
    });

    it("creates one verified result after the final server-validated pair", () => {
        const initial = createWordMatchingProgress(matchingSnapshot, 0);
        const first = resolveWordMatchingAttempt(
            matchingSnapshot,
            initial,
            { wordTileToken: "word-1", meaningTileToken: "meaning-1" },
            2_000,
        );
        if (!first.ok) throw new Error("Expected first pair to resolve");
        const final = resolveWordMatchingAttempt(
            matchingSnapshot,
            first.state,
            { wordTileToken: "word-2", meaningTileToken: "meaning-2" },
            5_000,
        );
        if (!final.ok) throw new Error("Expected final pair to resolve");

        expect(final).toMatchObject({ completed: true, isCorrect: true, pointsEarned: 100 });
        expect(createVerifiedGameScore(matchingSnapshot, final.state)).toEqual({
            gameType: "word_matching",
            score: 200,
            accuracy: 100,
            maxStreak: 0,
            questionCount: 2,
            timeTakenSeconds: 5,
        });

        expect(resolveWordMatchingAttempt(
            matchingSnapshot,
            final.state,
            { wordTileToken: "word-2", meaningTileToken: "meaning-2" },
            6_000,
        )).toMatchObject({ ok: false, error: "session_not_active" });
    });

    it("keeps relaxed Word Matching results out of the competitive leaderboard", () => {
        const relaxedSnapshot: WordMatchingSessionSnapshot = {
            ...matchingSnapshot,
            timeLimitSeconds: null,
        };
        const initial = createWordMatchingProgress(relaxedSnapshot, 0);
        const first = resolveWordMatchingAttempt(
            relaxedSnapshot,
            initial,
            { wordTileToken: "word-1", meaningTileToken: "meaning-1" },
            2_000,
        );
        if (!first.ok) throw new Error("Expected first relaxed match to resolve");
        const final = resolveWordMatchingAttempt(
            relaxedSnapshot,
            first.state,
            { wordTileToken: "word-2", meaningTileToken: "meaning-2" },
            5_000,
        );
        if (!final.ok) throw new Error("Expected relaxed board to complete");

        expect(final.completed).toBe(true);
        expect(createVerifiedGameScore(relaxedSnapshot, final.state)).toBeNull();
    });
});
