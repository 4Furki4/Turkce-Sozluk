CREATE TYPE "public"."game_type" AS ENUM('speed_round', 'word_matching', 'flashcard');--> statement-breakpoint
CREATE TABLE "game_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"game_type" "game_type" NOT NULL,
	"score" integer NOT NULL,
	"accuracy" integer NOT NULL,
	"max_streak" integer DEFAULT 0 NOT NULL,
	"question_count" integer NOT NULL,
	"time_taken" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;