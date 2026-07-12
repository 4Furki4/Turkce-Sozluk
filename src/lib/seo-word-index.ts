import { db } from "@/db";
import type { TurkishAlphabetLetter } from "@/src/lib/turkish-alphabet";
import { NAVIGATION_MEANING_LIKE_PATTERN } from "@/src/lib/word-indexability";
import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

export {
  normalizeTurkishLetter,
  TURKISH_ALPHABET,
  type TurkishAlphabetLetter,
} from "@/src/lib/turkish-alphabet";

export const PRIORITY_WORD_LIMIT = 5000;
export const WORD_SITEMAP_PAGE_SIZE = 5000;

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

export type SeoSitemapWord = {
  name: string;
  lastModified: string | null;
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

export const getIndexableWordCount = unstable_cache(
  async (): Promise<number> => {
    const rows = (await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT w.name
        FROM words w
        WHERE EXISTS (
          SELECT 1
          FROM meanings m
          WHERE m.word_id = w.id
            AND LENGTH(TRIM(m.meaning)) > 0
            AND LOWER(TRIM(m.meaning)) NOT LIKE ${NAVIGATION_MEANING_LIKE_PATTERN}
        )
        GROUP BY w.name
      ) indexable_names;
    `)) as { count: number }[];

    return Number(rows[0]?.count ?? 0);
  },
  ["seo-indexable-word-count"],
  { revalidate: 86400 },
);

export const getIndexableWordsForSitemapPage = unstable_cache(
  async (
    page: number,
    pageSize = WORD_SITEMAP_PAGE_SIZE,
  ): Promise<SeoSitemapWord[]> => {
    const safePage = Math.max(1, Math.floor(page));
    const safePageSize = Math.max(1, Math.min(Math.floor(pageSize), WORD_SITEMAP_PAGE_SIZE));
    const offset = (safePage - 1) * safePageSize;
    const rows = (await db.execute(sql`
      WITH indexable_names AS (
        SELECT DISTINCT w.name
        FROM words w
        WHERE EXISTS (
          SELECT 1
          FROM meanings m
          WHERE m.word_id = w.id
            AND LENGTH(TRIM(m.meaning)) > 0
            AND LOWER(TRIM(m.meaning)) NOT LIKE ${NAVIGATION_MEANING_LIKE_PATTERN}
        )
      ),
      sitemap_words AS (
        SELECT
          indexable_names.name,
          MAX(COALESCE(w.updated_at, w.created_at))::text AS "lastModified"
        FROM indexable_names
        INNER JOIN words w ON w.name = indexable_names.name
        GROUP BY indexable_names.name
      )
      SELECT name, "lastModified"
      FROM sitemap_words
      ORDER BY LOWER(name), name
      OFFSET ${offset}
      LIMIT ${safePageSize};
    `)) as SeoSitemapWord[];

    return rows;
  },
  ["seo-indexable-word-sitemap-page"],
  { revalidate: 86400 },
);

export const getPriorityWords = unstable_cache(
  async (limit = PRIORITY_WORD_LIMIT): Promise<SeoWordSummary[]> => {
    const safeLimit = Math.max(1, Math.min(limit, PRIORITY_WORD_LIMIT));
    const rows = (await db.execute(sql`
      WITH substantive_meanings AS (
        SELECT m.*
        FROM meanings m
        WHERE LENGTH(TRIM(m.meaning)) > 0
          AND LOWER(TRIM(m.meaning)) NOT LIKE ${NAVIGATION_MEANING_LIKE_PATTERN}
      ),
      first_meanings AS (
        SELECT DISTINCT ON (m.word_id)
          m.word_id,
          m.meaning
        FROM substantive_meanings m
        ORDER BY m.word_id, m."order", m.id
      ),
      meaning_stats AS (
        SELECT word_id, COUNT(*)::int AS meaning_count
        FROM substantive_meanings
        GROUP BY word_id
      ),
      example_stats AS (
        SELECT m.word_id, COUNT(e.id)::int AS example_count
        FROM substantive_meanings m
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
      ),
      name_dates AS (
        SELECT name, MAX(COALESCE(updated_at, created_at)) AS last_modified
        FROM words
        GROUP BY name
      ),
      ranked_words AS (
        SELECT
          w.id,
          w.name,
          fm.meaning AS "firstMeaning",
          nd.last_modified::text AS "lastModified",
          COALESCE(w.view_count, 0)::int AS "viewCount",
          ms.meaning_count::int AS "meaningCount",
          COALESCE(es.example_count, 0)::int AS "exampleCount",
          COALESCE(rws.related_word_count, 0)::int AS "relatedWordCount",
          COALESCE(rps.related_phrase_count, 0)::int AS "relatedPhraseCount",
          (
            COALESCE(w.view_count, 0) * 4
            + ms.meaning_count * 10
            + COALESCE(es.example_count, 0) * 6
            + COALESCE(rws.related_word_count, 0) * 3
            + COALESCE(rps.related_phrase_count, 0) * 3
            + CASE
                WHEN nd.last_modified >= CURRENT_DATE - INTERVAL '180 days'
                THEN 10
                ELSE 0
              END
          ) AS score,
          ROW_NUMBER() OVER (
            PARTITION BY w.name
            ORDER BY COALESCE(w.variant, 0), w.id
          ) AS name_rank
        FROM words w
        INNER JOIN first_meanings fm ON fm.word_id = w.id
        INNER JOIN meaning_stats ms ON ms.word_id = w.id
        INNER JOIN name_dates nd ON nd.name = w.name
        LEFT JOIN example_stats es ON es.word_id = w.id
        LEFT JOIN related_word_stats rws ON rws.word_id = w.id
        LEFT JOIN related_phrase_stats rps ON rps.word_id = w.id
      )
      SELECT
        id,
        name,
        "firstMeaning",
        "lastModified",
        "viewCount",
        "meaningCount",
        "exampleCount",
        "relatedWordCount",
        "relatedPhraseCount"
      FROM ranked_words
      WHERE name_rank = 1
      ORDER BY score DESC, LOWER(name), name
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
      WITH substantive_meanings AS (
        SELECT m.*
        FROM meanings m
        WHERE LENGTH(TRIM(m.meaning)) > 0
          AND LOWER(TRIM(m.meaning)) NOT LIKE ${NAVIGATION_MEANING_LIKE_PATTERN}
      ),
      first_meanings AS (
        SELECT DISTINCT ON (m.word_id) m.word_id, m.meaning
        FROM substantive_meanings m
        ORDER BY m.word_id, m."order", m.id
      ),
      name_dates AS (
        SELECT name, MAX(COALESCE(updated_at, created_at)) AS last_modified
        FROM words
        GROUP BY name
      ),
      ranked_words AS (
        SELECT
          w.id,
          w.name,
          fm.meaning AS "firstMeaning",
          nd.last_modified::text AS "lastModified",
          COALESCE(w.view_count, 0)::int AS "viewCount",
          ROW_NUMBER() OVER (
            PARTITION BY w.name
            ORDER BY COALESCE(w.variant, 0), w.id
          ) AS name_rank
        FROM words w
        INNER JOIN first_meanings fm ON fm.word_id = w.id
        INNER JOIN name_dates nd ON nd.name = w.name
      )
      SELECT
        id,
        name,
        "firstMeaning",
        "lastModified",
        "viewCount",
        0::int AS "meaningCount",
        0::int AS "exampleCount",
        0::int AS "relatedWordCount",
        0::int AS "relatedPhraseCount"
      FROM ranked_words
      WHERE name_rank = 1 AND "viewCount" > 0
      ORDER BY "viewCount" DESC, LOWER(name), name
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
      WITH substantive_meanings AS (
        SELECT m.*
        FROM meanings m
        WHERE LENGTH(TRIM(m.meaning)) > 0
          AND LOWER(TRIM(m.meaning)) NOT LIKE ${NAVIGATION_MEANING_LIKE_PATTERN}
      ),
      first_meanings AS (
        SELECT DISTINCT ON (m.word_id) m.word_id, m.meaning
        FROM substantive_meanings m
        ORDER BY m.word_id, m."order", m.id
      ),
      name_dates AS (
        SELECT name, MAX(COALESCE(updated_at, created_at)) AS last_modified
        FROM words
        GROUP BY name
      ),
      ranked_words AS (
        SELECT
          w.id,
          w.name,
          fm.meaning AS "firstMeaning",
          nd.last_modified::text AS "lastModified",
          COALESCE(w.view_count, 0)::int AS "viewCount",
          ROW_NUMBER() OVER (
            PARTITION BY w.name
            ORDER BY COALESCE(w.variant, 0), w.id
          ) AS name_rank
        FROM words w
        INNER JOIN first_meanings fm ON fm.word_id = w.id
        INNER JOIN name_dates nd ON nd.name = w.name
      )
      SELECT
        id,
        name,
        "firstMeaning",
        "lastModified",
        "viewCount",
        0::int AS "meaningCount",
        0::int AS "exampleCount",
        0::int AS "relatedWordCount",
        0::int AS "relatedPhraseCount"
      FROM ranked_words
      WHERE name_rank = 1 AND "lastModified" IS NOT NULL
      ORDER BY "lastModified" DESC, LOWER(name), name
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
      WITH substantive_meanings AS (
        SELECT m.*
        FROM meanings m
        WHERE LENGTH(TRIM(m.meaning)) > 0
          AND LOWER(TRIM(m.meaning)) NOT LIKE ${NAVIGATION_MEANING_LIKE_PATTERN}
      ),
      first_meanings AS (
        SELECT DISTINCT ON (m.word_id) m.word_id, m.meaning
        FROM substantive_meanings m
        ORDER BY m.word_id, m."order", m.id
      ),
      name_dates AS (
        SELECT name, MAX(COALESCE(updated_at, created_at)) AS last_modified
        FROM words
        GROUP BY name
      ),
      ranked_words AS (
        SELECT
          w.id,
          w.name,
          fm.meaning AS "firstMeaning",
          nd.last_modified::text AS "lastModified",
          COALESCE(w.view_count, 0)::int AS "viewCount",
          ROW_NUMBER() OVER (
            PARTITION BY w.name
            ORDER BY COALESCE(w.variant, 0), w.id
          ) AS name_rank
        FROM words w
        INNER JOIN first_meanings fm ON fm.word_id = w.id
        INNER JOIN name_dates nd ON nd.name = w.name
        WHERE w.name ILIKE ${`${letter}%`}
      )
      SELECT
        id,
        name,
        "firstMeaning",
        "lastModified",
        "viewCount",
        0::int AS "meaningCount",
        0::int AS "exampleCount",
        0::int AS "relatedWordCount",
        0::int AS "relatedPhraseCount"
      FROM ranked_words
      WHERE name_rank = 1 AND "viewCount" > 0
      ORDER BY "viewCount" DESC, LOWER(name), name
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
      WITH substantive_meanings AS (
        SELECT m.*
        FROM meanings m
        WHERE LENGTH(TRIM(m.meaning)) > 0
          AND LOWER(TRIM(m.meaning)) NOT LIKE ${NAVIGATION_MEANING_LIKE_PATTERN}
      ),
      first_meanings AS (
        SELECT DISTINCT ON (m.word_id) m.word_id, m.meaning
        FROM substantive_meanings m
        ORDER BY m.word_id, m."order", m.id
      ),
      name_dates AS (
        SELECT name, MAX(COALESCE(updated_at, created_at)) AS last_modified
        FROM words
        GROUP BY name
      ),
      ranked_words AS (
        SELECT
          w.id,
          w.name,
          fm.meaning AS "firstMeaning",
          nd.last_modified::text AS "lastModified",
          COALESCE(w.view_count, 0)::int AS "viewCount",
          ROW_NUMBER() OVER (
            PARTITION BY w.name
            ORDER BY COALESCE(w.variant, 0), w.id
          ) AS name_rank
        FROM words w
        INNER JOIN first_meanings fm ON fm.word_id = w.id
        INNER JOIN name_dates nd ON nd.name = w.name
        WHERE w.name ILIKE ${`${letter}%`}
      )
      SELECT
        id,
        name,
        "firstMeaning",
        "lastModified",
        "viewCount",
        0::int AS "meaningCount",
        0::int AS "exampleCount",
        0::int AS "relatedWordCount",
        0::int AS "relatedPhraseCount"
      FROM ranked_words
      WHERE name_rank = 1
      ORDER BY LOWER(name), name;
    `)) as SeoWordSummary[];

    return normalizeRows(rows);
  },
  ["seo-words-by-letter"],
  { revalidate: 86400 },
);
