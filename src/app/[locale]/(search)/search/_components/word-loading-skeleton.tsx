import React from "react";

import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={cn("rounded-md bg-foreground/10", className)}
    />
  );
}

export default function WordLoadingSkeleton() {
  return (
    <main className="mx-auto w-full max-w-7xl" aria-label="Loading word card" role="status">
      <div className="grid gap-5 animate-pulse">
        <div className="flex w-full justify-stretch sm:justify-end">
          <div className="grid w-full grid-cols-2 rounded-md border border-border/80 bg-background/90 p-1 shadow-sm shadow-black/5 sm:w-auto">
            <div className="inline-flex min-h-7 items-center justify-center gap-2 rounded-sm bg-primary/30 px-3 sm:min-w-36">
              <SkeletonBlock className="h-4 w-4 bg-primary/35" />
              <SkeletonBlock className="h-4 w-16 bg-primary/35" />
            </div>
            <div className="inline-flex min-h-7 items-center justify-center gap-2 rounded-sm px-3 sm:min-w-36">
              <SkeletonBlock className="h-4 w-4" />
              <SkeletonBlock className="h-4 w-20" />
            </div>
          </div>
        </div>

        <article className="w-full overflow-hidden rounded-md border border-border bg-background/40 shadow-sm shadow-black/5">
          <header className="border-b border-border/70 px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <SkeletonBlock className="h-12 w-52 sm:h-14 sm:w-80" />
                  <SkeletonBlock className="h-9 w-24" />
                  <SkeletonBlock className="h-7 w-20 bg-sky-500/10" />
                  <SkeletonBlock className="h-7 w-16 bg-emerald-500/10" />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <SkeletonBlock className="h-8 w-28 bg-primary/10" />
                  <div className="inline-flex h-8 items-center gap-3 rounded-md border border-border/70 bg-background/70 px-2.5">
                    <SkeletonBlock className="h-3 w-16" />
                    <div className="h-3 w-px bg-border/80" aria-hidden />
                    <SkeletonBlock className="h-3 w-20" />
                  </div>
                </div>
              </div>

              <div className="hidden shrink-0 items-center gap-1 sm:flex">
                <SkeletonBlock className="h-9 w-9" />
                <SkeletonBlock className="h-9 w-9" />
                <SkeletonBlock className="h-9 w-9" />
              </div>
            </div>
          </header>

          <main className="space-y-5 px-5 py-5 sm:px-6">
            <ol className="mt-1 divide-y divide-border/70">
              <li className="py-4 first:pt-0">
                <div className="space-y-3">
                  <SkeletonBlock className="h-3 w-28" />
                  <SkeletonBlock className="h-6 w-full max-w-3xl" />
                  <SkeletonBlock className="h-5 w-2/3 max-w-2xl" />
                  <div className="border-l-2 border-primary/30 bg-primary/5 px-3 py-3">
                    <SkeletonBlock className="mb-2 h-4 w-4 bg-primary/20" />
                    <SkeletonBlock className="mb-2 h-4 w-full max-w-4xl" />
                    <SkeletonBlock className="h-3 w-32" />
                  </div>
                </div>
              </li>

              <li className="py-4 last:pb-0">
                <div className="space-y-3">
                  <SkeletonBlock className="h-3 w-20" />
                  <SkeletonBlock className="h-6 w-5/6 max-w-3xl" />
                  <SkeletonBlock className="h-4 w-1/2 max-w-xl" />
                </div>
              </li>
            </ol>

            <div className="space-y-4 border-t border-border/70 pt-4">
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <SkeletonBlock className="h-4 w-4 bg-primary/20" />
                  <SkeletonBlock className="h-4 w-44" />
                </div>
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  <SkeletonBlock className="h-4 w-48" />
                  <SkeletonBlock className="h-4 w-56" />
                  <SkeletonBlock className="h-4 w-40" />
                  <SkeletonBlock className="h-4 w-52" />
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2">
                  <SkeletonBlock className="h-4 w-4 bg-primary/20" />
                  <SkeletonBlock className="h-4 w-28" />
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-3">
                  <SkeletonBlock className="h-8 w-20" />
                  <SkeletonBlock className="h-8 w-24" />
                  <SkeletonBlock className="h-8 w-28" />
                  <SkeletonBlock className="h-8 w-16" />
                </div>
              </section>
            </div>
          </main>

          <footer className="flex justify-end border-t border-border/70 px-5 py-3 sm:px-6">
            <SkeletonBlock className="h-4 w-32" />
          </footer>

          <div className="w-full border-t border-border/70 px-5 py-3">
            <SkeletonBlock className="mx-auto h-3 w-28" />
          </div>
        </article>
      </div>
    </main>
  );
}
