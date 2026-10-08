CREATE INDEX "examples_meaning_id_idx" ON "examples" USING btree ("meaning_id");--> statement-breakpoint
CREATE INDEX "meanings_word_id_id_idx" ON "meanings" USING btree ("word_id","id");--> statement-breakpoint
CREATE INDEX "roots_word_id_idx" ON "roots" USING btree ("word_id");--> statement-breakpoint
CREATE INDEX "word_relation_suggestions_ascending_rank_idx" ON "word_relation_suggestions" USING btree ("status","score","confidence" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "words_name_id_idx" ON "words" USING btree ("name","id");--> statement-breakpoint
CREATE INDEX "words_created_at_name_id_idx" ON "words" USING btree ("created_at" DESC NULLS LAST,"name","id");