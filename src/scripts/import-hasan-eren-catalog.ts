import { resolve } from "node:path";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import fixture from "@/data/etymology/hasan-eren-pilot.json";
import boundaries from "@/data/etymology/hasan-eren-page-31-entry-boundaries.json";
import { etymologyAbbreviations, etymologyClaims, etymologyEntries, etymologySources, type InsertEtymologyClaim, type InsertEtymologyEntry } from "@/db/schema/etymology";
import { languages } from "@/db/schema/languages";
import { bookPageCount, getBookDirectory, pilotPageCount, readBookCatalog } from "@/src/app/[locale]/etymology-preview/book-catalog";
import { pilotReaderEntries } from "@/src/app/[locale]/etymology-preview/pilot-reader-entries";
import { groupBookScanEntries, groupScanEntries, type ScanEntry } from "@/src/app/[locale]/etymology-preview/scan-entries";
import { readScanPage } from "@/src/app/[locale]/etymology-preview/scan-page";
import { isDevelopmentEtymologyDatabase, isLocalEtymologyDatabase } from "@/src/server/etymology/pilot-access";

const write = process.argv.includes("--write");
const scanDirectory = resolve(process.env.ETYMOLOGY_OCR_DIR ?? "data/etymology/ocr-local/hasan-eren-pages-01-10");
const bookDirectory = getBookDirectory(scanDirectory);
const book = await readBookCatalog(scanDirectory);
if (!book || book.pages.length !== bookPageCount || new Set(book.pages.map(({ page }) => page)).size !== bookPageCount) {
  throw new Error("The import requires a catalog covering all 472 printed pages.");
}

const scans = [];
for (let page = 1; page <= bookPageCount; page++) {
  const scan = await readScanPage(page <= pilotPageCount ? scanDirectory : bookDirectory, page);
  if (!scan || scan.documentSha256 !== fixture.source.documentSha256) {
    throw new Error(`Missing or mismatched OCR on printed page ${page}.`);
  }
  scans.push(scan);
}

const allScans = new Map<string, ScanEntry>();
for (const entry of [...groupScanEntries(scans.slice(0, pilotPageCount)), ...groupBookScanEntries(scans, book.entries)]) {
  allScans.set(entry.id, entry);
}

const summaries = new Map(pilotReaderEntries.map(({ id, meaning, origin }) => [
  id, { id, meaning: meaning ?? "", origin, reviewed: true, evidence: [id] },
]));
for (const entry of book.entries) {
  summaries.set(entry.id, { ...entry, reviewed: entry.reviewed === true });
}

const verifiedById = new Map<string, (typeof fixture.entries)[number]>(boundaries.entries.flatMap(({ sourceEntryKey, firstLineIndex }) => {
  const entry = fixture.entries.find((item) => item.sourceEntryKey === sourceEntryKey);
  return entry ? [[`p1-l${firstLineIndex}`, entry] as const] : [];
}));
type ImportEntry = Omit<InsertEtymologyEntry, "sourceId">;
type ImportClaim = Omit<InsertEtymologyClaim, "entryId">;
const catalog = [...allScans.keys()].filter((id) => summaries.has(id)).map((id) => {
  const summary = summaries.get(id)!;
  const scan = allScans.get(id);
  if (!scan || !scan.lines.length) throw new Error(`No OCR for ${summary.id}`);
  const [first] = scan.lines;
  const last = scan.lines[scan.lines.length - 1];
  const verified = verifiedById.get(summary.id);
  const entry: ImportEntry = {
    sourceEntryKey: summary.id,
    headword: scan.headword,
    gloss: summary.meaning || null,
    kind: /^\s*[,;]?\s*bk\./iu.test(first.baseText.slice(scan.ocrHeadword.length)) ? "cross_reference" : "article",
    printedPageStart: first.page, printedPageEnd: last.page,
    pdfPageStart: first.page + 30, pdfPageEnd: last.page + 30,
    sourceLocator: `${summary.id}–p${last.page}-l${last.baseLineIndex}`,
    ocrText: scan.lines.map(({ baseText }) => baseText).join("\n"),
    correctedText: verified?.correctedText,
    transcriptionStatus: verified ? "verified" : "ocr",
  };
  const claim: ImportClaim = {
    kind: "commentary", stance: "unknown", summary: summary.origin,
    referenceText: summary.evidence.join(", "),
    reviewStatus: summary.reviewed ? "accepted" : "candidate",
    reviewedAt: summary.reviewed ? new Date() : null,
  };
  return { entry, claim };
});
if (catalog.length !== summaries.size) throw new Error("Some catalog summaries lack source entries.");

