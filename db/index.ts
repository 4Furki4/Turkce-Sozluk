import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import "dotenv/config";
import { users, usersRelations } from "./schema/users";
import { words, wordsRelations } from "./schema/words";
import { relatedWords, relatedWordsToWordsRelations } from "./schema/related_words";
import { roots, rootsRelations } from "./schema/roots";
import { savedWords } from "./schema/saved_words";
import { meanings, meaningsRelations } from "./schema/meanings";
import { examples, examplesRelations } from "./schema/examples";
import { authors, authorsRelations } from "./schema/authors";
import * as wordAttributes from "./schema/word_attributes";
import * as relatedPhrases from "./schema/related_phrases";
import { meaningAttributes, meaningAttributesRelations } from "./schema/meaning_attributes";
import { partOfSpeechs, partOfSpeechsRelations } from "./schema/part_of_speechs";
import { requests, requestsRelations } from "./schema/requests";
import { env } from "@/src/env.mjs";
import { announcements, announcementsRelations } from "./schema/announcements";
import { announcementTranslations } from "./schema/announcement_translations";
import { feedbacks, feedbacksRelations } from "./schema/feedbacks";
import { feedbackVotes, feedbackVotesRelations } from "./schema/feedback_votes";
import { request_votes } from "./schema/request_votes";
import { pronunciationVotes, pronunciationVotesRelations } from "./schema/pronunciation_votes";
import { pronunciations, pronunciationsRelations } from "./schema/pronunciations";
import { dailyWords, dailyWordsRelations } from "./schema/daily-words";
import { misspellings, misspellingsRelations } from "./schema/misspellings";
import { galatiMeshur, galatiMeshurRelations } from "./schema/galatimeshur";
import { badges, badgesRelations, usersToBadges, usersToBadgesRelations } from "./schema/gamification";

export const schema = {
  users,
  usersRelations,
  words,
  wordsRelations,
  relatedWords,
  roots,
  rootsRelations,
  savedWords,
  meanings,
  meaningsRelations,
  examples,
  examplesRelations,
  authors,
  authorsRelations,
  ...wordAttributes,
  ...relatedPhrases,
  meaningAttributes,
  meaningAttributesRelations,
  partOfSpeechs,
  partOfSpeechsRelations,
  requests,
  requestsRelations,
  request_votes,
  pronunciations,
  pronunciationsRelations,
  pronunciationVotes,
  pronunciationVotesRelations,
  announcements,
  announcementsRelations,
  announcementTranslations,
  feedbacks,
  feedbacksRelations,
  feedbackVotes,
  feedbackVotesRelations,
  dailyWords,
  dailyWordsRelations,
  misspellings,
  misspellingsRelations,
  galatiMeshur,
  galatiMeshurRelations,
  badges,
  badgesRelations,
  usersToBadges,
  usersToBadgesRelations
};

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};
const conn = globalForDb.conn ?? postgres(env.DATABASE_URL);
if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });

export const migrateToLatest = async () => {
  await migrate(db, { migrationsFolder: "drizzle/migrations" });
};

