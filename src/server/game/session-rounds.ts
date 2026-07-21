import "server-only";

type MeaningCandidate = {
    meaningId: number;
    meaning: string;
};

export type RoundCandidate = MeaningCandidate & {
    wordId: number;
    word: string;
};

export type SpeedRoundOption = MeaningCandidate & {
    token: string;
};

export type SpeedRoundQuestion = {
    token: string;
    wordId: number;
    word: string;
    correctOptionToken: string;
    options: SpeedRoundOption[];
};

export type SpeedRoundSnapshot = {
    kind: "speed_round";
    questions: SpeedRoundQuestion[];
};

export type WordMatchingPair = {
    wordToken: string;
    wordId: number;
    word: string;
    meaningToken: string;
    meaningId: number;
    meaning: string;
};

export type WordMatchingSnapshot = {
    kind: "word_matching";
    pairs: WordMatchingPair[];
    wordOrder: string[];
    meaningOrder: string[];
};

export type RatedGameSnapshot = SpeedRoundSnapshot | WordMatchingSnapshot;

function shuffle<T>(values: readonly T[]): T[] {
    const shuffled = [...values];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
}

function distinctBy<T>(values: readonly T[], key: (value: T) => string | number): T[] {
    const seen = new Set<string | number>();
    return values.filter((value) => {
        const valueKey = key(value);
        if (seen.has(valueKey)) return false;
        seen.add(valueKey);
        return true;
    });
}

/**
 * Tokens keep the server-side mapping opaque, but players still need every
 * visible label in a round to be distinguishable. Normalize the display text
 * before choosing candidates so duplicate database rows cannot create an
 * impossible-to-resolve option or tile.
 */
function normalizeVisibleText(value: string): string {
    return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

export function createSpeedRoundSnapshot(
    candidates: readonly RoundCandidate[],
    decoyPool: readonly MeaningCandidate[],
    questionCount: number,
): SpeedRoundSnapshot | null {
    const questions: SpeedRoundQuestion[] = [];
    const uniqueCandidates = distinctBy(
        distinctBy(candidates, (candidate) => candidate.wordId),
        (candidate) => normalizeVisibleText(candidate.word),
    );

    for (const candidate of shuffle(uniqueCandidates)) {
        if (questions.length === questionCount) break;

        const candidateMeaning = normalizeVisibleText(candidate.meaning);
        const decoys = shuffle(
            distinctBy(
                decoyPool.filter((decoy) => (
                    decoy.meaningId !== candidate.meaningId
                    && normalizeVisibleText(decoy.meaning) !== candidateMeaning
                )),
                (decoy) => normalizeVisibleText(decoy.meaning),
            ),
        ).slice(0, 3);

        if (decoys.length < 3) continue;

        const correctOption: SpeedRoundOption = {
            meaningId: candidate.meaningId,
            meaning: candidate.meaning,
            token: crypto.randomUUID(),
        };
        const options = shuffle([
            correctOption,
            ...decoys.map((decoy) => ({ ...decoy, token: crypto.randomUUID() })),
        ]);

        questions.push({
            token: crypto.randomUUID(),
            wordId: candidate.wordId,
            word: candidate.word,
            correctOptionToken: correctOption.token,
            options,
        });
    }

    return questions.length === questionCount ? { kind: "speed_round", questions } : null;
}

export function createWordMatchingSnapshot(
    candidates: readonly RoundCandidate[],
    pairCount: number,
): WordMatchingSnapshot | null {
    const selectedCandidates: RoundCandidate[] = [];
    const usedWords = new Set<string>();
    const usedMeanings = new Set<string>();

    for (const candidate of shuffle(distinctBy(candidates, (item) => item.wordId))) {
        if (selectedCandidates.length === pairCount) break;

        const word = normalizeVisibleText(candidate.word);
        const meaning = normalizeVisibleText(candidate.meaning);
        if (!word || !meaning || usedWords.has(word) || usedMeanings.has(meaning)) continue;

        usedWords.add(word);
        usedMeanings.add(meaning);
        selectedCandidates.push(candidate);
    }

    const pairs = selectedCandidates
        .map((candidate) => ({
            wordToken: crypto.randomUUID(),
            wordId: candidate.wordId,
            word: candidate.word,
            meaningToken: crypto.randomUUID(),
            meaningId: candidate.meaningId,
            meaning: candidate.meaning,
        }));

    if (pairs.length !== pairCount) return null;

    return {
        kind: "word_matching",
        pairs,
        wordOrder: shuffle(pairs.map((pair) => pair.wordToken)),
        meaningOrder: shuffle(pairs.map((pair) => pair.meaningToken)),
    };
}

export function redactSpeedRoundQuestion(question: SpeedRoundQuestion | undefined) {
    if (!question) return null;

    return {
        token: question.token,
        word: question.word,
        options: question.options.map((option) => ({
            token: option.token,
            meaning: option.meaning,
        })),
    };
}

export function redactWordMatchingBoard(snapshot: WordMatchingSnapshot) {
    const words = snapshot.wordOrder.map((token) => {
        const pair = snapshot.pairs.find((item) => item.wordToken === token);
        return pair ? { token: pair.wordToken, word: pair.word } : null;
    }).filter((item): item is { token: string; word: string } => item !== null);

    const meanings = snapshot.meaningOrder.map((token) => {
        const pair = snapshot.pairs.find((item) => item.meaningToken === token);
        return pair ? { token: pair.meaningToken, meaning: pair.meaning } : null;
    }).filter((item): item is { token: string; meaning: string } => item !== null);

    return { words, meanings };
}

export function findSpeedRoundQuestion(snapshot: SpeedRoundSnapshot, token: string) {
    return snapshot.questions.find((question) => question.token === token) ?? null;
}

export function findWordMatchingPair(
    snapshot: WordMatchingSnapshot,
    wordToken: string,
    meaningToken: string,
) {
    const wordPair = snapshot.pairs.find((pair) => pair.wordToken === wordToken);
    const meaningPair = snapshot.pairs.find((pair) => pair.meaningToken === meaningToken);

    if (!wordPair || !meaningPair) return null;

    return {
        wordPair,
        meaningPair,
        isCorrect: wordPair.wordToken === meaningPair.wordToken,
    };
}
