import React from "react";

export default function WordLoadingSkeleton() {
  return (
    <main className="max-w-7xl w-full mx-auto">
      <article
        className="border border-border rounded-sm p-4 w-full bg-background/10 animate-pulse"
        aria-label="Loading word card"
      >
        <header className="w-full flex flex-col items-start">
          <div className="flex w-full items-center gap-4 mb-4">
            <div className="bg-foreground/20 w-10 h-10 rounded-full"></div>
            <div className="bg-foreground/20 w-10 h-10 rounded-full ml-auto"></div>
            <div className="bg-foreground/20 w-10 h-10 rounded-full"></div>
            <div className="bg-foreground/20 w-10 h-10 rounded-full"></div>
          </div>

          <div className="w-full flex items-center justify-between mb-4">
            <div className="w-full flex items-center gap-2">
              <div className="flex items-baseline gap-2">
                <div className="bg-foreground/30 h-8 md:h-10 w-48 md:w-64 rounded-sm"></div>
                <div className="bg-foreground/20 h-4 w-20 rounded-sm"></div>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-2 w-full">
            <div className="flex items-center gap-2">
              <div className="bg-foreground/20 h-4 w-12 rounded-sm"></div>
              <div className="bg-foreground/20 h-4 w-24 rounded-sm"></div>
              <div className="bg-foreground/20 h-4 w-16 rounded-sm"></div>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <div className="bg-primary/30 h-6 w-16 rounded-lg"></div>
            </div>
          </div>
        </header>

        <div className="mt-6">
          <div className="w-full bg-primary/10 border border-primary rounded-sm mb-4 overflow-x-scroll">
            <div className="flex">
              <div className="bg-primary/60 px-6 py-3 rounded-sm flex-1 text-center">
                <div className="bg-foreground/30 h-4 w-16 rounded-sm mx-auto"></div>
              </div>
              <div className="px-6 py-3 flex-1 text-center">
                <div className="bg-foreground/20 h-4 w-20 rounded-sm mx-auto"></div>
              </div>
              <div className="px-6 py-3 flex-1 text-center">
                <div className="bg-foreground/20 h-4 w-20 rounded-sm mx-auto"></div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <div className="flex gap-2 items-center">
                <div className="w-[2px] bg-primary h-5"></div>
                <div className="bg-foreground/20 h-4 w-24 rounded-sm"></div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-2/3">
                  <div className="bg-foreground/20 h-6 w-full rounded-sm mb-2"></div>
                  <div className="bg-foreground/20 h-4 w-3/4 rounded-sm mb-2"></div>

                  <div className="w-full bg-primary/15 p-2 rounded-sm">
                    <div className="bg-foreground/20 h-4 w-full rounded-sm mb-1"></div>
                    <div className="bg-foreground/20 h-3 w-20 rounded-sm"></div>
                  </div>
                </div>

                <div className="md:w-1/3 bg-foreground/20 h-32 rounded-md"></div>
              </div>
            </div>

            <div className="border-t border-border"></div>

            <div className="grid gap-2">
              <div className="flex gap-2 items-center">
                <div className="w-[2px] bg-primary h-5"></div>
                <div className="bg-foreground/20 h-4 w-20 rounded-sm"></div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="bg-foreground/20 h-6 w-full rounded-sm"></div>
                <div className="bg-foreground/20 h-4 w-2/3 rounded-sm"></div>
              </div>
            </div>
          </div>
        </div>

        <footer className="flex justify-between mt-6 pt-4 border-t border-border">
          <div className="bg-primary/30 h-10 w-46 rounded-sm"></div>
        </footer>
      </article>
    </main>
  );
}
