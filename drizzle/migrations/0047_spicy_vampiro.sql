CREATE TYPE "public"."word_relation_suggestion_status" AS ENUM('pending', 'accepted', 'dismissed');--> statement-breakpoint
CREATE TABLE "word_relation_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_key" text NOT NULL,
	"model" text NOT NULL,
	"scored_at" timestamp with time zone NOT NULL,
	"word_id" integer NOT NULL,
	"related_word_id" integer NOT NULL,
	"score" double precision NOT NULL,
	"confidence" double precision NOT NULL,
	"evidence" jsonb NOT NULL,
	"status" "word_relation_suggestion_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "word_relation_suggestions_pair_order" CHECK ("word_relation_suggestions"."word_id" < "word_relation_suggestions"."related_word_id"),
	CONSTRAINT "word_relation_suggestions_score_range" CHECK ("word_relation_suggestions"."score" BETWEEN 0 AND 3),
	CONSTRAINT "word_relation_suggestions_confidence_range" CHECK ("word_relation_suggestions"."confidence" BETWEEN 0 AND 1)
);
--> statement-breakpoint
ALTER TABLE "word_relation_suggestions" ADD CONSTRAINT "word_relation_suggestions_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_relation_suggestions" ADD CONSTRAINT "word_relation_suggestions_related_word_id_words_id_fk" FOREIGN KEY ("related_word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_relation_suggestions" ADD CONSTRAINT "word_relation_suggestions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "word_relation_suggestions_run_pair_idx" ON "word_relation_suggestions" USING btree ("run_key","word_id","related_word_id");--> statement-breakpoint
CREATE INDEX "word_relation_suggestions_rank_idx" ON "word_relation_suggestions" USING btree ("status","score" DESC NULLS LAST,"confidence" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "word_relation_suggestions_word_idx" ON "word_relation_suggestions" USING btree ("word_id");--> statement-breakpoint
CREATE INDEX "word_relation_suggestions_related_word_idx" ON "word_relation_suggestions" USING btree ("related_word_id");