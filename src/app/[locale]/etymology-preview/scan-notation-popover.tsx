"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { Info, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { languages, marks } from "../etimoloji/notation-guide";

export function ScanNotationPopover() {
  const t = useTranslations("EtymologyReader.Guide");
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed end-4 z-40 bottom-[max(1rem,env(safe-area-inset-bottom))] sm:end-6 sm:bottom-6">
      <Popover isOpen={open} onOpenChange={setOpen} placement="top-end" offset={10}>
        <PopoverTrigger>
          <button type="button" aria-label={t("title")}
            className="group relative grid size-11 place-items-center rounded-full border border-border bg-background text-primary shadow-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <Info size={20} aria-hidden="true" />
            {!open && <span aria-hidden="true" className="pointer-events-none absolute end-full me-2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">{t("title")}</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent aria-label={t("title")} className="w-[min(22rem,calc(100vw-2rem))] items-stretch rounded-xl border border-border bg-background p-0">
          <div className="flex items-center justify-between gap-2 border-b border-border py-1.5 ps-4 pe-2">
            <h2 className="text-sm font-semibold">{t("title")}</h2>
            <button type="button" aria-label={t("close")} onClick={() => setOpen(false)}
              className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"><X size={16} aria-hidden="true" /></button>
          </div>
          <div tabIndex={0} aria-label={t("title")} role="region" className="max-h-[min(55dvh,24rem)] overflow-y-auto overscroll-contain px-4 py-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
            <dl className="divide-y divide-border text-sm">
              {marks.map(([key, symbol]) => (
                <div key={key} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2 py-2">
                  <dt className="font-mono font-semibold text-primary">{symbol}</dt>
                  <dd>{t(key)}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-3 border-t border-border pt-3 text-sm font-semibold">{t("languages")}</h3>
            <dl className="mb-2 mt-2 grid grid-cols-2 gap-2 text-sm">
              {languages.map(([key, code]) => (
                <div key={key} className="flex flex-wrap items-baseline gap-x-1.5">
                  <dt className="font-mono text-xs font-semibold text-primary">{code}</dt>
                  <dd>{t(`language.${key}`)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
