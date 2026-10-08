import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, gt, ilike, inArray, lt, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { meanings } from "@/db/schema/meanings";
import { relatedWords } from "@/db/schema/related_words";
import { wordRelationSuggestions as suggestions } from "@/db/schema/word_relation_suggestions";
import { words } from "@/db/schema/words";
import { SUGGESTION_SORT_ORDERS, SUGGESTION_STATUSES, SYMMETRIC_RELATION_TYPES, type SymmetricRelationType } from "@/src/lib/word-relation-suggestions";
import { adminProcedure } from "../../trpc";
import type { db as applicationDb } from "@/db";

type Database = typeof applicationDb;
const cursorSchema = z.object({ score: z.number().min(0).max(3), confidence: z.number().min(0).max(1), id: z.number().int().positive() });
export const suggestionListInput = z.object({
  query: z.string().trim().max(100).default(""),
  wordId: z.number().int().positive().optional(),
  minScore: z.number().min(0).max(3).default(2),
  maxScore: z.number().min(0).max(3).default(3),
  minConfidence: z.number().min(0).max(1).default(0),
  maxConfidence: z.number().min(0).max(1).default(1),
  sort: z.enum(SUGGESTION_SORT_ORDERS).default("score_desc"),
  status: z.enum([...SUGGESTION_STATUSES, "all"]).default("pending"),
  limit: z.number().int().min(1).max(50).default(50),
  cursor: cursorSchema.nullish(),
}).refine((input) => input.minScore <= input.maxScore, { message: "Invalid score range", path: ["maxScore"] })
  .refine((input) => input.minConfidence <= input.maxConfidence, { message: "Invalid confidence range", path: ["maxConfidence"] });
type DirectionalScore = { sourceWordId: number; candidateWordId: number; score: number; confidence: number };
const pairCondition = (wordId: number, relatedWordId: number) => or(
  and(eq(relatedWords.wordId, wordId), eq(relatedWords.relatedWordId, relatedWordId)),
  and(eq(relatedWords.wordId, relatedWordId), eq(relatedWords.relatedWordId, wordId)),
);

export async function listWordRelationSuggestions(db: Database, input: z.infer<typeof suggestionListInput>) {
  const left = alias(words, "suggestion_left");
  const right = alias(words, "suggestion_right");
  const forward = alias(relatedWords, "suggestion_forward");
  const reverse = alias(relatedWords, "suggestion_reverse");
  const cursor = input.cursor;
  const lowestFirst = input.sort === "score_asc";
  const term = `%${input.query.replace(/[\\%_]/g, "\\$&")}%`;
  const rows = await db.select({
    id: suggestions.id, wordId: suggestions.wordId, relatedWordId: suggestions.relatedWordId,
    word: left.name, relatedWord: right.name, score: suggestions.score, confidence: suggestions.confidence,
    status: suggestions.status, model: suggestions.model, scoredAt: suggestions.scoredAt,
    forwardWordId: forward.wordId, forwardType: forward.relationType,
    reverseWordId: reverse.wordId, reverseType: reverse.relationType,
    directionalScores: sql<DirectionalScore[]>`COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'sourceWordId', e->'sourceWordId', 'candidateWordId', e->'candidateWordId',
      'score', e->'score', 'confidence', e->'confidence')) FROM jsonb_array_elements(${suggestions.evidence}) e), '[]'::jsonb)`,
  }).from(suggestions)
    .innerJoin(left, eq(left.id, suggestions.wordId))
    .innerJoin(right, eq(right.id, suggestions.relatedWordId))
    .leftJoin(forward, and(eq(forward.wordId, suggestions.wordId), eq(forward.relatedWordId, suggestions.relatedWordId)))
    .leftJoin(reverse, and(eq(reverse.wordId, suggestions.relatedWordId), eq(reverse.relatedWordId, suggestions.wordId)))
    .where(and(
      gte(suggestions.score, input.minScore),
      lte(suggestions.score, input.maxScore),
      gte(suggestions.confidence, input.minConfidence),
      lte(suggestions.confidence, input.maxConfidence),
      input.status === "all" ? undefined : eq(suggestions.status, input.status),
      input.wordId ? or(eq(suggestions.wordId, input.wordId), eq(suggestions.relatedWordId, input.wordId)) : undefined,
      input.query ? or(ilike(left.name, term), ilike(right.name, term)) : undefined,
      cursor ? or(lowestFirst ? gt(suggestions.score, cursor.score) : lt(suggestions.score, cursor.score),
        and(eq(suggestions.score, cursor.score), lt(suggestions.confidence, cursor.confidence)),
        and(eq(suggestions.score, cursor.score), eq(suggestions.confidence, cursor.confidence), gt(suggestions.id, cursor.id))) : undefined,
    )).orderBy(lowestFirst ? asc(suggestions.score) : desc(suggestions.score), desc(suggestions.confidence), asc(suggestions.id)).limit(input.limit + 1);
  const hasMore = rows.length > input.limit;
  const items = rows.slice(0, input.limit).map(({ forwardWordId, forwardType, reverseWordId, reverseType, ...row }) => ({
    ...row, forwardType: forwardWordId === null ? null : forwardType ?? "relatedWord",
    reverseType: reverseWordId === null ? null : reverseType ?? "relatedWord",
  }));
  const last = items.at(-1);
  return { items, nextCursor: hasMore && last ? { score: last.score, confidence: last.confidence, id: last.id } : null };
}

