DROP INDEX "words_created_at_name_id_idx";--> statement-breakpoint
CREATE INDEX "words_created_at_name_id_idx" ON "words" USING btree ("created_at" DESC NULLS FIRST,"name","id");