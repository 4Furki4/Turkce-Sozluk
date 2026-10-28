"use client";

import { useTranslations } from "next-intl";

export default function SavedWordLibraryLoading() {
  const t = useTranslations("SavedWords.Library");
  return <section className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-28 pt-6 sm:px-6" data-navigation-shell="/saved-words" aria-busy="true">
    <div role="status"><h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("updating")}</p></div>
    <div aria-hidden className="space-y-6 motion-safe:animate-pulse">
      <div className="flex gap-2"><div className="h-11 w-28 rounded-md bg-background/40" /><div className="h-11 w-36 rounded-md bg-background/40" /></div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]"><div className="h-12 rounded-md border border-border bg-background/40" /><div className="h-12 rounded-md border border-border bg-background/40" /></div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="divide-y divide-border rounded-xl border border-border bg-background/40">{Array.from({ length: 6 }, (_, index) => <div key={index} className="space-y-3 p-5"><div className="h-5 w-24 rounded bg-foreground/10" /><div className="h-4 w-5/6 rounded bg-foreground/5" /><div className="h-3 w-32 rounded bg-foreground/5" /></div>)}</div>
        <div className="hidden h-72 rounded-xl border border-border bg-background/40 lg:block" />
      </div>
    </div>
  </section>;
}
