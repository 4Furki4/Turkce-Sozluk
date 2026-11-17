import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { and, count, eq, ilike, inArray } from "drizzle-orm";
import { BookOpenText, Search } from "lucide-react";
import { db } from "@/db";
import {
  etymologyClaims,
  etymologyEntries,
  etymologyMatches,
  etymologySources,
} from "@/db/schema/etymology";
import { getPathname, Link } from "@/src/i18n/routing";
import { getEtymologyPilotScanDirectory } from "./pilot-access";
import { ScanReview } from "./scan-review";
import { bookPageCount, entryIdPattern } from "./book-catalog";
import { isEtymologyReviewEnabled } from "@/src/server/etymology/pilot-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Etymology preview",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; source?: string; page?: string; scan?: string; entry?: string }>;
};

export default async function EtymologyPreviewPage({ params, searchParams }: Props) {
  const reviewEnabled = isEtymologyReviewEnabled();
  const query = await searchParams;
  if (query.scan === undefined && !reviewEnabled) notFound();
  const scanDirectory = getEtymologyPilotScanDirectory();

  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "EtymologyPreview" });
  const path = getPathname({ locale: locale === "en" ? "en" : "tr", href: "/etymology-preview" });
  if (query.scan !== undefined) {
    if (!scanDirectory || typeof query.scan !== "string" || !/^[1-9]\d{0,2}$/.test(query.scan)
      || Number(query.scan) > bookPageCount) notFound();
    const entryId = typeof query.entry === "string" && entryIdPattern.test(query.entry)
      ? query.entry : undefined;
    return <ScanReview directory={scanDirectory} page={Number(query.scan)} path={path} locale={locale} entryId={entryId} showReviewLink={reviewEnabled} />;
  }
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 80) : "";
  const sourceId = typeof query.source === "string" && /^\d+$/.test(query.source)
    ? Number(query.source) : undefined;
  const requestedPage = typeof query.page === "string" ? Number(query.page) : 1;
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 20;
  const filter = and(
    q ? ilike(etymologyEntries.headword, `%${q}%`) : undefined,
    sourceId ? eq(etymologyEntries.sourceId, sourceId) : undefined,
  );

  const [sources, [{ total }], [{ allEntries }], [{ claimTotal }], [{ matchTotal }], entries] = await Promise.all([
    db.select({ id: etymologySources.id, title: etymologySources.title, author: etymologySources.author })
      .from(etymologySources).orderBy(etymologySources.title),
    db.select({ total: count() }).from(etymologyEntries).where(filter),
    db.select({ allEntries: count() }).from(etymologyEntries),
    db.select({ claimTotal: count() }).from(etymologyClaims),
    db.select({ matchTotal: count() }).from(etymologyMatches),
    db.select().from(etymologyEntries).where(filter)
      .orderBy(etymologyEntries.sourceId, etymologyEntries.sourceEntryKey)
      .limit(pageSize).offset((page - 1) * pageSize),
  ]);

  const entryIds = entries.map((entry) => entry.id);
  const claims = entryIds.length
    ? await db.select().from(etymologyClaims).where(inArray(etymologyClaims.entryId, entryIds)).orderBy(etymologyClaims.id)
    : [];
  const matches = entryIds.length
    ? await db.select({ entryId: etymologyMatches.entryId, status: etymologyMatches.status })
      .from(etymologyMatches).where(inArray(etymologyMatches.entryId, entryIds))
    : [];
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const claimsByEntry = Map.groupBy(claims, (claim) => claim.entryId);
  const matchesByEntry = Map.groupBy(matches, (match) => match.entryId);
  const pageCount = Math.ceil(total / pageSize);
  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sourceId) params.set("source", String(sourceId));
    if (target > 1) params.set("page", String(target));
    const search = params.toString();
    return search ? `${path}?${search}` : path;
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-foreground/10 pb-7">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
            <BookOpenText aria-hidden="true" size={18} />
            {t("label")}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/65">{t("description")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/etimoloji" className="rounded-lg border border-primary/40 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10">
            {t("reader")}
          </Link>
          {scanDirectory && (
            <a href={`${path}?scan=1`} className="rounded-lg border border-foreground/15 px-4 py-2 text-sm font-medium hover:bg-foreground/5">
              {t("scanReview")}
            </a>
          )}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4 border-b border-foreground/10 pb-7 text-sm sm:max-w-xl">
        <div><strong className="block text-2xl font-semibold tabular-nums">{allEntries}</strong><span className="text-foreground/60">{t("entries")}</span></div>
        <div><strong className="block text-2xl font-semibold tabular-nums">{claimTotal}</strong><span className="text-foreground/60">{t("claims")}</span></div>
        <div><strong className="block text-2xl font-semibold tabular-nums">{matchTotal}</strong><span className="text-foreground/60">{t("matches")}</span></div>
      </div>

      <form action={path} method="get" className="mb-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">{t("search")}</span>
          <Search aria-hidden="true" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/45" />
          <input name="q" type="search" defaultValue={q} placeholder={t("search")}
            className="w-full rounded-xl border border-foreground/15 bg-background/40 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary" />
        </label>
        <label className="sr-only" htmlFor="etymology-source">{t("source")}</label>
        <select id="etymology-source" name="source" defaultValue={sourceId ?? ""}
          className="rounded-xl border border-foreground/15 bg-background/40 px-3 py-2.5 text-sm sm:min-w-52">
          <option value="">{t("allSources")}</option>
          {sources.map((source) => <option key={source.id} value={source.id}>{source.author} · {source.title}</option>)}
        </select>
        <button type="submit" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          {t("filter")}
        </button>
      </form>

      {(q || sourceId) && <p className="mb-3 text-sm text-foreground/60">{t("resultCount", { count: total })}</p>}

      <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-background/40">
        {entries.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-foreground/60">{t("empty")}</p>
        ) : entries.map((entry) => {
          const entryClaims = claimsByEntry.get(entry.id) ?? [];
          const entryMatches = matchesByEntry.get(entry.id) ?? [];
          const source = sourceById.get(entry.sourceId);
          return (
            <details key={entry.id} className="group border-b border-foreground/10 last:border-b-0">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 hover:bg-foreground/[0.03] focus-visible:outline-2 focus-visible:outline-primary sm:px-6">
                <span className="min-w-0 flex-1">
                  <strong className="block text-lg font-semibold">{entry.headword}</strong>
                  <span className="block truncate text-sm text-foreground/60">{entry.gloss ?? entry.ocrText?.split("\n")[0] ?? t("noGloss")}</span>
                </span>
                <span className="text-xs text-foreground/55">{source?.author} · {t("page", { page: entry.printedPageStart })}</span>
                <span className="rounded-full border border-foreground/15 px-2.5 py-1 text-xs">
                  {entry.transcriptionStatus === "verified" ? t("verified") : t("ocr")}
                </span>
                <span aria-hidden="true" className="text-foreground/50 transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <div className="space-y-5 border-t border-foreground/10 px-5 py-5 sm:px-6">
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-foreground/55">
                  <span>{t("kind")}: {entry.kind === "cross_reference" ? t("crossReference") : t("article")}</span>
                  <span>{t("pdfPage", { page: entry.pdfPageStart ?? 0 })}</span>
                  <span>{t("claimCount", { count: entryClaims.length })}</span>
                  <span>{t("matchCount", { count: entryMatches.length })}</span>
                  {entry.sourceLocator && <span>{entry.sourceLocator}</span>}
                  <span className="font-mono">{entry.sourceEntryKey}</span>
                </div>
                {entry.correctedText && (
                  <section>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">{t("transcription")}</h2>
                    <p className="max-w-4xl whitespace-pre-wrap text-sm leading-7">{entry.correctedText}</p>
                  </section>
                )}
                {entry.ocrText && (
                  <section>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">{t("ocrText")}</h2>
                    <p className="max-w-4xl whitespace-pre-wrap break-words text-sm leading-7">{entry.ocrText}</p>
                  </section>
                )}
                <section>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">{t("claims")}</h2>
                  {entryClaims.length === 0 ? <p className="text-sm text-foreground/60">{t("noClaims")}</p> : <ul className="divide-y divide-foreground/10">
                    {entryClaims.map((claim) => (
                      <li key={claim.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="mb-1 flex flex-wrap gap-2 text-xs text-foreground/55">
                          <span className="font-semibold text-foreground/75">{t(`kind_${claim.kind}`)}</span>
                          <span>· {t(`stance_${claim.stance}`)}</span>
                          <span>· {t(`review_${claim.reviewStatus}`)}</span>
                        </div>
                        <p className="text-sm leading-6">{claim.summary}</p>
                        {(claim.sourceForm || claim.targetForm) && (
                          <p className="mt-1 text-xs text-foreground/60">
                            {claim.sourceLanguageLabel && `${claim.sourceLanguageLabel} `}{claim.sourceForm}
                            {claim.sourceForm && claim.targetForm && " → "}
                            {claim.targetLanguageLabel && `${claim.targetLanguageLabel} `}{claim.targetForm}
                          </p>
                        )}
                        {claim.referenceText && <p className="mt-1 text-xs text-foreground/50">{claim.referenceText}</p>}
                      </li>
                    ))}
                  </ul>}
                </section>
              </div>
            </details>
          );
        })}
      </div>

      {pageCount > 1 && (
        <nav aria-label={t("pagination")} className="mt-6 flex items-center justify-between text-sm">
          <span className="text-foreground/60">{t("pageOf", { page, total: pageCount })}</span>
          <div className="flex gap-2">
            {page > 1 && <a href={pageHref(page - 1)} className="rounded-lg border border-foreground/15 px-3 py-2 hover:bg-foreground/5">{t("previous")}</a>}
            {page < pageCount && <a href={pageHref(page + 1)} className="rounded-lg border border-foreground/15 px-3 py-2 hover:bg-foreground/5">{t("next")}</a>}
          </div>
        </nav>
      )}
    </main>
  );
}
