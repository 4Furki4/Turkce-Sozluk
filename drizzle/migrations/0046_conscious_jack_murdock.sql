CREATE TYPE "public"."flashcard_direction" AS ENUM('word', 'meaning');--> statement-breakpoint
CREATE TYPE "public"."flashcard_rating" AS ENUM('again', 'hard', 'good', 'easy');--> statement-breakpoint
CREATE TABLE "flashcard_review_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"meaning_id" integer NOT NULL,
	"direction" "flashcard_direction" NOT NULL,
	"rating" "flashcard_rating" NOT NULL,
	"action_id" text NOT NULL,
	"outcome" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcard_review_states" (
	"user_id" text NOT NULL,
	"meaning_id" integer NOT NULL,
	"direction" "flashcard_direction" NOT NULL,
	"repetitions" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"ease_factor" integer DEFAULT 250 NOT NULL,
	"interval_days" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"last_reviewed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flashcard_review_states_user_id_meaning_id_direction_pk" PRIMARY KEY("user_id","meaning_id","direction")
);
--> statement-breakpoint
ALTER TABLE "flashcard_review_events" ADD CONSTRAINT "flashcard_review_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_review_events" ADD CONSTRAINT "flashcard_review_events_meaning_id_meanings_id_fk" FOREIGN KEY ("meaning_id") REFERENCES "public"."meanings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_review_states" ADD CONSTRAINT "flashcard_review_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_review_states" ADD CONSTRAINT "flashcard_review_states_meaning_id_meanings_id_fk" FOREIGN KEY ("meaning_id") REFERENCES "public"."meanings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "flashcard_review_events_user_action_idx" ON "flashcard_review_events" USING btree ("user_id","action_id");--> statement-breakpoint
CREATE INDEX "flashcard_review_events_user_created_idx" ON "flashcard_review_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "flashcard_review_states_user_due_idx" ON "flashcard_review_states" USING btree ("user_id","due_at");