CREATE TYPE "public"."suggestion_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('tdk', 'user_contribution', 'foreign_term_suggestion', 'other');--> statement-breakpoint
CREATE TABLE "foreign_term_suggestion_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"suggestion_id" integer NOT NULL,
	"vote_type" integer NOT NULL,
	CONSTRAINT "unique_suggestion_vote" UNIQUE("user_id","suggestion_id")
);
--> statement-breakpoint
CREATE TABLE "foreign_term_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"foreign_term" text NOT NULL,
	"language_id" integer NOT NULL,
	"foreign_meaning" text NOT NULL,
	"suggested_turkish_word" text NOT NULL,
	"is_new_word" boolean DEFAULT true NOT NULL,
	"reason" text,
	"status" "suggestion_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" text,
	"moderation_reason" text,
	"created_word_id" integer
);
--> statement-breakpoint
CREATE TABLE "word_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_type" "source_type" NOT NULL,
	"source_url" varchar(512),
	"source_description" text,
	"contributor_id" text
);
--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "source_id" integer;--> statement-breakpoint
ALTER TABLE "foreign_term_suggestion_votes" ADD CONSTRAINT "foreign_term_suggestion_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foreign_term_suggestion_votes" ADD CONSTRAINT "foreign_term_suggestion_votes_suggestion_id_foreign_term_suggestions_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "public"."foreign_term_suggestions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foreign_term_suggestions" ADD CONSTRAINT "foreign_term_suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foreign_term_suggestions" ADD CONSTRAINT "foreign_term_suggestions_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foreign_term_suggestions" ADD CONSTRAINT "foreign_term_suggestions_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_sources" ADD CONSTRAINT "word_sources_contributor_id_users_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "words" ADD CONSTRAINT "words_source_id_word_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."word_sources"("id") ON DELETE no action ON UPDATE no action;