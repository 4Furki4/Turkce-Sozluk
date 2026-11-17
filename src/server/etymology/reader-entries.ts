import { and, asc, eq, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { etymologyClaims, etymologyEntries, etymologySources } from "@/db/schema/etymology";
import source from "@/data/etymology/hasan-eren-page-31-entry-boundaries.json";
import { hasanErenReader } from "@/data/etymology/hasan-eren-reader";
import { entryIdPattern } from "@/src/app/[locale]/etymology-preview/book-catalog";

export async function readErenReaderEntries({ includeDrafts }: { includeDrafts: boolean }) {
  const rows = await db.select({
    id: etymologyEntries.sourceEntryKey,
    headword: etymologyEntries.headword,
    meaning: etymologyEntries.gloss,
    origin: etymologyClaims.summary,
    firstPage: etymologyEntries.printedPageStart,
    lastPage: etymologyEntries.printedPageEnd,
    status: etymologyClaims.reviewStatus,
    kind: etymologyEntries.kind,
  }).from(etymologyEntries)
    .innerJoin(etymologySources, eq(etymologySources.id, etymologyEntries.sourceId))
    .innerJoin(etymologyClaims, eq(etymologyClaims.entryId, etymologyEntries.id))
    .where(and(eq(etymologySources.documentSha256, source.documentSha256),
      eq(etymologyClaims.kind, "commentary"), isNotNull(etymologyClaims.referenceText),
      includeDrafts ? ne(etymologyClaims.reviewStatus, "rejected") : eq(etymologyClaims.reviewStatus, "accepted")))
    .orderBy(asc(etymologyEntries.printedPageStart), asc(etymologyEntries.id), asc(etymologyClaims.id));

  return rows.filter((row) => entryIdPattern.test(row.id)).map((row) => ({
    id: row.id,
    headword: row.headword,
    meaning: row.meaning ?? "",
    origin: row.origin,
    firstPage: row.firstPage,
    lastPage: row.lastPage && row.lastPage > row.firstPage ? row.lastPage : undefined,
    draft: row.status === "candidate",
    crossReference: row.kind === "cross_reference",
    related: hasanErenReader[row.id]?.related,
    continuesBeyondBatch: false,
  }));
}
