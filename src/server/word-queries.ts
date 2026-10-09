import { sql } from "drizzle-orm";
import type { db as database } from "@/db";
import type { WordSearchResult } from "@/types";
import { NAVIGATION_MEANING_LIKE_PATTERN } from "@/src/lib/word-indexability";

/** Pure public read; request/session effects are handled by the caller. */
export async function findWordDataByName(db: typeof database, purifiedName: string): Promise<WordSearchResult[]> {
      const result = await db.execute(sql`
        WITH candidates AS MATERIALIZED (
          SELECT * FROM words WHERE name ILIKE ${purifiedName}
        ), base_word AS (
          SELECT w.id, w.name, w.phonetic, w.prefix, w.suffix, w.view_count, w.updated_at
          FROM candidates w
          ORDER BY
            CASE
              WHEN w.name = ${purifiedName} THEN 1 -- 2. Prioritize exact case-sensitive match
              ELSE 2 -- 3. Fallback to case-insensitive match
            END,
            CASE
              WHEN (
                SELECT 1
                FROM meanings m_quality
                WHERE m_quality.word_id = w.id
                  AND LENGTH(TRIM(m_quality.meaning)) > 0
                  AND LOWER(TRIM(m_quality.meaning)) NOT LIKE ${NAVIGATION_MEANING_LIKE_PATTERN}
                LIMIT 1
              ) IS NOT NULL THEN 1
              ELSE 2
            END,
            COALESCE(w.variant, 0),
            w.id
          LIMIT 1 -- 4. Select only the single best match
        )
        SELECT json_build_object(
              'word_id', w.id,
              'word_name', w.name,
              'phonetic', w.phonetic,
              'prefix', w.prefix,
              'suffix', w.suffix,
              'view_count', COALESCE(w.view_count, 0),
              'updated_at', w.updated_at,
              'attributes', COALESCE(
                (SELECT json_agg(json_build_object(
                  'attribute_id', wa.id, 
                  'attribute', wa.attribute
                ))
                FROM words_attributes wattr
                JOIN word_attributes wa ON wattr.attribute_id = wa.id
                WHERE wattr.word_id = w.id), '[]'::json
              ),
              'root', COALESCE(
                (SELECT json_build_object(
                  'root', r.root,
                  'language_en', l.language_en,
                  'language_tr', l.language_tr,
                  'language_code', l.language_code
                )
                FROM roots r
                JOIN languages l ON r.language_id = l.id
                WHERE r.word_id = w.id
                LIMIT 1), 
                json_build_object(
                  'root', null,
                  'language_en', null,
                  'language_tr', null,
                  'language_code', null
                )
              ),
              'meanings', COALESCE(
                (SELECT json_agg(json_build_object(
                  'meaning_id', m.id,
                  'meaning', m.meaning,
                  'imageUrl', m."imageUrl",
                  'part_of_speech', p.part_of_speech,
                  'part_of_speech_id', p.id,
                  'attributes', COALESCE(
                    (SELECT json_agg(json_build_object(
                      'attribute_id', ma.id, 
                      'attribute', ma.attribute
                    ))
                    FROM meanings_attributes mattr
                    JOIN meaning_attributes ma ON mattr.attribute_id = ma.id
                    WHERE mattr.meaning_id = m.id), '[]'::json
                  ),
                  'sentence', e.sentence,
                  'author', a.name,
                  'author_id', a.id
                ) ORDER BY m."order" ASC)
                FROM meanings m
                LEFT JOIN part_of_speechs p ON m.part_of_speech_id = p.id
                LEFT JOIN examples e ON e.meaning_id = m.id
                LEFT JOIN authors a ON e.author_id = a.id
                WHERE m.word_id = w.id), '[]'::json
              ),
              'relatedWords', COALESCE(
                (SELECT json_agg(json_build_object(
                  'related_word_id', rw.id,
                  'related_word_name', rw.name,
                  'relation_type', rel.relation_type
                ))
                FROM related_words rel
                JOIN words rw ON rel.related_word_id = rw.id
                WHERE rel.word_id = w.id), '[]'::json
              ),
              'relatedPhrases', COALESCE(
                (SELECT json_agg(json_build_object(
                  'related_phrase_id', rp.id,
                  'related_phrase', rp.name
                ))
                FROM related_phrases rel
                JOIN words rp ON rel.related_phrase_id = rp.id
                WHERE rel.phrase_id = w.id), '[]'::json
              ),
              'pronunciations', COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', p.id,
                  'audioUrl', p."audio_url",
                  'user', json_build_object(
                    'id', u.id,
                    'name', u.name,
                    'image', u.image
                  ),
                  'voteCount', 0
                ))
                FROM pronunciations p
                JOIN users u ON p."user_id" = u.id
                WHERE p.word_id = w.id), '[]'::json
              )
          ) AS word_data
        FROM base_word w 
      `);
  return result.filter((row) => Boolean(row?.word_data)) as unknown as WordSearchResult[];
}
