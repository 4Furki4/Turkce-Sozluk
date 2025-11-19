ALTER TYPE "public"."entity_type" ADD VALUE 'misspellings';--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE 'galatimeshur';--> statement-breakpoint
CREATE TABLE "galatimeshur" (
	"id" serial PRIMARY KEY NOT NULL,
	"word_id" integer NOT NULL,
	"explanation" text NOT NULL,
	"correct_usage" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "misspellings" (
	"id" serial PRIMARY KEY NOT NULL,
	"correct_word_id" integer NOT NULL,
	"incorrect_spelling" varchar(255) NOT NULL,
	"frequency" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "galatimeshur" ADD CONSTRAINT "galatimeshur_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "misspellings" ADD CONSTRAINT "misspellings_correct_word_id_words_id_fk" FOREIGN KEY ("correct_word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;