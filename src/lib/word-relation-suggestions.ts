import { z } from "zod";

export const SYMMETRIC_RELATION_TYPES = ["relatedWord", "synonym", "antonym", "see_also"] as const;
export const SUGGESTION_STATUSES = ["pending", "accepted", "dismissed"] as const;
export const SUGGESTION_SORT_ORDERS = ["score_desc", "score_asc"] as const;
export type SymmetricRelationType = (typeof SYMMETRIC_RELATION_TYPES)[number];

export const scoredPairSchema = z.object({
  sourceWordId: z.number().int().positive(),
  sourceWord: z.string().min(1),
  sourceMeanings: z.array(z.string()),
  sourceMeaningsTruncated: z.boolean(),
  candidateWordId: z.number().int().positive(),
  candidateWord: z.string().min(1),
  candidateMeanings: z.array(z.string()),
  candidateMeaningsTruncated: z.boolean(),
  candidateRank: z.number().int().positive(),
  retrievalScore: z.number().finite(),
  score: z.number().finite().min(0).max(3),
  confidence: z.number().finite().min(0).max(1),
  probabilities: z.object({
    "0": z.number().min(0).max(1), "1": z.number().min(0).max(1),
    "2": z.number().min(0).max(1), "3": z.number().min(0).max(1),
  }).refine((value) => Math.abs(Object.values(value).reduce((a, b) => a + b, 0) - 1) <= 0.020001),
}).refine((pair) => pair.sourceWordId !== pair.candidateWordId, "Self-links are not suggestions");

export const scoredBatchSchema = z.object({
  runKey: z.string().regex(/^[a-f0-9]{64}$/),
  model: z.string().min(1),
  inputTokens: z.number().int().nonnegative(),
  results: z.array(scoredPairSchema).min(1),
});

export type ScoredPair = z.infer<typeof scoredPairSchema>;
export type SuggestionEvidence = ScoredPair & { model: string };
export type ImportedSuggestion = {
  wordId: number; relatedWordId: number; score: number; confidence: number;
  evidence: SuggestionEvidence[];
};

// Keep provider scores intact, including disagreements between the two directions.
export function mergeScoredPair(pairs: Map<string, ImportedSuggestion>, pair: ScoredPair, model: string) {
  const wordId = Math.min(pair.sourceWordId, pair.candidateWordId);
  const relatedWordId = Math.max(pair.sourceWordId, pair.candidateWordId);
  const key = `${wordId}:${relatedWordId}`;
  const existing = pairs.get(key);
  if (!existing) {
    pairs.set(key, { wordId, relatedWordId, score: pair.score, confidence: pair.confidence, evidence: [{ ...pair, model }] });
    return;
  }
  if (existing.evidence.some((item) => item.sourceWordId === pair.sourceWordId)) {
    throw new Error(`Duplicate directed score: ${pair.sourceWordId}:${pair.candidateWordId}`);
  }
  existing.evidence.push({ ...pair, model });
  if (pair.score > existing.score || (pair.score === existing.score && pair.confidence > existing.confidence)) {
    existing.score = pair.score;
    existing.confidence = pair.confidence;
  }
}

export function validateWordIdentities(expected: Map<number, string>, current: Map<number, string>) {
  const missing = new Set<number>();
  for (const [id, name] of expected) {
    if (!current.has(id)) missing.add(id);
    else if (current.get(id) !== name) throw new Error(`Word identity mismatch for ID ${id}; import stopped before writing.`);
  }
  return missing;
}
