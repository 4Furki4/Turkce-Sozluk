"use client";

import { useRouter as useNextRouter } from "next/navigation";

import { startNavigationProgress } from "@/src/lib/navigation-progress";

function shouldStartForStringHref(href: string) {
  if (typeof window === "undefined") {
    return true;
  }

  const currentUrl = new URL(window.location.href);
  const nextUrl = new URL(href, window.location.href);

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

export function useProgressRouter() {
  const router = useNextRouter();

  return {
    ...router,
    push(href: string, options?: Parameters<typeof router.push>[1]) {
      if (shouldStartForStringHref(href)) {
        startNavigationProgress();
      }

      return router.push(href, options);
    },
    replace(href: string, options?: Parameters<typeof router.replace>[1]) {
      if (shouldStartForStringHref(href)) {
        startNavigationProgress();
      }

      return router.replace(href, options);
    },
    back() {
      startNavigationProgress();
      return router.back();
    },
    forward() {
      startNavigationProgress();
      return router.forward();
    },
    refresh() {
      startNavigationProgress();
      return router.refresh();
    },
  };
}
