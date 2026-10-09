import { max, sql } from "drizzle-orm";
import { db as sharedDatabase } from "@/db";
import { words } from "@/db/schema/words";
import { readPublicDictionary } from "./dictionary-cache";

/** One statement and one cache entry keep the version attached to its word list. */
export function getAutocompleteSnapshot(db: typeof sharedDatabase) {
  return readPublicDictionary(db, "autocomplete-snapshot", async () => {
    const [snapshot] = await db.select({
      latest: max(words.updated_at),
      names: sql<string[]>`coalesce(json_agg(${words.name}), '[]'::json)`,
    }).from(words);
    return { version: String(snapshot?.latest ?? "0"), words: snapshot?.names ?? [] };
  });
}
