import { InferInsertModel, InferSelectModel, relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { languages } from "./languages";
import { meanings } from "./meanings";
import { users } from "./users";
import { words } from "./words";

export const etymologyAbbreviationKind = pgEnum("etymology_abbreviation_kind", [
  "language",
  "dialect",
  "publication",
  "other",
]);

export const etymologyEntryKind = pgEnum("etymology_entry_kind", [
  "article",
  "cross_reference",
]);

export const etymologyTranscriptionStatus = pgEnum("etymology_transcription_status", [
  "ocr",
  "verified",
]);

export const etymologyMatchStatus = pgEnum("etymology_match_status", [
  "candidate",
  "accepted",
  "rejected",
]);

export const etymologyMatchRelation = pgEnum("etymology_match_relation", [
  "same_sense",
  "word_level",
  "related_form",
  "unrelated",
]);

export const etymologyClaimKind = pgEnum("etymology_claim_kind", [
  "origin",
  "derivation",
  "attested_form",
  "comparison",
  "loan_out",
  "cross_reference",
  "unknown_origin",
  "commentary",
]);

export const etymologyClaimStance = pgEnum("etymology_claim_stance", [
  "asserted",
  "proposed",
  "disputed",
  "rejected",
  "unknown",
]);

export const etymologyClaimReviewStatus = pgEnum("etymology_claim_review_status", [
  "candidate",
  "accepted",
  "rejected",
]);

/** Bibliographic identity of a book or other etymological source. */
export const etymologySources = pgTable("etymology_sources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author"),
  edition: text("edition"),
  publicationYear: integer("publication_year"),
  publisher: text("publisher"),
  isbn: varchar("isbn", { length: 32 }),
  documentSha256: varchar("document_sha256", { length: 64 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

/** Abbreviations are scoped to a source: a journal code is not a language code. */
export const etymologyAbbreviations = pgTable("etymology_abbreviations", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull().references(() => etymologySources.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 80 }).notNull(),
  kind: etymologyAbbreviationKind("kind").notNull(),
  expansion: text("expansion").notNull(),
  languageId: integer("language_id").references(() => languages.id),
}, (table) => [
  uniqueIndex("etymology_abbreviations_source_code_kind_unique").on(table.sourceId, table.code, table.kind),
]);

/** A book entry exists even when it has no matching dictionary word. */
export const etymologyEntries = pgTable("etymology_entries", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull().references(() => etymologySources.id, { onDelete: "cascade" }),
  sourceEntryKey: varchar("source_entry_key", { length: 255 }).notNull(),
  headword: text("headword").notNull(),
  gloss: text("gloss"),
  kind: etymologyEntryKind("kind").notNull().default("article"),
  printedPageStart: integer("printed_page_start").notNull(),
  printedPageEnd: integer("printed_page_end"),
  pdfPageStart: integer("pdf_page_start"),
  pdfPageEnd: integer("pdf_page_end"),
  sourceLocator: text("source_locator"),
  ocrText: text("ocr_text"),
  correctedText: text("corrected_text"),
  transcriptionStatus: etymologyTranscriptionStatus("transcription_status").notNull().default("ocr"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("etymology_entries_source_key_unique").on(table.sourceId, table.sourceEntryKey),
  index("etymology_entries_headword_idx").on(table.headword),
]);

/** Candidate matches are reviewed before a source entry is attached to a word. */
export const etymologyMatches = pgTable("etymology_matches", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull().references(() => etymologyEntries.id, { onDelete: "cascade" }),
  wordId: integer("word_id").notNull().references(() => words.id, { onDelete: "cascade" }),
  meaningId: integer("meaning_id").references(() => meanings.id, { onDelete: "cascade" }),
  relation: etymologyMatchRelation("relation").notNull(),
  status: etymologyMatchStatus("status").notNull().default("candidate"),
  proposedBy: text("proposed_by"),
  confidence: numeric("confidence", { precision: 5, scale: 4 }),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { mode: "date" }),
  reviewNote: text("review_note"),
}, (table) => [
  uniqueIndex("etymology_matches_entry_word_meaning_unique").on(
    table.entryId,
    table.wordId,
    sql`coalesce(${table.meaningId}, 0)`,
  ),
  index("etymology_matches_word_status_idx").on(table.wordId, table.status),
]);

