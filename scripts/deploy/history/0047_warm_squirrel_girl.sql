CREATE TYPE "public"."etymology_abbreviation_kind" AS ENUM('language', 'dialect', 'publication', 'other');--> statement-breakpoint
CREATE TYPE "public"."etymology_claim_kind" AS ENUM('origin', 'derivation', 'attested_form', 'comparison', 'loan_out', 'cross_reference', 'unknown_origin', 'commentary');--> statement-breakpoint
CREATE TYPE "public"."etymology_claim_review_status" AS ENUM('candidate', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."etymology_claim_stance" AS ENUM('asserted', 'proposed', 'disputed', 'rejected', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."etymology_entry_kind" AS ENUM('article', 'cross_reference');--> statement-breakpoint
CREATE TYPE "public"."etymology_match_relation" AS ENUM('same_sense', 'word_level', 'related_form', 'unrelated');--> statement-breakpoint
CREATE TYPE "public"."etymology_match_status" AS ENUM('candidate', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."etymology_transcription_status" AS ENUM('ocr', 'verified');--> statement-breakpoint
CREATE TABLE "etymology_abbreviations" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"code" varchar(80) NOT NULL,
	"kind" "etymology_abbreviation_kind" NOT NULL,
	"expansion" text NOT NULL,
	"language_id" integer
);
--> statement-breakpoint
CREATE TABLE "etymology_claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"sense_label" varchar(40),
	"kind" "etymology_claim_kind" NOT NULL,
	"stance" "etymology_claim_stance" NOT NULL,
	"source_form" text,
	"source_language_label" text,
	"source_language_id" integer,
	"target_form" text,
	"target_language_label" text,
	"target_language_id" integer,
	"attributed_to" text,
	"summary" text NOT NULL,
	"reference_text" text,
	"evidence_text" text,
	"review_status" "etymology_claim_review_status" DEFAULT 'candidate' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "etymology_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"source_entry_key" varchar(255) NOT NULL,
	"headword" text NOT NULL,
	"gloss" text,
	"kind" "etymology_entry_kind" DEFAULT 'article' NOT NULL,
	"printed_page_start" integer NOT NULL,
	"printed_page_end" integer,
	"pdf_page_start" integer,
	"pdf_page_end" integer,
	"source_locator" text,
	"ocr_text" text,
	"corrected_text" text,
	"transcription_status" "etymology_transcription_status" DEFAULT 'ocr' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "etymology_matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"word_id" integer NOT NULL,
	"meaning_id" integer,
	"relation" "etymology_match_relation" NOT NULL,
	"status" "etymology_match_status" DEFAULT 'candidate' NOT NULL,
	"proposed_by" text,
	"confidence" numeric(5, 4),
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_note" text
);
--> statement-breakpoint
CREATE TABLE "etymology_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"edition" text,
	"publication_year" integer,
	"publisher" text,
	"isbn" varchar(32),
	"document_sha256" varchar(64),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "etymology_abbreviations" ADD CONSTRAINT "etymology_abbreviations_source_id_etymology_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."etymology_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etymology_abbreviations" ADD CONSTRAINT "etymology_abbreviations_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etymology_claims" ADD CONSTRAINT "etymology_claims_entry_id_etymology_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."etymology_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etymology_claims" ADD CONSTRAINT "etymology_claims_source_language_id_languages_id_fk" FOREIGN KEY ("source_language_id") REFERENCES "public"."languages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etymology_claims" ADD CONSTRAINT "etymology_claims_target_language_id_languages_id_fk" FOREIGN KEY ("target_language_id") REFERENCES "public"."languages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etymology_claims" ADD CONSTRAINT "etymology_claims_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etymology_entries" ADD CONSTRAINT "etymology_entries_source_id_etymology_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."etymology_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etymology_matches" ADD CONSTRAINT "etymology_matches_entry_id_etymology_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."etymology_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etymology_matches" ADD CONSTRAINT "etymology_matches_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etymology_matches" ADD CONSTRAINT "etymology_matches_meaning_id_meanings_id_fk" FOREIGN KEY ("meaning_id") REFERENCES "public"."meanings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etymology_matches" ADD CONSTRAINT "etymology_matches_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "etymology_abbreviations_source_code_kind_unique" ON "etymology_abbreviations" USING btree ("source_id","code","kind");--> statement-breakpoint
CREATE INDEX "etymology_claims_entry_idx" ON "etymology_claims" USING btree ("entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "etymology_entries_source_key_unique" ON "etymology_entries" USING btree ("source_id","source_entry_key");--> statement-breakpoint
CREATE INDEX "etymology_entries_headword_idx" ON "etymology_entries" USING btree ("headword");--> statement-breakpoint
CREATE UNIQUE INDEX "etymology_matches_entry_word_meaning_unique" ON "etymology_matches" USING btree ("entry_id","word_id",coalesce("meaning_id", 0));--> statement-breakpoint
CREATE INDEX "etymology_matches_word_status_idx" ON "etymology_matches" USING btree ("word_id","status");