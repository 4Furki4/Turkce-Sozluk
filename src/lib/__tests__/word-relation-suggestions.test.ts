import { mergeScoredPair, scoredPairSchema, validateWordIdentities, type ImportedSuggestion, type ScoredPair } from "../word-relation-suggestions";

const pair: ScoredPair = {
  sourceWordId: 2, sourceWord: "iki", sourceMeanings: ["Kaynak anlam"], sourceMeaningsTruncated: false,
  candidateWordId: 9, candidateWord: "dokuz", candidateMeanings: ["Hedef anlam"], candidateMeaningsTruncated: false,
  candidateRank: 1, retrievalScore: 12, score: 2.5, confidence: 0.8,
  probabilities: { "0": 0, "1": 0, "2": 0.5, "3": 0.5 },
};

test("reciprocal scores produce one canonical pair while retaining both meanings and scores", () => {
  const pairs = new Map<string, ImportedSuggestion>();
  mergeScoredPair(pairs, pair, "jev-test");
  mergeScoredPair(pairs, { ...pair, sourceWordId: 9, sourceWord: "dokuz", candidateWordId: 2, candidateWord: "iki", score: 2.9, confidence: 0.6 }, "jev-test");
  expect(pairs.size).toBe(1);
  expect(pairs.get("2:9")).toMatchObject({ wordId: 2, relatedWordId: 9, score: 2.9, confidence: 0.6 });
  expect(pairs.get("2:9")!.evidence).toHaveLength(2);
  expect(pairs.get("2:9")!.evidence[0].sourceMeanings).toEqual(["Kaynak anlam"]);
});

test("equal scores select the corresponding highest confidence", () => {
  const pairs = new Map<string, ImportedSuggestion>();
  mergeScoredPair(pairs, pair, "jev-test");
  mergeScoredPair(pairs, { ...pair, sourceWordId: 9, candidateWordId: 2, confidence: 0.95 }, "jev-test");
  expect(pairs.get("2:9")!.confidence).toBe(0.95);
});

test("duplicate directed scores are rejected rather than counted twice", () => {
  const pairs = new Map<string, ImportedSuggestion>();
  mergeScoredPair(pairs, pair, "jev-test");
  expect(() => mergeScoredPair(pairs, pair, "jev-test")).toThrow("Duplicate directed score");
});

test("mismatched word identities abort; absent words can be reported and skipped", () => {
  expect(() => validateWordIdentities(new Map([[2, "iki"]]), new Map([[2, "farklı"]]))).toThrow("identity mismatch");
  expect([...validateWordIdentities(new Map([[2, "iki"], [9, "dokuz"]]), new Map([[2, "iki"]]))]).toEqual([9]);
});

test("self-links and invalid scores are rejected; rounded probabilities are accepted", () => {
  expect(scoredPairSchema.safeParse({ ...pair, sourceWordId: 9 }).success).toBe(false);
  expect(scoredPairSchema.safeParse({ ...pair, score: 3.01 }).success).toBe(false);
  expect(scoredPairSchema.safeParse({ ...pair, probabilities: { "0": 0.54, "1": 0.4, "2": 0.05, "3": 0 } }).success).toBe(true);
});
