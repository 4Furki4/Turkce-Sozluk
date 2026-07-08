import { db } from "@/db";
import type { TurkishAlphabetLetter } from "@/src/lib/turkish-alphabet";
import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

export {
  normalizeTurkishLetter,
  TURKISH_ALPHABET,
  type TurkishAlphabetLetter,
} from "@/src/lib/turkish-alphabet";

export const PRIORITY_WORD_LIMIT = 5000;

export type SeoWordSummary = {
  id: number;
  name: string;
  firstMeaning: string | null;
  lastModified: string | null;
  viewCount: number;
  meaningCount: number;
  exampleCount: number;
  relatedWordCount: number;
  relatedPhraseCount: number;
};

export function getSeoWordLastModified(word: Pick<SeoWordSummary, "lastModified">): string {
  if (!word.lastModified) {
    return new Date().toISOString();
  }

  const parsed = new Date(word.lastModified);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function normalizeRows(rows: SeoWordSummary[]): SeoWordSummary[] {
  return rows.map((row) => ({
    ...row,
    id: Number(row.id),
    viewCount: Number(row.viewCount ?? 0),
    meaningCount: Number(row.meaningCount ?? 0),
    exampleCount: Number(row.exampleCount ?? 0),
    relatedWordCount: Number(row.relatedWordCount ?? 0),
    relatedPhraseCount: Number(row.relatedPhraseCount ?? 0),
  }));
}

export const getPriorityWords = unstable_cache(
  async (limit = PRIORITY_WORD_LIMIT): Promise<SeoWordSummary[]> => {
    const safeLimit = Math.max(1, Math.min(limit, PRIORITY_WORD_LIMIT));
    const rows = (await db.execute(sql`
      WITH first_meanings AS (
        SELECT DISTINCT ON (m.word_id)
          m.word_id,
          m.meaning
        FROM meanings m
        ORDER BY m.word_id, m."order", m.id
      ),
      meaning_stats AS (
        SELECT word_id, COUNT(*)::int AS meaning_count
        FROM meanings
        GROUP BY word_id
      ),
      example_stats AS (
        SELECT m.word_id, COUNT(e.id)::int AS example_count
        FROM meanings m
        INNER JOIN examples e ON e.meaning_id = m.id
        GROUP BY m.word_id
      ),
      related_word_stats AS (
        SELECT word_id, COUNT(*)::int AS related_word_count
        FROM related_words
        GROUP BY word_id
      ),
      related_phrase_stats AS (
        SELECT phrase_id AS word_id, COUNT(*)::int AS related_phrase_count
        FROM related_phrases
        GROUP BY phrase_id
      )
      SELECT
        w.id,
        w.name,
        fm.meaning AS "firstMeaning",
        COALESCE(w.updated_at, w.created_at)::text AS "lastModified",
        COALESCE(w.view_count, 0)::int AS "viewCount",
        COALESCE(ms.meaning_count, 0)::int AS "meaningCount",
        COALESCE(es.example_count, 0)::int AS "exampleCount",
        COALESCE(rws.related_word_count, 0)::int AS "relatedWordCount",
        COALESCE(rps.related_phrase_count, 0)::int AS "relatedPhraseCount"
      FROM words w
      LEFT JOIN first_meanings fm ON fm.word_id = w.id
      LEFT JOIN meaning_stats ms ON ms.word_id = w.id
      LEFT JOIN example_stats es ON es.word_id = w.id
      LEFT JOIN related_word_stats rws ON rws.word_id = w.id
      LEFT JOIN related_phrase_stats rps ON rps.word_id = w.id
      WHERE COALESCE(ms.meaning_count, 0) > 0
        OR COALESCE(rws.related_word_count, 0) > 0
        OR COALESCE(rps.related_phrase_count, 0) > 0
      ORDER BY
        (
          COALESCE(w.view_count, 0) * 4
          + COALESCE(ms.meaning_count, 0) * 10
          + COALESCE(es.example_count, 0) * 6
          + COALESCE(rws.related_word_count, 0) * 3
          + COALESCE(rps.related_phrase_count, 0) * 3
          + CASE
              WHEN COALESCE(w.updated_at, w.created_at) >= CURRENT_DATE - INTERVAL '180 days'
              THEN 10
              ELSE 0
            END
        ) DESC,
        LOWER(w.name) ASC
      LIMIT ${safeLimit};
    `)) as SeoWordSummary[];

    return normalizeRows(rows);
  },
  ["seo-priority-words"],
  { revalidate: 86400 },
);

export const getPopularWordsForHub = unstable_cache(
  async (limit = 48): Promise<SeoWordSummary[]> => {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const rows = (await db.execute(sql`
      WITH first_meanings AS (
        SELECT DISTINCT ON (m.word_id)
          m.word_id,
          m.meaning
        FROM meanings m
        ORDER BY m.word_id, m."order", m.id
      )
      SELECT
        w.id,
        w.name,
        fm.meaning AS "firstMeaning",
        COALESCE(w.updated_at, w.created_at)::text AS "lastModified",
        COALESCE(w.view_count, 0)::int AS "viewCount",
        0::int AS "meaningCount",
        0::int AS "exampleCount",
        0::int AS "relatedWordCount",
        0::int AS "relatedPhraseCount"
      FROM words w
      LEFT JOIN first_meanings fm ON fm.word_id = w.id
      WHERE COALESCE(w.view_count, 0) > 0
      ORDER BY COALESCE(w.view_count, 0) DESC, LOWER(w.name) ASC
      LIMIT ${safeLimit};
    `)) as SeoWordSummary[];

    return normalizeRows(rows);
  },
  ["seo-popular-words-hub"],
  { revalidate: 86400 },
);

export const getRecentlyUpdatedWordsForHub = unstable_cache(
  async (limit = 48): Promise<SeoWordSummary[]> => {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const rows = (await db.execute(sql`
      WITH first_meanings AS (
        SELECT DISTINCT ON (m.word_id)
          m.word_id,
          m.meaning
        FROM meanings m
        ORDER BY m.word_id, m."order", m.id
      )
      SELECT
        w.id,
        w.name,
        fm.meaning AS "firstMeaning",
        COALESCE(w.updated_at, w.created_at)::text AS "lastModified",
        COALESCE(w.view_count, 0)::int AS "viewCount",
        0::int AS "meaningCount",
        0::int AS "exampleCount",
        0::int AS "relatedWordCount",
        0::int AS "relatedPhraseCount"
      FROM words w
      LEFT JOIN first_meanings fm ON fm.word_id = w.id
      WHERE COALESCE(w.updated_at, w.created_at) IS NOT NULL
      ORDER BY COALESCE(w.updated_at, w.created_at) DESC, LOWER(w.name) ASC
      LIMIT ${safeLimit};
    `)) as SeoWordSummary[];

    return normalizeRows(rows);
  },
  ["seo-recent-words-hub"],
  { revalidate: 86400 },
);

export const getPopularWordsByLetter = unstable_cache(
  async (letter: TurkishAlphabetLetter, limit = 40): Promise<SeoWordSummary[]> => {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const rows = (await db.execute(sql`
      WITH first_meanings AS (
        SELECT DISTINCT ON (m.word_id)
          m.word_id,
          m.meaning
        FROM meanings m
        ORDER BY m.word_id, m."order", m.id
      )
      SELECT
        w.id,
        w.name,
        fm.meaning AS "firstMeaning",
        COALESCE(w.updated_at, w.created_at)::text AS "lastModified",
        COALESCE(w.view_count, 0)::int AS "viewCount",
        0::int AS "meaningCount",
        0::int AS "exampleCount",
        0::int AS "relatedWordCount",
        0::int AS "relatedPhraseCount"
      FROM words w
      LEFT JOIN first_meanings fm ON fm.word_id = w.id
      WHERE w.name ILIKE ${`${letter}%`}
        AND COALESCE(w.view_count, 0) > 0
      ORDER BY COALESCE(w.view_count, 0) DESC, LOWER(w.name) ASC
      LIMIT ${safeLimit};
    `)) as SeoWordSummary[];

    return normalizeRows(rows);
  },
  ["seo-popular-words-by-letter"],
  { revalidate: 86400 },
);

export const getWordsByLetter = unstable_cache(
  async (letter: TurkishAlphabetLetter): Promise<SeoWordSummary[]> => {
    const rows = (await db.execute(sql`
      WITH first_meanings AS (
        SELECT DISTINCT ON (m.word_id)
          m.word_id,
          m.meaning
        FROM meanings m
        ORDER BY m.word_id, m."order", m.id
      )
      SELECT
        w.id,
        w.name,
        fm.meaning AS "firstMeaning",
        COALESCE(w.updated_at, w.created_at)::text AS "lastModified",
        COALESCE(w.view_count, 0)::int AS "viewCount",
        0::int AS "meaningCount",
        0::int AS "exampleCount",
        0::int AS "relatedWordCount",
        0::int AS "relatedPhraseCount"
      FROM words w
      LEFT JOIN first_meanings fm ON fm.word_id = w.id
      WHERE w.name ILIKE ${`${letter}%`}
      ORDER BY LOWER(w.name) ASC, w.name ASC;
    `)) as SeoWordSummary[];

    return normalizeRows(rows);
  },
  ["seo-words-by-letter"],
  { revalidate: 86400 },
);
