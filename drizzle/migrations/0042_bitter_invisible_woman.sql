CREATE INDEX "related_phrases_phrase_id_idx" ON "related_phrases" USING btree ("phrase_id");--> statement-breakpoint
CREATE INDEX "related_phrases_related_phrase_id_idx" ON "related_phrases" USING btree ("related_phrase_id");--> statement-breakpoint
CREATE INDEX "related_words_related_word_id_idx" ON "related_words" USING btree ("related_word_id");