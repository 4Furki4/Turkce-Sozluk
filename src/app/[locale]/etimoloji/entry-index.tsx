"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/routing";

export type EntryIndexItem = {
  id: string;
  headword: string;
  firstPage: number;
  draft: boolean;
  crossReference: boolean;
};

const pageSize = 8;
const alphabet = new Intl.Collator("tr", { numeric: true, sensitivity: "variant" });
type Filter = "all" | "reviewed" | "drafts" | "references";
type Sort = "book" | "alphabetical" | "reverse";

function searchText(value: string) {
  return value.toLocaleLowerCase("tr").normalize("NFKD").replace(/\p{M}/gu, "").replaceAll("ı", "i");
}

export function EntryIndex({ items, selectedId }: { items: EntryIndexItem[]; selectedId: string }) {
  const t = useTranslations("EtymologyReader");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("book");
  const [requestedPage, setRequestedPage] = useState<number | null>(null);
  const needle = searchText(query.trim());

  const matches = useMemo(() => {
    const results = items.filter((item) => searchText(item.headword).includes(needle) && (
      filter === "all" || (filter === "reviewed" && !item.draft)
      || (filter === "drafts" && item.draft) || (filter === "references" && item.crossReference)
    ));
    if (sort === "book") return results;
    return results.sort((a, b) => (sort === "reverse" ? -1 : 1) * alphabet.compare(a.headword, b.headword));
  }, [filter, items, needle, sort]);
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  const selectedIndex = matches.findIndex(({ id }) => id === selectedId);
  const page = Math.min(requestedPage ?? Math.floor(Math.max(0, selectedIndex) / pageSize), totalPages - 1);
  const visible = matches.slice(page * pageSize, (page + 1) * pageSize);
  const selectStyle = "min-h-10 w-full min-w-0 rounded-md border border-border bg-background/60 px-2.5 text-sm focus-visible:outline-2 focus-visible:outline-primary";
  const pagerStyle = "grid size-10 place-items-center rounded-md hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40";

  return (
    <nav aria-labelledby="etymology-index-title" className="min-w-0 rounded-xl border border-border bg-background/40">
      <div className="space-y-3 px-4 pb-3 pt-4">
        <h2 id="etymology-index-title" className="font-serif text-xl font-semibold">{t("index")}</h2>
        <div className="relative">
          <label htmlFor="etymology-index-search" className="sr-only">{t("search")}</label>
          <Search size={17} aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            id="etymology-index-search" type="search" value={query} placeholder={t("search")}
            onChange={(event) => { setQuery(event.currentTarget.value); setRequestedPage(0); }}
            className="h-11 w-full min-w-0 rounded-md border border-border bg-background/60 ps-9 pe-10 text-base placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button" aria-label={t("indexClear")} className="absolute end-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              onClick={() => { setQuery(""); setRequestedPage(0); document.getElementById("etymology-index-search")?.focus(); }}
            ><X size={15} aria-hidden="true" /></button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="etymology-index-filter">{t("indexFilter")}</label>
            <select id="etymology-index-filter" className={selectStyle} value={filter}
              onChange={(event) => { setFilter(event.currentTarget.value as Filter); setRequestedPage(0); }}>
              <option value="all">{t("indexAll")}</option>
              <option value="reviewed">{t("indexReviewed")}</option>
              {items.some((item) => item.draft) && <option value="drafts">{t("indexDrafts")}</option>}
              <option value="references">{t("indexReferences")}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground" htmlFor="etymology-index-sort">
              <ArrowDownUp size={12} aria-hidden="true" />{t("indexSort")}
            </label>
            <select id="etymology-index-sort" className={selectStyle} value={sort}
              onChange={(event) => { setSort(event.currentTarget.value as Sort); setRequestedPage(0); }}>
              <option value="book">{t("indexBookOrder")}</option>
              <option value="alphabetical">{t("indexAscending")}</option>
              <option value="reverse">{t("indexDescending")}</option>
            </select>
          </div>
        </div>
      </div>

      <p role="status" className="border-y border-border px-4 py-2 text-xs tabular-nums text-muted-foreground">
        {t("count", { count: matches.length })}
      </p>
      {visible.length ? (
        <ul className="divide-y divide-border px-2 py-1">
          {visible.map(({ id, headword, firstPage }) => (
            <li key={id} className="py-0.5">
              <Link
                href={{ pathname: "/etimoloji", query: { entry: id }, hash: "madde" }}
                aria-current={selectedId === id ? "true" : undefined}
                prefetch={false}
                className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-md px-2.5 py-1.5 hover:bg-foreground/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary aria-[current=true]:bg-primary/10 aria-[current=true]:text-primary"
              >
                <span lang="tr" className="min-w-0 wrap-anywhere font-medium">{headword}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{t("page", { page: firstPage })}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="px-4 py-6 text-sm text-muted-foreground">{t("noResults")}</p>}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-b-xl border-t border-border px-2 py-1 text-sm">
          <button type="button" aria-label={t("indexPrevious")} disabled={page === 0}
            onClick={() => setRequestedPage(page - 1)} className={pagerStyle}>
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
          <span className="tabular-nums text-muted-foreground">{t("indexPage", { page: page + 1, total: totalPages })}</span>
          <button type="button" aria-label={t("indexNext")} disabled={page + 1 === totalPages}
            onClick={() => setRequestedPage(page + 1)} className={pagerStyle}>
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  );
}
