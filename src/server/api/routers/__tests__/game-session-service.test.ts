jest.mock("server-only", () => ({}));

let generatedToken = 0;
Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: { randomUUID: () => `test-token-${generatedToken++}` },
});

import {
    createSpeedRoundSnapshot,
    createWordMatchingSnapshot,
    redactSpeedRoundQuestion,
    redactWordMatchingBoard,
    type SpeedRoundSnapshot,
    type WordMatchingSnapshot,
} from "@/src/server/game/session-rounds";

describe("rated game session public projections", () => {
    it("never gives Speed Round duplicate visible answer labels", () => {
        const snapshot = createSpeedRoundSnapshot(
            [{ wordId: 1, word: "başlangıç", meaningId: 11, meaning: "Tanım" }],
            [
                { meaningId: 12, meaning: "tanım" },
                { meaningId: 13, meaning: "başka" },
                { meaningId: 14, meaning: "BAŞKA" },
                { meaningId: 15, meaning: "üçüncü" },
                { meaningId: 16, meaning: "dördüncü" },
                { meaningId: 17, meaning: "beşinci" },
            ],
            1,
        );

        expect(snapshot).not.toBeNull();
        const labels = snapshot!.questions[0]!.options.map((option) => option.meaning.trim().toLocaleLowerCase("tr-TR"));
        expect(new Set(labels).size).toBe(labels.length);
    });

    it("prefers curated semantic relations and comparable parts of speech over random decoys", () => {
        const snapshot = createSpeedRoundSnapshot(
            [{
                wordId: 1,
                word: "kitap",
                meaningId: 11,
                meaning: "Yazılı yapraklardan oluşan eser",
                partOfSpeechId: 1,
            }],
            [
                {
                    meaningId: 12,
                    wordId: 2,
                    word: "dergi",
                    meaning: "Belirli aralıklarla yayımlanan basılı yayın",
                    partOfSpeechId: 3,
                    relatedToWordIds: [1],
                },
                {
                    meaningId: 13,
                    wordId: 3,
                    word: "roman",
                    meaning: "Uzun yazılı eser",
                    partOfSpeechId: 1,
                },
                {
                    meaningId: 14,
                    wordId: 4,
                    word: "defter",
                    meaning: "Yazılı yaprakların bir araya getirilmesiyle oluşan nesne",
                    partOfSpeechId: 1,
                },
                {
                    meaningId: 15,
                    wordId: 5,
                    word: "yağış",
                    meaning: "Atmosferdeki su buharının yoğunlaşması olayı",
                    partOfSpeechId: 4,
                },
            ],
            1,
        );

        expect(snapshot).not.toBeNull();
        const labels = snapshot!.questions[0]!.options.map((option) => option.meaning);
        expect(labels).toEqual(expect.arrayContaining([
            "Belirli aralıklarla yayımlanan basılı yayın",
            "Uzun yazılı eser",
            "Yazılı yaprakların bir araya getirilmesiyle oluşan nesne",
        ]));
        expect(labels).not.toContain("Atmosferdeki su buharının yoğunlaşması olayı");
    });

    it("falls back to distinct labels when metadata is unavailable", () => {
        const snapshot = createSpeedRoundSnapshot(
            [{ wordId: 1, word: "başlangıç", meaningId: 11, meaning: "Tanım" }],
            [
                { meaningId: 12, meaning: "tanım" },
                { meaningId: 13, meaning: "başka" },
                { meaningId: 14, meaning: "BAŞKA" },
                { meaningId: 15, meaning: "üçüncü" },
                { meaningId: 16, meaning: "dördüncü" },
            ],
            1,
        );

        expect(snapshot).not.toBeNull();
        const labels = snapshot!.questions[0]!.options.map((option) => option.meaning.trim().toLocaleLowerCase("tr-TR"));
        expect(labels).toHaveLength(4);
        expect(new Set(labels).size).toBe(labels.length);
    });

    it("never gives Word Matching duplicate visible words or meanings", () => {
        const snapshot = createWordMatchingSnapshot(
            [
                { wordId: 1, word: "kitap", meaningId: 11, meaning: "book" },
                { wordId: 2, word: "KİTAP", meaningId: 12, meaning: "volume" },
                { wordId: 3, word: "kalem", meaningId: 13, meaning: "book" },
                { wordId: 4, word: "masa", meaningId: 14, meaning: "table" },
                { wordId: 5, word: "defter", meaningId: 15, meaning: "notebook" },
            ],
            3,
        );

        expect(snapshot).not.toBeNull();
        const words = snapshot!.pairs.map((pair) => pair.word.trim().toLocaleLowerCase("tr-TR"));
        const meanings = snapshot!.pairs.map((pair) => pair.meaning.trim().toLocaleLowerCase("tr-TR"));
        expect(new Set(words).size).toBe(words.length);
        expect(new Set(meanings).size).toBe(meanings.length);
    });

    it("keeps the Speed Round answer key and database identifiers on the server", () => {
        const snapshot: SpeedRoundSnapshot = {
            kind: "speed_round",
            questions: [{
                token: "question-token",
                wordId: 101,
                word: "kitap",
                correctOptionToken: "correct-token",
                options: [
                    { token: "correct-token", meaningId: 201, meaning: "book" },
                    { token: "decoy-token", meaningId: 202, meaning: "pen" },
                ],
            }],
        };

        const response = redactSpeedRoundQuestion(snapshot.questions[0]);

        expect(response).toEqual({
            token: "question-token",
            word: "kitap",
            options: [
                { token: "correct-token", meaning: "book" },
                { token: "decoy-token", meaning: "pen" },
            ],
        });
        expect(JSON.stringify(response)).not.toContain("correctOptionToken");
        expect(JSON.stringify(response)).not.toContain("wordId");
        expect(JSON.stringify(response)).not.toContain("meaningId");
    });

    it("publishes independently ordered matching columns without pair metadata", () => {
        const snapshot: WordMatchingSnapshot = {
            kind: "word_matching",
            pairs: [
                {
                    wordToken: "word-a",
                    wordId: 1,
                    word: "kitap",
                    meaningToken: "meaning-a",
                    meaningId: 11,
                    meaning: "book",
                },
                {
                    wordToken: "word-b",
                    wordId: 2,
                    word: "kalem",
                    meaningToken: "meaning-b",
                    meaningId: 12,
                    meaning: "pen",
                },
            ],
            wordOrder: ["word-b", "word-a"],
            meaningOrder: ["meaning-a", "meaning-b"],
        };

        const board = redactWordMatchingBoard(snapshot);

        expect(board).toEqual({
            words: [
                { token: "word-b", word: "kalem" },
                { token: "word-a", word: "kitap" },
            ],
            meanings: [
                { token: "meaning-a", meaning: "book" },
                { token: "meaning-b", meaning: "pen" },
            ],
        });
        expect(JSON.stringify(board)).not.toContain("wordId");
        expect(JSON.stringify(board)).not.toContain("meaningId");
        expect(JSON.stringify(board)).not.toContain("pairId");
    });
});
