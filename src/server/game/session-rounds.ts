import "server-only";

export type MeaningCandidate = {
    meaningId: number;
    meaning: string;
    /**
     * These are server-only ranking signals. They never leave the persisted
     * snapshot, so a rated player still cannot infer the correct option.
     */
    wordId?: number;
    word?: string;
    partOfSpeechId?: number | null;
    /** Source words that have an explicit non-obsolete relation to this one. */
    relatedToWordIds?: readonly number[];
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

export type WordMatchingWrongAttempt = {
    wordToken: string;
    meaningToken: string;
};

export type WordMatchingReviewPair = {
    wordId: number;
    word: string;
    meaning: string;
    matched: boolean;
    mistakeCount: number;
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

const DEFINITION_STOP_WORDS = new Set([
    "ama", "ancak", "bir", "bu", "da", "de", "gibi", "için", "ile", "ki", "olan", "olarak", "ve", "veya", "ya",
]);

function definitionTokens(value: string): Set<string> {
    return new Set(
        normalizeVisibleText(value)
            .replace(/[^\p{L}\p{N}]+/gu, " ")
            .split(" ")
            .filter((token) => token.length > 2 && !DEFINITION_STOP_WORDS.has(token)),
    );
}

function sharedDefinitionTokenCount(first: string, second: string): number {
    const firstTokens = definitionTokens(first);
    const secondTokens = definitionTokens(second);
    let shared = 0;

    for (const token of firstTokens) {
        if (secondTokens.has(token)) shared += 1;
    }

    return shared;
}

function difficultyDistance(first: MeaningCandidate, second: MeaningCandidate): number {
    const firstPromptLength = [...(first.word ?? "")].length;
    const secondPromptLength = [...(second.word ?? "")].length;
    const firstMeaningLength = [...normalizeVisibleText(first.meaning)].length;
    const secondMeaningLength = [...normalizeVisibleText(second.meaning)].length;
    const firstTokenCount = definitionTokens(first.meaning).size;
    const secondTokenCount = definitionTokens(second.meaning).size;

    return Math.abs(firstPromptLength - secondPromptLength) * 3
        + Math.abs(firstMeaningLength - secondMeaningLength)
        + Math.abs(firstTokenCount - secondTokenCount) * 8;
}

function decoyRank(target: RoundCandidate, decoy: MeaningCandidate): number {
    const isCuratedRelation = decoy.relatedToWordIds?.includes(target.wordId) ?? false;
    const samePartOfSpeech = target.partOfSpeechId !== null
        && target.partOfSpeechId !== undefined
        && target.partOfSpeechId === decoy.partOfSpeechId;
    const semanticOverlap = sharedDefinitionTokenCount(target.meaning, decoy.meaning);
    const complexityDistance = difficultyDistance(target, decoy);

    // Relations are the strongest available semantic signal. The remaining
    // signals make uncurated distractors feel comparable instead of random.
    return (isCuratedRelation ? 10_000 : 0)
        + (samePartOfSpeech ? 1_000 : 0)
        + semanticOverlap * 120
        + Math.max(0, 180 - complexityDistance);
}

function chooseDecoys(target: RoundCandidate, decoyPool: readonly MeaningCandidate[]): MeaningCandidate[] {
    const targetMeaning = normalizeVisibleText(target.meaning);
    const eligible = distinctBy(
        decoyPool.filter((decoy) => (
            decoy.meaningId !== target.meaningId
            && decoy.wordId !== target.wordId
            && normalizeVisibleText(decoy.meaning) !== targetMeaning
        )),
        (decoy) => normalizeVisibleText(decoy.meaning),
    );

    // Shuffle before the stable sort so options with equal evidence remain
    // varied between rounds without diluting stronger evidence.
    return shuffle(eligible)
        .sort((first, second) => decoyRank(target, second) - decoyRank(target, first))
        .slice(0, 3);
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

        const decoys = chooseDecoys(candidate, decoyPool);

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

/**
 * Reveal the authoritative answer map only after a matching session has ended.
 * A wrong connection makes both correct pairs worth revisiting: the selected
 * word's pair and the selected meaning's pair.
 */
export function createWordMatchingReview(
    snapshot: WordMatchingSnapshot,
    matchedWordTokens: readonly string[],
    wrongAttempts: readonly WordMatchingWrongAttempt[],
): WordMatchingReviewPair[] {
    const matchedTokens = new Set(matchedWordTokens);
    const mistakeCounts = new Map<string, number>();

    for (const attempt of wrongAttempts) {
        const wordPair = snapshot.pairs.find((pair) => pair.wordToken === attempt.wordToken);
        const meaningPair = snapshot.pairs.find((pair) => pair.meaningToken === attempt.meaningToken);

        if (wordPair) {
            mistakeCounts.set(wordPair.wordToken, (mistakeCounts.get(wordPair.wordToken) ?? 0) + 1);
        }
        if (meaningPair && meaningPair.wordToken !== wordPair?.wordToken) {
            mistakeCounts.set(meaningPair.wordToken, (mistakeCounts.get(meaningPair.wordToken) ?? 0) + 1);
        }
    }

    return snapshot.wordOrder.flatMap((wordToken) => {
        const pair = snapshot.pairs.find((item) => item.wordToken === wordToken);
        if (!pair) return [];

        return [{
            wordId: pair.wordId,
            word: pair.word,
            meaning: pair.meaning,
            matched: matchedTokens.has(pair.wordToken),
            mistakeCount: mistakeCounts.get(pair.wordToken) ?? 0,
        }];
    });
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
