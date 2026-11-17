import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  etymologyClaims,
  etymologyEntries,
  etymologyMatches,
  etymologySources,
  type InsertEtymologyClaim,
} from "../../db/schema/etymology";
import { meanings } from "../../db/schema/meanings";
import { languages } from "../../db/schema/languages";
import { words } from "../../db/schema/words";
import eren from "../../data/etymology/hasan-eren-page-31-entry-boundaries.json";
import { isDevelopmentEtymologyDatabase, isLocalEtymologyDatabase } from "../server/etymology/pilot-access";

type PilotEntry = {
  key: string;
  headword: string;
  wordId: number;
  wordName: string;
  meaningId?: number;
  senseLabel?: string;
  firstPage: number;
  lastPage: number;
  claims: Pick<InsertEtymologyClaim, "kind" | "stance" | "summary" | "sourceForm" | "sourceLanguageLabel" | "targetForm" | "targetLanguageLabel">[];
};

const pilot: PilotEntry[] = [
  {
    key: "p3-l72", headword: "ağır", wordId: 92883, wordName: "ağır", firstPage: 3, lastPage: 4,
    claims: [
      { kind: "origin", stance: "asserted", summary: "Eren, sözcüğü “ağır gelmek” anlamındaki ağ- fiiline bağlar." },
      { kind: "derivation", stance: "asserted", sourceForm: "ağ-", sourceLanguageLabel: "Eski Türkçe", targetForm: "ağır", targetLanguageLabel: "Türkçe", summary: "Eski Türkçeden beri görülen ağır biçimini ağ- fiiline gelen -(ı)r ekiyle açıklar." },
    ],
  },
  {
    key: "p436-l0", headword: "vişne", wordId: 127984, wordName: "vişne", firstPage: 436, lastPage: 436,
    claims: [
      { kind: "origin", stance: "proposed", sourceForm: "višna", sourceLanguageLabel: "Bulgarca", targetForm: "vişne", targetLanguageLabel: "Türkçe", summary: "Eren, sözcüğün Slav dillerinden geldiğini ve Türkçeye Bulgarca üzerinden geçmiş göründüğünü belirtir." },
      { kind: "comparison", stance: "asserted", sourceForm: "višnja", sourceLanguageLabel: "Sırpça", targetForm: "vişne", targetLanguageLabel: "Türkçe", summary: "Bulgarca višna ile Sırpça višnja biçimlerini örnek verir." },
    ],
  },
  {
    key: "p4-l59", headword: "ağız¹", wordId: 204618, wordName: "ağız", firstPage: 4, lastPage: 5,
    meaningId: 214221, senseLabel: "Yüzdeki organ",
    claims: [
      { kind: "attested_form", stance: "asserted", sourceForm: "ağız", sourceLanguageLabel: "Eski Türkçe", summary: "Ağız biçimi Eski Türkçeden beri belgelenir." },
      { kind: "commentary", stance: "asserted", summary: "Eren, sondaki -z sesini ek olarak açıklayan görüşleri aktarır." },
    ],
  },
  {
    key: "p5-l76", headword: "ağız²", wordId: 204620, wordName: "ağız", firstPage: 5, lastPage: 5,
    meaningId: 214269, senseLabel: "İlk süt",
    claims: [
      { kind: "attested_form", stance: "asserted", sourceForm: "ağuz", sourceLanguageLabel: "Orta Türkçe", summary: "İlk süt anlamındaki sözcük Orta Türkçede ağuz biçiminde geçer." },
      { kind: "loan_out", stance: "asserted", sourceForm: "ağız", sourceLanguageLabel: "Türkçe", targetLanguageLabel: "Moğolca", summary: "Eren, bu anlamdaki sözcüğün Türkçeden Moğolcaya geçtiğini belirtir." },
    ],
  },
];

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || (!isLocalEtymologyDatabase(databaseUrl) && !isDevelopmentEtymologyDatabase(databaseUrl))) {
  throw new Error("This seed requires the Mac-local pilot or the development database tunnel.");
}

const client = postgres(databaseUrl, { max: 1 });
try {
  await drizzle(client).transaction(async (tx) => {
    const [source] = await tx.select({ id: etymologySources.id }).from(etymologySources)
      .where(eq(etymologySources.documentSha256, eren.documentSha256)).for("update");
    if (!source) throw new Error("Import the Hasan Eren source before seeding the word pilot.");
    const languageRows = await tx.select({ id: languages.id, name: languages.language_tr }).from(languages);
    const languageByName = Map.groupBy(languageRows, ({ name }) => name);
    const lookupLanguage = (label?: string | null) => {
      const rows = label ? languageByName.get(label) : undefined;
      return rows?.length === 1 ? rows[0].id : null;
    };

    for (const entry of pilot) {
      const [word] = await tx.select({ id: words.id }).from(words)
        .where(and(eq(words.id, entry.wordId), eq(words.name, entry.wordName)));
      if (!word) throw new Error(`Missing dictionary word ${entry.wordName} (${entry.wordId}).`);
      if (entry.meaningId !== undefined) {
        const [meaning] = await tx.select({ id: meanings.id }).from(meanings)
          .where(and(eq(meanings.id, entry.meaningId), eq(meanings.wordId, word.id)));
        if (!meaning) throw new Error(`Meaning ${entry.meaningId} does not belong to word ${word.id}.`);
      }

      await tx.insert(etymologyEntries).values({
        sourceId: source.id, sourceEntryKey: entry.key, headword: entry.headword,
        printedPageStart: entry.firstPage, printedPageEnd: entry.lastPage,
        pdfPageStart: entry.firstPage + 30, pdfPageEnd: entry.lastPage + 30,
        sourceLocator: entry.key,
      }).onConflictDoNothing();
      const [sourceEntry] = await tx.select({ id: etymologyEntries.id }).from(etymologyEntries)
        .where(and(eq(etymologyEntries.sourceId, source.id), eq(etymologyEntries.sourceEntryKey, entry.key),
          eq(etymologyEntries.headword, entry.headword)));
      if (!sourceEntry) throw new Error(`Unexpected source entry at ${entry.key}.`);

      await tx.insert(etymologyMatches).values({
        entryId: sourceEntry.id, wordId: word.id, meaningId: entry.meaningId,
        relation: entry.meaningId === undefined ? "word_level" : "same_sense", status: "accepted",
        proposedBy: "manual-pilot", reviewedAt: new Date(),
      }).onConflictDoNothing();

      const savedClaims = await tx.select({ kind: etymologyClaims.kind, summary: etymologyClaims.summary })
        .from(etymologyClaims).where(eq(etymologyClaims.entryId, sourceEntry.id));
      const newClaims = entry.claims.filter((claim) => !savedClaims.some(
        (saved) => saved.kind === claim.kind && saved.summary === claim.summary,
      ));
      if (newClaims.length) await tx.insert(etymologyClaims).values(newClaims.map((claim) => ({
        ...claim, entryId: sourceEntry.id, senseLabel: entry.senseLabel,
        sourceLanguageId: lookupLanguage(claim.sourceLanguageLabel), targetLanguageId: lookupLanguage(claim.targetLanguageLabel),
        reviewStatus: "accepted" as const, reviewedAt: new Date(),
      })));
    }
  });
  console.log(`Seeded the local pilot for ${pilot.length} dictionary records.`);
} finally {
  await client.end();
}