export async function acceptWordRelationSuggestion(db: Database, id: number, relationType: SymmetricRelationType, reviewerId: string) {
  return db.transaction(async (tx) => {
    const [suggestion] = await tx.select().from(suggestions).where(eq(suggestions.id, id)).limit(1).for("update");
    if (!suggestion) throw new TRPCError({ code: "NOT_FOUND", message: "Suggestion not found" });
    if (suggestion.wordId === suggestion.relatedWordId) throw new TRPCError({ code: "BAD_REQUEST", message: "Self-links are not allowed" });
    if (suggestion.status === "dismissed") throw new TRPCError({ code: "CONFLICT", message: "Restore the suggestion before accepting it" });
    const currentWords = await tx.select({ id: words.id }).from(words)
      .where(inArray(words.id, [suggestion.wordId, suggestion.relatedWordId])).orderBy(asc(words.id)).for("update");
    if (currentWords.length !== 2) throw new TRPCError({ code: "NOT_FOUND", message: "A word no longer exists" });
    const existing = await tx.select().from(relatedWords).where(pairCondition(suggestion.wordId, suggestion.relatedWordId)).for("update");
    if (existing.some((row) => (row.relationType ?? "relatedWord") !== relationType)) {
      throw new TRPCError({ code: "CONFLICT", message: "An existing relation has a different type. Edit it in the manual editor first." });
    }
    await tx.insert(relatedWords).values([
      { wordId: suggestion.wordId, relatedWordId: suggestion.relatedWordId, relationType, userId: reviewerId },
      { wordId: suggestion.relatedWordId, relatedWordId: suggestion.wordId, relationType, userId: reviewerId },
    ]).onConflictDoNothing();
    // Recheck after insert so a competing writer cannot be silently overwritten or accepted.
    const saved = await tx.select().from(relatedWords).where(pairCondition(suggestion.wordId, suggestion.relatedWordId));
    if (saved.length !== 2 || saved.some((row) => (row.relationType ?? "relatedWord") !== relationType)) {
      throw new TRPCError({ code: "CONFLICT", message: "Relation changed during review. Reload and try again." });
    }
    if (suggestion.status !== "accepted") {
      await tx.update(suggestions).set({ status: "accepted", reviewedBy: reviewerId, reviewedAt: new Date() }).where(eq(suggestions.id, id));
    }
    return { success: true as const, wordIds: [suggestion.wordId, suggestion.relatedWordId] };
  });
}

export async function reviewWordRelationSuggestion(db: Database, id: number, action: "dismiss" | "restore", reviewerId: string) {
  return db.transaction(async (tx) => {
    const [suggestion] = await tx.select({ status: suggestions.status }).from(suggestions).where(eq(suggestions.id, id)).limit(1).for("update");
    if (!suggestion) throw new TRPCError({ code: "NOT_FOUND", message: "Suggestion not found" });
    if (suggestion.status === "accepted") throw new TRPCError({ code: "CONFLICT", message: "Accepted suggestions cannot be dismissed or restored" });
    const status = action === "dismiss" ? "dismissed" : "pending";
    if (suggestion.status !== status) {
      await tx.update(suggestions).set({ status, reviewedBy: reviewerId, reviewedAt: new Date() }).where(eq(suggestions.id, id));
    }
    return { success: true as const };
  });
}

const idInput = z.object({ id: z.number().int().positive() });
export const wordRelationSuggestionProcedures = {
  getSuggestions: adminProcedure.input(suggestionListInput).query(({ input, ctx }) => listWordRelationSuggestions(ctx.db, input)),
  getSuggestionDetails: adminProcedure.input(idInput).query(async ({ input, ctx }) => {
    const [suggestion] = await ctx.db.select().from(suggestions).where(eq(suggestions.id, input.id));
    if (!suggestion) throw new TRPCError({ code: "NOT_FOUND", message: "Suggestion not found" });
    const currentMeanings = await ctx.db.select({ wordId: meanings.wordId, meaning: meanings.meaning }).from(meanings)
      .where(inArray(meanings.wordId, [suggestion.wordId, suggestion.relatedWordId])).orderBy(asc(meanings.order), asc(meanings.id));
    return { evidence: suggestion.evidence, currentMeanings, runKey: suggestion.runKey, model: suggestion.model, scoredAt: suggestion.scoredAt };
  }),
  acceptSuggestion: adminProcedure.input(idInput.extend({ relationType: z.enum(SYMMETRIC_RELATION_TYPES) }))
    .mutation(({ input, ctx }) => acceptWordRelationSuggestion(ctx.db, input.id, input.relationType, ctx.session.user.id)),
  dismissSuggestion: adminProcedure.input(idInput).mutation(({ input, ctx }) => reviewWordRelationSuggestion(ctx.db, input.id, "dismiss", ctx.session.user.id)),
  restoreSuggestion: adminProcedure.input(idInput).mutation(({ input, ctx }) => reviewWordRelationSuggestion(ctx.db, input.id, "restore", ctx.session.user.id)),
};