/** One claim is one source-backed statement, including rejected explanations. */
export const etymologyClaims = pgTable("etymology_claims", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull().references(() => etymologyEntries.id, { onDelete: "cascade" }),
  senseLabel: varchar("sense_label", { length: 40 }),
  kind: etymologyClaimKind("kind").notNull(),
  stance: etymologyClaimStance("stance").notNull(),
  sourceForm: text("source_form"),
  sourceLanguageLabel: text("source_language_label"),
  sourceLanguageId: integer("source_language_id").references(() => languages.id),
  targetForm: text("target_form"),
  targetLanguageLabel: text("target_language_label"),
  targetLanguageId: integer("target_language_id").references(() => languages.id),
  attributedTo: text("attributed_to"),
  summary: text("summary").notNull(),
  referenceText: text("reference_text"),
  evidenceText: text("evidence_text"),
  reviewStatus: etymologyClaimReviewStatus("review_status").notNull().default("candidate"),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("etymology_claims_entry_idx").on(table.entryId),
]);

export const etymologySourcesRelations = relations(etymologySources, ({ many }) => ({
  abbreviations: many(etymologyAbbreviations),
  entries: many(etymologyEntries),
}));

export const etymologyAbbreviationsRelations = relations(etymologyAbbreviations, ({ one }) => ({
  source: one(etymologySources, {
    fields: [etymologyAbbreviations.sourceId],
    references: [etymologySources.id],
  }),
  language: one(languages, {
    fields: [etymologyAbbreviations.languageId],
    references: [languages.id],
  }),
}));

export const etymologyEntriesRelations = relations(etymologyEntries, ({ one, many }) => ({
  source: one(etymologySources, {
    fields: [etymologyEntries.sourceId],
    references: [etymologySources.id],
  }),
  matches: many(etymologyMatches),
  claims: many(etymologyClaims),
}));

export const etymologyMatchesRelations = relations(etymologyMatches, ({ one }) => ({
  entry: one(etymologyEntries, {
    fields: [etymologyMatches.entryId],
    references: [etymologyEntries.id],
  }),
  word: one(words, {
    fields: [etymologyMatches.wordId],
    references: [words.id],
  }),
  meaning: one(meanings, {
    fields: [etymologyMatches.meaningId],
    references: [meanings.id],
  }),
  reviewer: one(users, {
    fields: [etymologyMatches.reviewedBy],
    references: [users.id],
  }),
}));

export const etymologyClaimsRelations = relations(etymologyClaims, ({ one }) => ({
  entry: one(etymologyEntries, {
    fields: [etymologyClaims.entryId],
    references: [etymologyEntries.id],
  }),
  sourceLanguage: one(languages, {
    fields: [etymologyClaims.sourceLanguageId],
    references: [languages.id],
    relationName: "etymologyClaimSourceLanguage",
  }),
  targetLanguage: one(languages, {
    fields: [etymologyClaims.targetLanguageId],
    references: [languages.id],
    relationName: "etymologyClaimTargetLanguage",
  }),
  reviewer: one(users, {
    fields: [etymologyClaims.reviewedBy],
    references: [users.id],
  }),
}));

export type SelectEtymologySource = InferSelectModel<typeof etymologySources>;
export type InsertEtymologySource = InferInsertModel<typeof etymologySources>;
export type SelectEtymologyEntry = InferSelectModel<typeof etymologyEntries>;
export type InsertEtymologyEntry = InferInsertModel<typeof etymologyEntries>;
export type SelectEtymologyClaim = InferSelectModel<typeof etymologyClaims>;
export type InsertEtymologyClaim = InferInsertModel<typeof etymologyClaims>;
