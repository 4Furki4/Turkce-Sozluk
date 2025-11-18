CREATE TABLE "daily_words" (
	"id" serial PRIMARY KEY NOT NULL,
	"word_id" integer NOT NULL,
	"date" date NOT NULL,
	CONSTRAINT "daily_words_date_unique" UNIQUE("date")
);
--> statement-breakpoint
ALTER TABLE "daily_words" ADD CONSTRAINT "daily_words_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "date_idx" ON "daily_words" USING btree ("date");