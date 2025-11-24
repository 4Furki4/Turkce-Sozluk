CREATE TYPE "public"."badge_category" AS ENUM('general', 'specialist');--> statement-breakpoint
CREATE TYPE "public"."badge_requirement_type" AS ENUM('min_points', 'count_word', 'count_pronunciation', 'count_meaning');--> statement-breakpoint
CREATE TABLE "badges" (
	"slug" text PRIMARY KEY NOT NULL,
	"name_tr" text NOT NULL,
	"name_en" text NOT NULL,
	"description_tr" text NOT NULL,
	"description_en" text NOT NULL,
	"icon" text NOT NULL,
	"requirement_type" "badge_requirement_type" NOT NULL,
	"requirement_value" integer NOT NULL,
	"category" "badge_category" DEFAULT 'general' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users_to_badges" (
	"user_id" text NOT NULL,
	"badge_slug" text NOT NULL,
	"awarded_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_to_badges_user_id_badge_slug_pk" PRIMARY KEY("user_id","badge_slug")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users_to_badges" ADD CONSTRAINT "users_to_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_badges" ADD CONSTRAINT "users_to_badges_badge_slug_badges_slug_fk" FOREIGN KEY ("badge_slug") REFERENCES "public"."badges"("slug") ON DELETE cascade ON UPDATE no action;