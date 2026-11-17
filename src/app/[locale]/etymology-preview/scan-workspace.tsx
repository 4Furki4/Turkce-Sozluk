"use client";

import { useRef, useState } from "react";
import { ChevronDown, Minus, Plus, ScanLine, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ScanData } from "./scan-page";
import type { ScanEntry } from "./scan-entries";

type Box = ScanData["bodyLines"][number]["box"];

function entryBoxes(entry: ScanEntry, page: number): Box[] {
  return (["left", "right"] as const).flatMap((column) => {
    const boxes = entry.lines.filter((line) => line.page === page && line.column === column).map((line) => line.box);
    if (!boxes.length) return [];
    const box: Box = [
      Math.min(...boxes.map(([left]) => left)),
      Math.min(...boxes.map(([, top]) => top)),
      Math.max(...boxes.map(([, , right]) => right)),
      Math.max(...boxes.map(([, , , bottom]) => bottom)),
    ];
    return [box];
  });
}

export function ScanWorkspace({ data, entries, path, imageUrl, initialEntryId }: {
  data: Pick<ScanData, "printedPage" | "imageWidth" | "imageHeight"> & { lineCount: number };
  entries: ScanEntry[];
  path: string;
  imageUrl: string;
  initialEntryId?: string;
}) {
  const t = useTranslations("EtymologyScan");
  const page = data.printedPage;
  const [zoom, setZoom] = useState(100);
  const [filter, setFilter] = useState<"all" | "flagged">("all");
  const [selected, setSelected] = useState<string | undefined>(
    entries.find((entry) => entry.id === initialEntryId)?.id ?? entries[0]?.id,
  );
  const [focusedBox, setFocusedBox] = useState<Box>();
  const viewport = useRef<HTMLDivElement>(null);
  const scan = useRef<HTMLDivElement>(null);
  const flagged = entries.filter((entry) => entry.lines.some((line) => line.reviewStatus === "needs_review"));
  const visibleEntries = filter === "flagged" ? flagged : entries;
  const current = visibleEntries.find((entry) => entry.id === selected);
  const boxes = current ? (focusedBox ? [focusedBox] : entryBoxes(current, page)) : [];

  function showBox(box: Box | undefined) {
    const panel = viewport.current;
    const sheet = scan.current;
    if (!panel || !sheet || !box) return;
    const [left, top, right] = box;
    panel.scrollTo({
      left: ((left + right) / (2 * data.imageWidth)) * sheet.offsetWidth - panel.clientWidth / 2,
      top: (top / data.imageHeight) * sheet.offsetHeight - panel.clientHeight / 5,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  function select(entry: ScanEntry) {
    setFocusedBox(undefined);
    setSelected(entry.id === selected ? undefined : entry.id);
    if (entry.id !== selected) showBox(entryBoxes(entry, page)[0]);
  }

  const control = "grid size-9 place-items-center rounded-md border border-foreground/15 hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-35";
  return (
    <div className="grid min-w-0 overflow-hidden rounded-xl border border-foreground/15 bg-background/40 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
      <section className="min-w-0 border-b border-foreground/10 lg:border-b-0 lg:border-r" aria-labelledby="scan-source-title">
        <header className="flex min-h-14 items-center justify-between gap-2 border-b border-foreground/10 px-3 py-2 sm:px-4">
          <h2 id="scan-source-title" className="flex items-center gap-2 text-sm font-semibold">
            <ScanLine size={16} aria-hidden="true" />{t("scan")}
          </h2>
          <div className="flex items-center gap-1.5">
            <button type="button" disabled={zoom <= 100} onClick={() => setZoom(zoom - 25)} className={control} aria-label={t("zoomOut")}><Minus size={16} /></button>
            <button type="button" onClick={() => setZoom(100)} className="min-w-12 rounded-md px-1.5 py-1.5 text-xs tabular-nums hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-primary" aria-label={t("resetZoom")}>{zoom}%</button>
            <button type="button" disabled={zoom >= 200} onClick={() => setZoom(zoom + 25)} className={control} aria-label={t("zoomIn")}><Plus size={16} /></button>
          </div>
        </header>
        <div ref={viewport} className="h-[49svh] overflow-auto bg-foreground/5 lg:h-[max(30rem,66svh)]">
          <div ref={scan} className="relative" style={{ width: `${zoom}%` }}>
            {/* The local scan arrives as an in-memory data URL. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} width={data.imageWidth} height={data.imageHeight}
              alt={t("imageAlt", { page: data.printedPage })} className="block h-auto w-full max-w-none" />
            {boxes.map(([x1, y1, x2, y2], index) => (
              <div key={index} aria-hidden="true" className="pointer-events-none absolute rounded-[2px] border-2 border-red-700 bg-red-500/10 transition-[left,top,width,height] duration-150 motion-reduce:transition-none"
                style={{
                  left: `${x1 / data.imageWidth * 100}%`, top: `${y1 / data.imageHeight * 100}%`,
                  width: `${(x2 - x1) / data.imageWidth * 100}%`, height: `${(y2 - y1) / data.imageHeight * 100}%`,
                }} />
            ))}
          </div>
        </div>
      </section>
      <section className="min-w-0" aria-labelledby="scan-ocr-title">
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-foreground/10 px-3 py-2 sm:px-4">
          <div>
            <h2 id="scan-ocr-title" className="text-sm font-semibold">{t("articles")}</h2>
            <p className="mt-0.5 text-xs text-foreground/65">{t("articleCount", { count: entries.length })}</p>
          </div>
          <div role="group" aria-label={t("filter")} className="flex flex-wrap gap-1 rounded-lg border border-foreground/15 p-0.5 text-xs">
            {(["all", "flagged"] as const).map((option) => (
              <button type="button" key={option} aria-pressed={filter === option}
                className={`min-h-8 rounded-md px-2.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${filter === option ? "bg-foreground/10 text-foreground" : "text-foreground/65 hover:bg-foreground/5"}`}
                onClick={() => { setFilter(option); setFocusedBox(undefined); }}>
                {option === "all" ? t("all") : t("flagged", { count: flagged.length })}
              </button>
            ))}
          </div>
        </header>
        <div className="lg:h-[max(30rem,66svh)] lg:overflow-y-auto">
          {visibleEntries.length === 0 && (
            <p className="px-4 py-6 text-sm text-foreground/65">
              {t(entries.length ? "noFlagged" : data.lineCount ? "pendingEntries" : "blankPage")}
            </p>
          )}
          <ul className="divide-y divide-foreground/10">
            {visibleEntries.map((entry) => {
              const active = current?.id === entry.id;
              const pages = [...new Set(entry.lines.map((line) => line.page))];
              const first = pages[0];
              const last = pages[pages.length - 1];
              const needsReview = flagged.includes(entry);
              const reviewLines = entry.lines.filter((line) => line.reviewStatus === "needs_review");
              return (
                <li key={entry.id} id={`entry-${entry.id}`} className={active ? "bg-primary/[0.045]" : undefined}>
                  <h3>
                    <button type="button" aria-expanded={active} onClick={() => select(entry)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-foreground/[0.04] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-5">
                      <span className="min-w-0 flex-1">
                        <strong className="block wrap-anywhere text-base font-semibold">{entry.headword}</strong>
                        <span className="mt-0.5 block text-xs text-foreground/65">
                          {first === last ? t("printedPage", { page: first }) : t("entrySpan", { first, last })}
                        </span>
                      </span>
                      {needsReview && <TriangleAlert aria-label={t("flag")} size={15} className="shrink-0 text-primary" />}
                      <ChevronDown aria-hidden="true" size={18} className={`shrink-0 text-foreground/60 transition-transform motion-reduce:transition-none ${active ? "rotate-180" : ""}`} />
                    </button>
                  </h3>
                  {active && (
                    <div className="space-y-3 px-4 pb-5 sm:px-5">
                      <div className="space-y-3 font-serif text-[1.03rem] leading-7">
                        {entry.paragraphs.map((paragraph, index) => <p key={index} className="wrap-anywhere">{paragraph}</p>)}
                      </div>
                      {entry.continuesBeyondBatch && <p className="border-l-2 border-primary/45 pl-3 text-sm text-foreground/70">{t("continues")}</p>}
                      {pages.length > 1 && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {pages.filter((number) => number !== page).map((number) => (
                            <a key={number} href={`${path}?scan=${number}&entry=${entry.id}#entry-${entry.id}`}
                              className="rounded-md border border-foreground/15 px-2.5 py-1.5 text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary">
                              {t("openScan", { page: number })}
                            </a>
                          ))}
                        </div>
                      )}
                      <details className="rounded-md border border-foreground/15">
                        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-foreground/75 focus-visible:outline-2 focus-visible:outline-primary">
                          {t("ocrDetails", { count: reviewLines.length })}
                        </summary>
                        <ol className="divide-y divide-foreground/10 border-t border-foreground/10 text-sm">
                          {entry.lines.map((line) => (
                            <li key={`${line.page}:${line.baseLineIndex}`} className="space-y-1.5 px-3 py-2">
                              {line.page === page ? (
                                <button type="button" className="text-start text-xs text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-primary"
                                  onClick={() => { setFocusedBox(line.box); showBox(line.box); }}>
                                  {t("showLine", { page: line.page, line: line.baseLineIndex + 1 })}
                                </button>
                              ) : (
                                <span className="text-xs text-foreground/65">{t("sourceLine", { page: line.page, line: line.baseLineIndex + 1 })}</span>
                              )}
                              <p className="wrap-anywhere">{line.baseText}</p>
                              {line.alternatives.flatMap((alternative) => alternative.candidates).map(({ text }, index) => (
                                <p className="wrap-anywhere" key={index}><strong className="mr-2 text-xs text-foreground/70">PaddleOCR</strong>{text}</p>
                              ))}
                              {line.qwenSuggestions.map(({ text, reviewReasons }, index) => (
                                <div key={index} className="border-l-2 border-primary/45 pl-3">
                                  <strong className="text-xs text-primary">{t("qwen")}</strong>
                                  <p className="wrap-anywhere">{text}</p>
                                  {reviewReasons.includes("check_greek_marks") && <p className="mt-1 text-xs text-foreground/65">{t("greekMarks")}</p>}
                                </div>
                              ))}
                            </li>
                          ))}
                        </ol>
                      </details>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
