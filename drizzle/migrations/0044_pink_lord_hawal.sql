CREATE TYPE "public"."game_session_event_type" AS ENUM('speed_answer', 'matching_attempt', 'timeout');--> statement-breakpoint
CREATE TYPE "public"."game_session_status" AS ENUM('active', 'completed', 'expired', 'abandoned');--> statement-breakpoint
CREATE TABLE "game_session_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"action_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"event_type" "game_session_event_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"outcome" jsonb NOT NULL,
	"is_correct" boolean,
	"points_earned" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"game_type" "game_type" NOT NULL,
	"status" "game_session_status" DEFAULT 'active' NOT NULL,
	"settings" jsonb NOT NULL,
	"snapshot" jsonb NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"max_streak" integer DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"mistake_count" integer DEFAULT 0 NOT NULL,
	"elapsed_ms" integer DEFAULT 0 NOT NULL,
	"question_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deadline_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "game_session_events" ADD CONSTRAINT "game_session_events_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_session_events_session_action_idx" ON "game_session_events" USING btree ("session_id","action_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_session_events_session_sequence_idx" ON "game_session_events" USING btree ("session_id","sequence");--> statement-breakpoint
CREATE INDEX "game_session_events_session_idx" ON "game_session_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "game_sessions_user_status_idx" ON "game_sessions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "game_sessions_game_status_idx" ON "game_sessions" USING btree ("game_type","status");--> statement-breakpoint
CREATE INDEX "game_sessions_expires_at_idx" ON "game_sessions" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_scores_session_id_unique" ON "game_scores" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "game_scores_verified_leaderboard_idx" ON "game_scores" USING btree ("verified","game_type","score");--> statement-breakpoint
CREATE INDEX "game_scores_user_game_verified_idx" ON "game_scores" USING btree ("user_id","game_type","verified");