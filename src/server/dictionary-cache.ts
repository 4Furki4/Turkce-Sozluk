import { db as sharedDatabase } from "@/db";
import { createPublicReadCache } from "./public-read-cache";

// 30s server + the standard 30s client stale time stays within 60s.
const cache = createPublicReadCache<unknown>(30_000, 256);

/** Only use for public, session-independent dictionary metadata/search results. */
export function readPublicDictionary<T>(db: typeof sharedDatabase, key: string, load: () => Promise<T>): Promise<T> {
  if (db !== sharedDatabase) return load();
  return cache.read(key, load) as Promise<T>;
}

export const invalidateDictionaryCache = () => cache.invalidate();
