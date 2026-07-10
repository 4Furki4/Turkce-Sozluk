import { db } from "@/db";
import { NAVIGATION_MEANING_LIKE_PATTERN } from "@/src/lib/word-indexability";
import { sql } from "drizzle-orm";

type InventorySummary = {
  totalRecords: number;
  substantiveRecords: number;
  pointerRecords: number;
  emptyRecords: number;
  uniqueIndexableUrls: number;
  duplicateExactUrlGroups: number;
  duplicateExtraRows: number;
};

type PointerSample = {
  name: string;
  targets: string[];
};

const summaryRows = (await db.execute(sql`
  WITH classified_words AS (
    SELECT
      w.id,
      w.name,
      EXISTS (
        SELECT 1
        FROM meanings m
        WHERE m.word_id = w.id
          AND LENGTH(TRIM(m.meaning)) > 0
          AND LOWER(TRIM(m.meaning)) NOT LIKE ${NAVIGATION_MEANING_LIKE_PATTERN}
      ) AS is_substantive,
      EXISTS (
        SELECT 1
        FROM meanings m
        WHERE m.word_id = w.id
          AND LOWER(TRIM(m.meaning)) LIKE ${NAVIGATION_MEANING_LIKE_PATTERN}
      ) AS has_navigation_meaning,
      EXISTS (SELECT 1 FROM related_words rw WHERE rw.word_id = w.id)
        OR EXISTS (SELECT 1 FROM related_phrases rp WHERE rp.phrase_id = w.id)
        AS has_related_entry
    FROM words w
  ),
  exact_duplicates AS (
    SELECT name, COUNT(*)::int AS row_count
    FROM words
    GROUP BY name
    HAVING COUNT(*) > 1
  )
  SELECT
    (SELECT COUNT(*)::int FROM classified_words) AS "totalRecords",
    (SELECT COUNT(*)::int FROM classified_words WHERE is_substantive) AS "substantiveRecords",
    (
      SELECT COUNT(*)::int
      FROM classified_words
      WHERE NOT is_substantive AND (has_navigation_meaning OR has_related_entry)
    ) AS "pointerRecords",
    (
      SELECT COUNT(*)::int
      FROM classified_words
      WHERE NOT is_substantive AND NOT has_navigation_meaning AND NOT has_related_entry
    ) AS "emptyRecords",
    (
      SELECT COUNT(DISTINCT name)::int
      FROM classified_words
      WHERE is_substantive
    ) AS "uniqueIndexableUrls",
    (SELECT COUNT(*)::int FROM exact_duplicates) AS "duplicateExactUrlGroups",
    (SELECT COALESCE(SUM(row_count - 1), 0)::int FROM exact_duplicates) AS "duplicateExtraRows";
`)) as InventorySummary[];

const pointerSamples = (await db.execute(sql`
  SELECT DISTINCT ON (w.name)
    w.name,
    ARRAY(
      SELECT DISTINCT target.name
      FROM related_words rw
      INNER JOIN words target ON target.id = rw.related_word_id
      WHERE rw.word_id = w.id
      ORDER BY target.name
      LIMIT 5
    ) AS targets
  FROM words w
  WHERE NOT EXISTS (
    SELECT 1
    FROM meanings m
    WHERE m.word_id = w.id
      AND LENGTH(TRIM(m.meaning)) > 0
      AND LOWER(TRIM(m.meaning)) NOT LIKE ${NAVIGATION_MEANING_LIKE_PATTERN}
  )
    AND (
      EXISTS (
        SELECT 1
        FROM meanings m
        WHERE m.word_id = w.id
          AND LOWER(TRIM(m.meaning)) LIKE ${NAVIGATION_MEANING_LIKE_PATTERN}
      )
      OR EXISTS (SELECT 1 FROM related_words rw WHERE rw.word_id = w.id)
      OR EXISTS (SELECT 1 FROM related_phrases rp WHERE rp.phrase_id = w.id)
    )
  ORDER BY w.name, w.id
  LIMIT 20;
`)) as PointerSample[];

const summary = summaryRows[0];

if (!summary) {
  throw new Error("SEO inventory audit returned no summary row");
}

console.log("SEO word indexability audit (read-only)");
console.table(summary);
console.log("Pointer samples");
console.table(pointerSamples);

process.exit(0);
