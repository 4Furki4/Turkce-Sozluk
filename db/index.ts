import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import "dotenv/config";
import { users } from "./schema/users";
import { words } from "./schema/words";
import { relatedWords } from "./schema/related_words";
import { roots } from "./schema/roots";
import { savedWords } from "./schema/saved_words";
import { meanings } from "./schema/meanings";
import { examples } from "./schema/examples";
import { authors } from "./schema/authors";
import * as wordAttributes from "./schema/word_attributes";
import * as relatedPhrases from "./schema/related_phrases";
import { meaningAttributes } from "./schema/meaning_attributes";
import { partOfSpeechs } from "./schema/part_of_speechs";
import { requests } from "./schema/requests";
import { env } from "@/src/env.mjs";
import { announcements } from "./schema/announcements";
import { announcementTranslations } from "./schema/announcement_translations";
import { feedbacks } from "./schema/feedbacks";
import { feedbackVotes } from "./schema/feedback_votes";
import { request_votes } from "./schema/request_votes";
import { pronunciationVotes } from "./schema/pronunciation_votes";
import { pronunciations } from "./schema/pronunciations";

export const schema = {
  users,
  words,
  relatedWords,
  roots,
  savedWords,
  meanings,
  examples,
  authors,
  ...wordAttributes,
  ...relatedPhrases,
  meaningAttributes,
  partOfSpeechs,
  requests,
  request_votes,
  pronunciations,
  pronunciationVotes,
  announcements,
  announcementTranslations,
  feedbacks,
  feedbackVotes
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