const abbreviations = [
  ["Ar", "Arapça"], ["Fr", "Fransızca"], ["Far", "Farsça"], ["R", "Rumca"],
  ["Erm", "Ermenice"], ["İtal", "İtalyanca"], ["ET", "Eski Türkçe"], ["OT", "Orta Türkçe"],
  ["Az", "Azerî"], ["Tkm", "Türkmence"], ["Çuv", "Çuvaşça"], ["Blg", "Bulgarca"], ["Srp", "Sırpça"],
] as const;

console.log(JSON.stringify({
  mode: write ? "write" : "dry-run", pages: scans.length, entries: catalog.length,
  reviewedSummaries: catalog.filter(({ claim }) => claim.reviewStatus === "accepted").length,
  draftSummaries: catalog.filter(({ claim }) => claim.reviewStatus === "candidate").length,
  verifiedTranscriptions: verifiedById.size, abbreviations: abbreviations.length,
}));
if (write) {
  const url = process.env.DATABASE_URL;
  if (!url || (!isLocalEtymologyDatabase(url) && !isDevelopmentEtymologyDatabase(url))) {
    throw new Error("Use the Mac pilot database or the development SSH tunnel.");
  }
  const client = postgres(url, { max: 1 });
  try {
    const result = await drizzle(client).transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${fixture.source.documentSha256}))`);
      const [existing] = await tx.select({ id: etymologySources.id }).from(etymologySources)
        .where(eq(etymologySources.documentSha256, fixture.source.documentSha256)).for("update");
      const [source] = existing ? [existing] : await tx.insert(etymologySources).values(fixture.source).returning({ id: etymologySources.id });
      const languageRows = await tx.select({ id: languages.id, name: languages.language_tr }).from(languages);
      const byLanguage = Map.groupBy(languageRows, ({ name }) => name);
      await tx.insert(etymologyAbbreviations).values(abbreviations.map(([code, expansion]) => {
        const matching = byLanguage.get(expansion);
        return { sourceId: source.id, kind: "language" as const, code, expansion, languageId: matching?.length === 1 ? matching[0].id : null };
      })).onConflictDoNothing();

      let entriesWritten = 0;
      for (let offset = 0; offset < catalog.length; offset += 180) {
        const rows = await tx.insert(etymologyEntries)
          .values(catalog.slice(offset, offset + 180).map(({ entry }) => ({ ...entry, sourceId: source.id })))
          .onConflictDoUpdate({
            target: [etymologyEntries.sourceId, etymologyEntries.sourceEntryKey],
            set: { ocrText: sql`excluded.ocr_text`, sourceLocator: sql`excluded.source_locator`,
              gloss: sql`coalesce(${etymologyEntries.gloss}, excluded.gloss)` },
            setWhere: sql`${etymologyEntries.ocrText} is null`,
          }).returning({ id: etymologyEntries.id });
        entriesWritten += rows.length;
      }
      const entries = await tx.select({ id: etymologyEntries.id, key: etymologyEntries.sourceEntryKey, headword: etymologyEntries.headword })
        .from(etymologyEntries).where(eq(etymologyEntries.sourceId, source.id));
      const entryByKey = new Map(entries.map((entry) => [entry.key, entry]));
      const existingSummaries = await tx.select({ entryId: etymologyClaims.entryId }).from(etymologyClaims)
        .innerJoin(etymologyEntries, eq(etymologyEntries.id, etymologyClaims.entryId))
        .where(and(eq(etymologyEntries.sourceId, source.id), eq(etymologyClaims.kind, "commentary"), isNotNull(etymologyClaims.referenceText)));
      const summarized = new Set(existingSummaries.map(({ entryId }) => entryId));
      const claims = catalog.flatMap(({ entry, claim }) => {
        const saved = entryByKey.get(entry.sourceEntryKey);
        if (!saved || saved.headword !== entry.headword) throw new Error(`Conflicting source entry ${entry.sourceEntryKey}.`);
        return summarized.has(saved.id) ? [] : [{ ...claim, entryId: saved.id }];
      });
      for (let offset = 0; offset < claims.length; offset += 240) {
        await tx.insert(etymologyClaims).values(claims.slice(offset, offset + 240));
      }
      return { entriesWritten, insertedSummaries: claims.length };
    });
    console.log(JSON.stringify(result));
  } finally {
    await client.end();
  }
}
