import { db as sharedDatabase } from "@/db";
import type { WordSearchResult } from "@/types";
import { createPublicReadCache } from "./public-read-cache";
import { findWordDataByName } from "./word-queries";

// 45s server + 15s client reuse keeps the combined online window within 60s.
const wordCache = createPublicReadCache<WordSearchResult[]>(45_000, 1_024);

export function readWord(db: typeof sharedDatabase, name: string) {
  // Transaction/test database handles must never reuse a result from another DB.
  if (db !== sharedDatabase || name.length > 255) return findWordDataByName(db, name);
  return wordCache.read(name, () => findWordDataByName(sharedDatabase, name));
}

export const invalidateWordCache = () => wordCache.invalidate();
export const getWordCacheStats = () => wordCache.stats();
