CREATE TABLE "pronunciation_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pronunciation_id" integer NOT NULL,
	"vote_type" integer NOT NULL,
	CONSTRAINT "unique_pronunciation_vote" UNIQUE("user_id","pronunciation_id")
);
--> statement-breakpoint
ALTER TABLE "pronunciation_votes" ADD CONSTRAINT "pronunciation_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pronunciation_votes" ADD CONSTRAINT "pronunciation_votes_pronunciation_id_pronunciations_id_fk" FOREIGN KEY ("pronunciation_id") REFERENCES "public"."pronunciations"("id") ON DELETE cascade ON UPDATE no action;