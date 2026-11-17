import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUpRight, ScanLine } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/routing";
import { getEtymologyPilotScanDirectory } from "../etymology-preview/pilot-access";
import { pilotReaderEntries } from "../etymology-preview/pilot-reader-entries";
import { bookPageCount, pilotPageCount, readBookCatalog } from "../etymology-preview/book-catalog";
import { isEtymologyReviewEnabled, isEtymologyWordPilotEnabled } from "@/src/server/etymology/pilot-access";
import { readErenReaderEntries } from "@/src/server/etymology/reader-entries";
import { EntryIndex } from "./entry-index";
import { NotationGuide } from "./notation-guide";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ entry?: string | string[] }>;
};

const pilotEntries = pilotReaderEntries.map((entry) => ({ ...entry, crossReference: !entry.meaning }));

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "EtymologyReader" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function EtymologyPage({ params, searchParams }: Props) {
  if (!isEtymologyWordPilotEnabled() && !isEtymologyReviewEnabled()) notFound();
  const scanDirectory = getEtymologyPilotScanDirectory();
  const [{ locale }, { entry: entryId }, databaseEntries] = await Promise.all([
    params, searchParams, readErenReaderEntries({ includeDrafts: isEtymologyReviewEnabled() }),
  ]);
  const book = databaseEntries.length ? null : await readBookCatalog(scanDirectory);
  const t = await getTranslations({ locale, namespace: "EtymologyReader" });
  const entries = new Map((databaseEntries.length ? databaseEntries : pilotEntries).map((entry) => [entry.id, entry]));
  for (const draft of book?.entries ?? []) {
    entries.set(draft.id, {
      id: draft.id, headword: draft.headword, firstPage: draft.firstPage,
      lastPage: draft.lastPage > draft.firstPage ? draft.lastPage : undefined,
      meaning: draft.meaning, origin: draft.origin, continuesBeyondBatch: false, draft: !draft.reviewed,
      crossReference: !draft.meaning,
    });
  }
  const entry = (typeof entryId === "string" ? entries.get(entryId) : undefined)
    ?? entries.get("p3-l72") ?? pilotEntries[0];
  const items = [...entries.values()].map(({ id, headword, firstPage, draft, crossReference }) => ({ id, headword, firstPage, draft, crossReference }));
  const related = (entry.related ?? []).flatMap((id) => {
    const item = entries.get(id);
    return item ? [item] : [];
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-7 sm:px-6 lg:pt-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-5">
        <div>
          <h1 className="font-serif text-[2.35rem] leading-tight tracking-tight sm:text-5xl">{t("title")}</h1>
          <p className="mt-2 max-w-[64ch] text-sm leading-6 text-foreground/75">{t("description")}</p>
          <p className="mt-1 text-sm text-foreground/75">
            {t("coverage", { count: entries.size, pages: databaseEntries.length ? bookPageCount : (book?.pages.length ?? pilotPageCount), total: bookPageCount })}
          </p>
        </div>
        <a href="#isaretler" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          {t("Guide.title")}<ArrowDown size={15} aria-hidden="true" />
        </a>
      </header>

      <div className="mb-10 grid items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-6">
        <EntryIndex items={items} selectedId={entry.id} />
        <article id="madde" aria-labelledby="etymology-headword" className="min-w-0 scroll-mt-24 rounded-xl border border-foreground/15 bg-background/40">
          <div className="px-5 py-6 sm:px-8 sm:py-8">
            <h2 id="etymology-headword" lang="tr" className="wrap-anywhere font-serif text-[2.75rem] leading-tight tracking-tight sm:text-6xl">
              {entry.headword}
            </h2>
            {entry.draft && <p className="mt-2 text-sm text-foreground/75">{t("draft")}</p>}
            {entry.meaning && (
              <section className="mt-5 max-w-[68ch]">
                <h3 className="text-sm font-semibold text-foreground/75">{t("meaning")}</h3>
                <p lang="tr" className="mt-1 text-lg leading-normal">{entry.meaning}</p>
              </section>
            )}
            <section className="mt-6 max-w-[68ch] border-t border-foreground/15 pt-4">
              <h3 className="text-sm font-semibold text-foreground/75">{t(entry.crossReference ? "reference" : "origin")}</h3>
              <p lang="tr" className="mt-2 text-base leading-7">{entry.origin}</p>
              {entry.continuesBeyondBatch && <p className="mt-2 text-sm leading-6 text-foreground/75">{t("continues")}</p>}
            </section>
            {related.length > 0 && (
              <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-2 text-sm">
                <span className="font-semibold">{t("related")}</span>
                {related.map(({ id, headword }) => (
                  <Link key={id} lang="tr" href={{ pathname: "/etimoloji", query: { entry: id }, hash: "madde" }}
                    className="inline-flex items-center gap-1 text-primary underline underline-offset-4">
                    {headword}<ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            )}
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-foreground/15 px-5 py-4 text-sm sm:px-8">
            <p className="leading-6 text-foreground/75">
              Hasan Eren, <cite lang="tr">Türk Dilinin Etimolojik Sözlüğü</cite> (1999)
              {" · "}{entry.lastPage ? t("pages", { first: entry.firstPage, last: entry.lastPage }) : t("page", { page: entry.firstPage })}
            </p>
            {scanDirectory && (
              <Link href={{ pathname: "/etymology-preview", query: { scan: entry.firstPage, entry: entry.id }, hash: `entry-${entry.id}` }}
                prefetch={false}
                className="inline-flex min-h-10 items-center gap-2 font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                <ScanLine size={17} aria-hidden="true" />{t("scan")}
              </Link>
            )}
          </footer>
        </article>
      </div>

      <NotationGuide />
    </main>
  );
}
