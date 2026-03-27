"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  finishNavigationProgress,
  startNavigationProgress,
  useNavigationProgress,
} from "@/src/lib/navigation-progress";

function shouldStartForAnchor(anchor: HTMLAnchorElement) {
  const currentUrl = new URL(window.location.href);
  const nextUrl = new URL(anchor.href, window.location.href);

  if (anchor.hasAttribute("data-skip-navigation-progress")) {
    return false;
  }

  if (anchor.target && anchor.target !== "_self") {
    return false;
  }

  if (anchor.hasAttribute("download")) {
    return false;
  }

  if (nextUrl.origin !== currentUrl.origin) {
    return false;
  }

  if (
    nextUrl.pathname === currentUrl.pathname &&
    nextUrl.search === currentUrl.search
  ) {
    return false;
  }

  return true;
}

export default function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { phase } = useNavigationProgress();
  const previousUrlRef = useRef<string | null>(null);

  const search = searchParams.toString();
  const currentUrl = search ? `${pathname}?${search}` : pathname;
  const isVisible = phase !== "idle";

  useEffect(() => {
    if (previousUrlRef.current === null) {
      previousUrlRef.current = currentUrl;
      return;
    }

    if (previousUrlRef.current !== currentUrl) {
      previousUrlRef.current = currentUrl;
      finishNavigationProgress();
    }
  }, [currentUrl]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (shouldStartForAnchor(anchor)) {
        startNavigationProgress();
      }
    };

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[120] h-0.5 transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="relative h-full w-full overflow-hidden">
        {phase === "loading" ? (
          <div className="navigation-progress-crawl absolute inset-y-0 left-0 w-1/3 bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.65)] motion-reduce:w-full motion-reduce:translate-x-0 motion-reduce:animate-none" />
        ) : (
          <div className="h-full w-full origin-left scale-x-100 bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.65)] transition-transform duration-200 ease-out" />
        )}
      </div>
    </div>
  );
}
