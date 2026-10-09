import { asc, eq, isNotNull, sql } from "drizzle-orm";
import { words } from "@/db/schema/words";
import { meanings } from "@/db/schema/meanings";
import { partOfSpeechs } from "@/db/schema/part_of_speechs";

/** Sample the same eligible word/meaning rows, then fetch the large display fields. */
export async function getRandomGameWords(db: typeof import("@/db").db, count: number) {
  const sample = db.$with("random_meanings").as(db.select({
    wordId: sql<number>`${words.id}`.as("sample_word_id"),
    meaningId: sql<number>`${meanings.id}`.as("sample_meaning_id"),
    rank: sql<number>`random()`.as("random_rank"),
  }).from(words)
    .innerJoin(meanings, eq(meanings.wordId, words.id))
    .where(isNotNull(meanings.meaning))
    .orderBy(sql`random_rank`)
    .limit(count));

  return db.with(sample).select({
    id: words.id,
    meaningId: meanings.id,
    name: words.name,
    phonetic: words.phonetic,
    meaning: meanings.meaning,
    partOfSpeech: partOfSpeechs.partOfSpeech,
  }).from(sample)
    .innerJoin(words, eq(words.id, sample.wordId))
    .innerJoin(meanings, eq(meanings.id, sample.meaningId))
    .leftJoin(partOfSpeechs, eq(meanings.partOfSpeechId, partOfSpeechs.id))
    .orderBy(asc(sample.rank));
}
