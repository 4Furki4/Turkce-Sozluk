"use client";

import { useTranslations } from "next-intl";

export default function NavigationLoading({ route }: { route: "/word-list" | "/saved-words" }) {
  const t = useTranslations();
  const savedWords = route === "/saved-words";

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4 p-4" data-navigation-shell={route} aria-busy="true">
      <div role="status" aria-live="polite">
        <h1 className="text-xl font-semibold">{t(savedWords ? "Navbar.SavedWords" : "Navbar.Word List")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("Navigation.loading")}</p>
      </div>
      <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
        <div className="h-12 rounded-md border border-border bg-background/40" />
        <div className={savedWords ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
          {Array.from({ length: savedWords ? 6 : 10 }, (_, index) => (
            <div key={index} className={`${savedWords ? "h-48" : "h-12"} rounded-md border border-border bg-background/40`} />
          ))}
        </div>
      </div>
    </section>
  );
}
