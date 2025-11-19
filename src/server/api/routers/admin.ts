import { TRPCError } from "@trpc/server";
import { adminProcedure, createTRPCRouter } from "../trpc";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { words } from "@/db/schema/words";
import { meanings } from "@/db/schema/meanings";
import { roots } from "@/db/schema/roots";
import { meaningAttributes, meaningsAttributes } from "@/db/schema/meaning_attributes";
import { authors } from "@/db/schema/authors";
import { WordSearchResult } from "@/types";
import { examples } from "@/db/schema/examples";
import { languages } from "@/db/schema/languages";
import { wordAttributes, wordsAttributes } from "@/db/schema/word_attributes";
import { AddWordSchema, EditWordSchema } from "../schemas/admin";
import { addWordWithTransaction } from "../controllers/admin/create";
import { dynamicParametersRouter } from "./admin/dynamic-parameters";
import { adminAnnouncementsRouter } from "./admin/announcements";
import { wordRelationsAdminRouter } from "./admin/word-relations";
import { feedbackAdminRouter } from "./admin/feedback";

import { dailyWordsAdminRouter } from "./admin/daily-words";
import { galatiMeshurAdminRouter } from "./admin/galatimeshur";
import { misspellingsAdminRouter } from "./admin/misspellings";

export const adminRouter = createTRPCRouter({
  dynamicParameters: dynamicParametersRouter,
  wordRelations: wordRelationsAdminRouter,
  announcements: adminAnnouncementsRouter,
  feedback: feedbackAdminRouter,
  dailyWords: dailyWordsAdminRouter,
  galatiMeshur: galatiMeshurAdminRouter,
  misspellings: misspellingsAdminRouter,
  deleteWord: adminProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ input: { id }, ctx: { db, session } }) => {
      try {
        await db.delete(words).where(eq(words.id, id));
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong",
        });
      }
    }),
  addWord: adminProcedure.input(AddWordSchema).mutation(async ({ ctx: { db }, input }) => {
    try {
      return await addWordWithTransaction(db, input);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to add word and its related data.",
        cause: error,
      });
    }
  }),
  checkWord: adminProcedure
    .input(z.string())
    .query(async ({ ctx: { db }, input: wordInput }) => {
      const word = await db
        .select({ id: words.id })
        .from(words)
        .where(eq(words.name, wordInput));
      return {
        wordAlreadyExists: word.length > 0,
      };
    }),
  getWordToEdit: adminProcedure.input(z.string()).query(async ({ ctx: { db }, input: queriedWord }) => {
    const result = await db.execute(sql
      `
        -- word attributes
        WITH word_attributes_agg AS
        (
          SELECT
            ws_a.word_id,
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'attribute_id', w_a.id,
                'attribute', w_a.attribute
              )
            ) AS attributes
          FROM words_attributes ws_a
          JOIN word_attributes w_a ON ws_a.attribute_id = w_a.id
          GROUP BY ws_a.word_id
        ),
        -- meaning attributes
        meaning_attributes_agg AS
        (
          SELECT
          ms_a.meaning_id,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'attribute_id', m_a.id,
              'attribute', m_a.attribute
            )
          ) AS attributes
          FROM meanings_attributes ms_a
          JOIN meaning_attributes m_a ON ms_a.attribute_id = m_a.id
          GROUP BY ms_a.meaning_id
        ),
        -- meanings
        meanings_agg AS
        (
          SELECT
            m.word_id,
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'meaning_id', m.id,
                'meaning', m.meaning,
                'part_of_speech', pos.part_of_speech,
                'part_of_speech_id', pos.id,
                'sentence', ex.sentence,
                'sentence_id', ex.id,
                'author', aut.name,
                'author_id', aut.id,
                'attributes', ma_agg.attributes
              ) ORDER BY m.id
            ) AS meanings
          FROM meanings m
          LEFT JOIN part_of_speechs pos ON m.part_of_speech_id = pos.id
          LEFT JOIN examples ex ON ex.meaning_id = m.id
          LEFT JOIN authors aut ON ex.author_id = aut.id
          LEFT JOIN meaning_attributes_agg ma_agg ON ma_agg.meaning_id = m.id
          GROUP BY m.word_id
        ),
        -- word with meanings and root
        words_with_meanings AS
        (
          SELECT
            w.id AS word_id,
            w.name AS word_name,
            w.phonetic AS phonetic,
            w.suffix AS suffix,
            w.prefix AS prefix,
            COALESCE(wa_agg.attributes, '[]'::json) AS word_attributes,
            JSON_BUILD_OBJECT(
            'root', r.root,
            'language_en', langs.language_en,
            'language_tr', langs.language_tr,
            'language_code', langs.language_code
            ) AS root,
            COALESCE(m_agg.meanings, '[]'::json) AS meanings
          FROM words w
          LEFT JOIN word_attributes_agg wa_agg ON w.id = wa_agg.word_id
          LEFT JOIN roots r ON r.word_id = w.id
          LEFT JOIN languages langs ON r.language_id = langs.id
          LEFT JOIN meanings_agg m_agg ON m_agg.word_id = w.id
          WHERE w.name = ${queriedWord}
        )
          -- combine all data as a single json object
          SELECT
            JSON_BUILD_OBJECT(
            'word_id', word_id,
            'word_name', word_name,
            'attributes', word_attributes,
            'phonetic', phonetic,
            'prefix', prefix,
            'suffix', suffix,
            'root', root,
            'meanings', meanings
          ) AS word_data
          FROM words_with_meanings;
      `
    ) as WordSearchResult[]
    return result
  }),
  addNewWordAttribute: adminProcedure.input(z.string().min(2)).mutation(async ({ input: newWordAttribute, ctx: { db } }) => {
    try {
      const result = await db.insert(wordAttributes).values({
        attribute: newWordAttribute
      }).returning()
      return result
    } catch (error) {
      console.log(error)
      return new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Unexpected Error."
      })
    }
  }),
  addNewMeaningAttribute: adminProcedure.input(z.string().min(2)).mutation(async ({ input: newMeaningAttribute, ctx: { db } }) => {
    try {
      const result = await db.insert(meaningAttributes).values({
        attribute: newMeaningAttribute
      }).returning()
      return result
    } catch (error) {
      console.log(error)
      return new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Unexpected Error."
      })
    }
  }),
  addAuthor: adminProcedure.input(z.string().min(2)).mutation(
    async ({ input: name, ctx: { db } }) => {
      try {
        const result = await db.insert(authors).values({
          name
        }).returning()
        return result
      } catch (error) {
        console.log(error)
        return new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Unexpected Error."
        })
      }
    }
  ),
  editWord: adminProcedure.input(EditWordSchema).mutation(async ({ input: word, ctx: { db } }) => {
    try {
      const updatedWord = await db.update(words).set({
        name: word.name,
        prefix: word.prefix,
        suffix: word.suffix,
        phonetic: word.phonetic,
        updated_at: new Date(Date.now()).toISOString()
      }).where(eq(words.id, word.id)).returning().execute()
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred while updating the word's details. Please try again. If the error persists, please contact the admins or developers.",
        cause: {

        }
      })
    }


    if (word.language && word.root) {
      try {
        const [result] = await db.select({
          id: languages.id
        }).from(languages).where(eq(languages.language_code, word.language))
        const [rootOfWord] = await db.select().from(roots).where(eq(roots.wordId, word.id))
        if (!rootOfWord) {
          await db.insert(roots).values({
            wordId: word.id,
            languageId: result.id,
            root: word.root
          })
        } else {
          await db.update(roots).set({
            languageId: result.id,
            root: word.root
          }).where(eq(roots.id, rootOfWord.id))
        }
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while updating the word's language details! Please try again. If the error persists, please contact the admins or developers."
        })
      }
    }

    if (word.attributes && word.attributes.length === 0) {
      try {
        await db.delete(wordsAttributes).where(eq(wordsAttributes.wordId, word.id))

      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while removing the unselected word attributes! Please try again. If the error persists, please contact the admins or developers."
        })
      }
    }

    if (word.attributes && word.attributes.length > 0) {
      try {
        const existingWordAttributes = await db.select({ attributeId: wordsAttributes.attributeId }).from(wordsAttributes).where(eq(wordsAttributes.wordId, word.id))
        const wordAttributesToBeDeleted = existingWordAttributes.filter(val => !word.attributes?.includes(val.attributeId)).map(val => val.attributeId)
        for (const attributeId of wordAttributesToBeDeleted) {
          await db.delete(wordsAttributes).where(eq(wordsAttributes.attributeId, attributeId))
        }
        for (const attributeId of word.attributes) {
          await db.insert(wordsAttributes).values({
            attributeId,
            wordId: word.id
          }).onConflictDoNothing()
        }

      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while updating the word's attributes. Please try again. If the error persists, please contact the admins or developers."
        })
      }
    }
    let brandNewMeanings, meaningIdsToBeDeleted, meaningsToUpdate;
    try {
      const existingMeaningIdsResponse = await db.query.meanings.findMany({
        where: eq(meanings.wordId, word.id),
        columns: {
          id: true
        }
      })
      const existingMeaningIds = existingMeaningIdsResponse.map((val) => val.id)
      const meaningIdsRecieved = word.meanings.map(meaning => meaning.id)
      brandNewMeanings = word.meanings.filter((value) => value.id === '')
      meaningIdsToBeDeleted = existingMeaningIds.filter((receivedId) => !meaningIdsRecieved.includes(receivedId as number))
      meaningsToUpdate = word.meanings.filter(meaning => meaning.id !== '')
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unknown error occurred in meaning update logic. If it keeps happening, please contact with the developer!",
      })
    }


    if (meaningsToUpdate.length > 0) {
      for (const meaning of meaningsToUpdate) {
        try {
          await db.update(meanings).set({
            meaning: meaning.meaning,
            partOfSpeechId: meaning.partOfSpeechId,
          }).where(eq(meanings.id, meaning.id! as number))
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "An error occurred while updating the meaning and its part of speech. Please try again. If the error persists, please contact the admins or developers."
          })
        }


        if (meaning.attributes && meaning.attributes.length === 0) {
          try {
            await db.delete(meaningsAttributes).where(eq(meaningsAttributes.meaningId, meaning.id! as number))
          } catch (error) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "An error occurred while removing the unselected meaning attributes. Please try again. If the error persists, please contact the admins or developers."
            })
          }
        }

        if (meaning.attributes && meaning.attributes.length > 0) {
          try {
            const existingMeaningAttributes = await db.select({ attributeId: meaningsAttributes.attributeId }).from(meaningsAttributes).where(eq(meaningsAttributes.meaningId, meaning.id as number))
            const meaningAttributeIdsToBeDeleted = existingMeaningAttributes.filter(att => !meaning.attributes?.includes(att.attributeId)).map(val => val.attributeId)

            for (const attributeId of meaningAttributeIdsToBeDeleted) {
              await db.delete(meaningsAttributes).where(eq(meaningsAttributes.attributeId, attributeId))
            }

            for (const attributeId of meaning.attributes) {
              await db.insert(meaningsAttributes).values({
                attributeId: attributeId,
                meaningId: meaning.id as number,
              }).onConflictDoNothing()
            }
          } catch (error) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "An error occurred while updating the meaning attributes. Please try again. If the error persists, please contact the admins or developers."
            })
          }
        }

        if (meaning.exampleSentence) {
          try {
            const hasAlreadyExample = await db.query.examples.findFirst({
              where: eq(examples.meaningId, meaning.id as number)
            })
            if (hasAlreadyExample) {
              await db.update(examples).set({
                authorId: meaning.authorId,
                meaningId: meaning.id as number,
                sentence: meaning.exampleSentence
              }).where(eq(examples.meaningId, meaning.id! as number))
            }
            else {
              await db.insert(examples).values({
                meaningId: meaning.id as number,
                sentence: meaning.exampleSentence,
                authorId: meaning.authorId
              })
            }
          } catch (error) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "An error occurred while updating the example sentence and/or author. Please try again. If the error persists, please contact the admins or developers."
            })
          }
        }
      }
    }


    if (brandNewMeanings.length > 0) {
      for (const newMeaning of brandNewMeanings) {
        try {
          const insertedMeaning = await db.insert(meanings).values({
            meaning: newMeaning.meaning,
            partOfSpeechId: newMeaning.partOfSpeechId,
            wordId: word.id,
          }).returning()

          if (newMeaning.exampleSentence)
            await db.insert(examples).values({
              sentence: newMeaning.exampleSentence,
              authorId: newMeaning.authorId,
              meaningId: insertedMeaning[0].id
            })

          if (newMeaning.attributes && newMeaning.attributes.length > 0) {
            for (const attribute of newMeaning.attributes) {
              await db.insert(meaningsAttributes).values({
                attributeId: attribute,
                meaningId: insertedMeaning[0].id,
              })
            }
          }
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "An error occurred while creating new meanings. Please try again. If the error persists, please contact the admins or developers."
          })
        }

      }
    }

    if (meaningIdsToBeDeleted.length > 0)
      try {
        for (const meaningId of meaningIdsToBeDeleted) {
          await db.delete(meanings).where(eq(meanings.id, meaningId))
        }
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while removing the unselected meanings. Please try again. If the error persists, please contact the admins or developers."
        })
      }
    const message = "All updating operations gone successfull!"
    return {
      message
    }
  })
});
