import { join } from "node:path";
import { ArrowLeft, ArrowRight, BookOpenText, ScanLine } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/routing";
import { getScanSourceDirectory, readOptional, readScanPage } from "./scan-page";
import { ScanWorkspace } from "./scan-workspace";
import { ScanNotationPopover } from "./scan-notation-popover";
import { groupBookScanEntries, groupScanEntries } from "./scan-entries";
import { bookPageCount, pilotPageCount, readBookCatalog } from "./book-catalog";

export async function ScanReview({ directory, page, path, locale, entryId, showReviewLink }: {
  directory: string;
  page: number;
  path: string;
  locale: string;
  entryId?: string;
  showReviewLink: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "EtymologyScan" });
  const sourceDirectory = (number: number) => getScanSourceDirectory(directory, number);
  const [catalog, scan] = await Promise.all([
    readBookCatalog(directory),
    readOptional(join(sourceDirectory(page), `page-${page + 30}`, "page-image.png")),
  ]);
  const catalogEntries = catalog?.entries.filter((entry) => entry.firstPage <= page && page <= entry.lastPage) ?? [];
  const pageNumbers = new Set<number>([page]);
  if (page <= pilotPageCount) {
    for (let number = 1; number <= pilotPageCount; number++) pageNumbers.add(number);
  }
  for (const entry of catalogEntries) {
    for (let number = entry.firstPage; number <= entry.lastPage; number++) pageNumbers.add(number);
  }
  const numbers = [...pageNumbers].sort((a, b) => a - b);
  const pages = await Promise.all(numbers.map((number) => readScanPage(sourceDirectory(number), number)));
  const data = pages[numbers.indexOf(page)];
  const pilotPages = pages.slice(0, pilotPageCount);
  const pilotEntries = page <= pilotPageCount && pilotPages.every((item) => item !== null)
    ? groupScanEntries(pilotPages).filter((entry) => entry.lines.some((line) => line.page === page))
    : [];
  const bookEntries = pages.every((item) => item !== null) ? groupBookScanEntries(pages, catalogEntries) : [];
  const bookIds = new Set(bookEntries.map((entry) => entry.id));
  const entries = [...pilotEntries.filter((entry) => !bookIds.has(entry.id)), ...bookEntries];
  const neighbors = page <= pilotPageCount
    ? Array.from({ length: pilotPageCount }, (_, index) => index + 1)
    : Array.from({ length: 5 }, (_, index) => page - 2 + index).filter((number) => number >= 1 && number <= bookPageCount);
  const navigation = "inline-flex min-h-10 items-center gap-2 rounded-md border border-foreground/15 px-3 text-sm font-medium hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-primary";
  return (
    <main className="mx-auto w-full max-w-[92rem] px-4 pb-10 pt-5 sm:px-6 lg:pt-7">
      <ScanNotationPopover />
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-primary">
            <BookOpenText size={16} aria-hidden="true" /> Hasan Eren
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-foreground/65">{t("pageDescription", { page, pdf: page + 30 })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showReviewLink && <a href={path} className={navigation}><ArrowLeft size={16} aria-hidden="true" />{t("entries")}</a>}
          <Link href={{ pathname: "/etimoloji", query: entryId ? { entry: entryId } : undefined }} className={navigation}>
            <BookOpenText size={16} aria-hidden="true" />{t("reader")}
          </Link>
        </div>
      </header>
      <nav className="mb-4 flex flex-wrap items-center justify-between gap-2 border-y border-foreground/10 py-2.5" aria-label={t("pageNavigation")}>
        <div className="flex flex-wrap gap-1">
          {neighbors.map((number) => (
            <a key={number} href={`${path}?scan=${number}`} aria-label={t("printedPage", { page: number })}
              aria-current={number === page ? "page" : undefined}
              className={`grid size-10 place-items-center rounded-md text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-primary ${number === page ? "bg-primary font-semibold text-primary-foreground" : "text-foreground/75 hover:bg-foreground/10"}`}>
              {number}
            </a>
          ))}
        </div>
        <form action={path} method="get" className="flex flex-wrap items-center gap-2">
          <label htmlFor="scan-page" className="text-sm">{t("goToPage")}</label>
          <input id="scan-page" name="scan" type="number" min={1} max={bookPageCount} defaultValue={page} required
            className="min-h-10 w-20 rounded-md border border-foreground/20 bg-background/40 px-2 text-sm" />
          <button className={navigation} type="submit">{t("openPage")}</button>
        </form>
        <div className="flex gap-2">
          {page > 1 && <a href={`${path}?scan=${page - 1}`} className={navigation}><ArrowLeft size={16} aria-hidden="true" />{t("previous")}</a>}
          {page < bookPageCount && <a href={`${path}?scan=${page + 1}`} className={navigation}>{t("next")}<ArrowRight size={16} aria-hidden="true" /></a>}
        </div>
      </nav>
      {data && scan ? (
        <ScanWorkspace key={`${page}:${entryId ?? ""}`}
          data={{ printedPage: page, imageWidth: data.imageWidth, imageHeight: data.imageHeight, lineCount: data.bodyLines.length }}
          entries={entries} path={path}
          initialEntryId={entryId} imageUrl={`data:image/png;base64,${scan.toString("base64")}`} />
      ) : (
        <div className="flex min-h-52 items-center justify-center gap-3 rounded-xl border border-foreground/10 bg-background/40 px-4 text-sm text-foreground/70">
          <ScanLine size={20} aria-hidden="true" />{t("pending")}
        </div>
      )}
    </main>
  );
}
