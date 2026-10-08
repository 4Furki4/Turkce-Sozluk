import { sql } from "drizzle-orm";
import { check, doublePrecision, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";
import { words } from "./words";
import type { SuggestionEvidence } from "../../src/lib/word-relation-suggestions";

export const wordRelationSuggestionStatus = pgEnum("word_relation_suggestion_status", ["pending", "accepted", "dismissed"]);

export const wordRelationSuggestions = pgTable("word_relation_suggestions", {
  id: serial("id").primaryKey(),
  runKey: text("run_key").notNull(),
  model: text("model").notNull(),
  scoredAt: timestamp("scored_at", { withTimezone: true }).notNull(),
  wordId: integer("word_id").notNull().references(() => words.id, { onDelete: "cascade" }),
  relatedWordId: integer("related_word_id").notNull().references(() => words.id, { onDelete: "cascade" }),
  score: doublePrecision("score").notNull(),
  confidence: doublePrecision("confidence").notNull(),
  evidence: jsonb("evidence").$type<SuggestionEvidence[]>().notNull(),
  status: wordRelationSuggestionStatus("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("word_relation_suggestions_run_pair_idx").on(table.runKey, table.wordId, table.relatedWordId),
  index("word_relation_suggestions_rank_idx").on(table.status, table.score.desc(), table.confidence.desc(), table.id),
  index("word_relation_suggestions_word_idx").on(table.wordId),
  index("word_relation_suggestions_related_word_idx").on(table.relatedWordId),
  check("word_relation_suggestions_pair_order", sql`${table.wordId} < ${table.relatedWordId}`),
  check("word_relation_suggestions_score_range", sql`${table.score} BETWEEN 0 AND 3`),
  check("word_relation_suggestions_confidence_range", sql`${table.confidence} BETWEEN 0 AND 1`),
]);
