"use client";

import { BookmarkPlus } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

type PreferredSourceTheme = "light" | "dark";

type PreferredSourceApi = {
  init: (options?: { theme?: PreferredSourceTheme }) => void;
  addPreferredSource: () => void;
  push: (callback: (api: PreferredSourceApi) => void) => void;
};

type PreferredSourceCallback = (api: PreferredSourceApi) => void;

declare global {
    interface Window {
        PREFERRED_SOURCE?: PreferredSourceApi | PreferredSourceCallback[];
    }
}

export default function PreferredSourceButton({ buttonLabel }: { buttonLabel: string }) {
  const preferredSourceApiRef = useRef<PreferredSourceApi | null>(null);
  const [preferredSourceReady, setPreferredSourceReady] = useState(false);
  const { resolvedTheme } = useTheme();
  const theme: PreferredSourceTheme = resolvedTheme === "dark" ? "dark" : "light";

  useEffect(() => {
    let isMounted = true;
    const callback: PreferredSourceCallback = (api) => {
      if (!isMounted) return;

      preferredSourceApiRef.current = api;
      api.init({ theme });
      setPreferredSourceReady(true);
    };
    const preferredSource = window.PREFERRED_SOURCE;

    if (!preferredSource) {
      window.PREFERRED_SOURCE = [callback];
    } else if (Array.isArray(preferredSource)) {
      preferredSource.push(callback);
    } else {
      preferredSource.push(callback);
    }

    return () => {
      isMounted = false;
    };
  }, [theme]);

  return (
    <div className="space-y-2 pt-2">
      {preferredSourceReady ? (
        <button
          type="button"
          onClick={() => preferredSourceApiRef.current?.addPreferredSource()}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-primary/30 bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
        >
          <BookmarkPlus aria-hidden="true" className="size-4" />
          {buttonLabel}
        </button>
      ) : (
        <a
          href="https://www.google.com/preferences/source?q=turkce-sozluk.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-primary/30 bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
        >
          <BookmarkPlus aria-hidden="true" className="size-4" />
          {buttonLabel}
        </a>
      )}
    </div>
  );
}
