import { env } from "@/src/env.mjs";

export function isLocalEtymologyDatabase(url: string) {
  const database = new URL(url);
  return ["127.0.0.1", "localhost"].includes(database.hostname)
    && database.pathname === "/turkish_dictionary_etymology";
}

export function isDevelopmentEtymologyDatabase(url: string) {
  const database = new URL(url);
  return database.hostname === "127.0.0.1" && database.port === "15432"
    && database.pathname === "/turkish_dictionary_development";
}

export function isEtymologyWordPilotEnabled() {
  return new URL(env.DATABASE_URL).pathname === "/turkish_dictionary_development"
    || (isLocalEtymologyDatabase(env.DATABASE_URL) && Boolean(env.ETYMOLOGY_OCR_DIR));
}

export function isEtymologyReviewEnabled() {
  return isLocalEtymologyDatabase(env.DATABASE_URL) || isDevelopmentEtymologyDatabase(env.DATABASE_URL);
}
