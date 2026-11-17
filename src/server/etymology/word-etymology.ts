import { and, eq, inArray, isNotNull, isNull, ne, or } from "drizzle-orm";
import type { db } from "@/db";
import { etymologyClaims, etymologyEntries, etymologyMatches, etymologySources } from "@/db/schema/etymology";
import { meanings } from "@/db/schema/meanings";
import { words } from "@/db/schema/words";
import source from "@/data/etymology/hasan-eren-page-31-entry-boundaries.json";
import type { WordEtymology } from "@/src/lib/word-etymology";
import { isEtymologyWordPilotEnabled } from "./pilot-access";

export async function getPilotWordEtymology(database: typeof db, scope: { name: string } | { wordIds: number[] }) {
  const result = new Map<number, WordEtymology[]>();
  if (!isEtymologyWordPilotEnabled() || ("wordIds" in scope && !scope.wordIds.length)) return result;

  const rows = await database.select({
    wordId: etymologyMatches.wordId,
    matchId: etymologyMatches.id,
    meaningId: etymologyMatches.meaningId,
    entryKey: etymologyEntries.sourceEntryKey,
    firstPage: etymologyEntries.printedPageStart,
    lastPage: etymologyEntries.printedPageEnd,
    author: etymologySources.author,
    senseLabel: etymologyClaims.senseLabel,
    kind: etymologyClaims.kind,
    summary: etymologyClaims.summary,
  })
    .from(etymologyMatches)
    .innerJoin(words, eq(words.id, etymologyMatches.wordId))
    .innerJoin(etymologyEntries, eq(etymologyEntries.id, etymologyMatches.entryId))
    .innerJoin(etymologySources, eq(etymologySources.id, etymologyEntries.sourceId))
    .innerJoin(etymologyClaims, eq(etymologyClaims.entryId, etymologyEntries.id))
    .leftJoin(meanings, and(eq(meanings.id, etymologyMatches.meaningId), eq(meanings.wordId, etymologyMatches.wordId)))
    .where(and(
      "name" in scope ? eq(words.name, scope.name) : inArray(words.id, scope.wordIds),
      eq(etymologySources.documentSha256, source.documentSha256),
      eq(etymologyEntries.kind, "article"),
      eq(etymologyMatches.status, "accepted"),
      eq(etymologyClaims.reviewStatus, "accepted"),
      or(ne(etymologyClaims.kind, "commentary"), isNull(etymologyClaims.referenceText)),
      or(
        and(eq(etymologyMatches.relation, "word_level"), isNull(etymologyMatches.meaningId)),
        and(eq(etymologyMatches.relation, "same_sense"), isNotNull(meanings.id)),
      ),
    ))
    .orderBy(etymologyMatches.id, etymologyClaims.id);

  for (const matches of Map.groupBy(rows, ({ matchId }) => matchId).values()) {
    const overview = matches.find(({ kind, summary }) =>
      (kind === "origin" || kind === "derivation" || kind === "unknown_origin") && summary.trim(),
    ) ?? matches.find(({ kind, summary }) => kind === "attested_form" && summary.trim());
    if (!overview || !/^p[1-9]\d{0,2}-l\d{1,3}$/.test(overview.entryKey)) continue;
    const { wordId, matchId, kind, ...data } = overview;
    const entries = result.get(wordId) ?? [];
    entries.push({
      ...data,
      details: matches.filter((item) => item !== overview && item.summary.trim()).map(({ summary }) => summary),
    });
    result.set(wordId, entries);
  }
  return result;
}
