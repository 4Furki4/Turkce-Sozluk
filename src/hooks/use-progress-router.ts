"use client";

import { useCallback, useMemo } from "react";
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

  const push = useCallback(
    (href: string, options?: Parameters<typeof router.push>[1]) => {
      if (shouldStartForStringHref(href)) {
        startNavigationProgress();
      }

      return router.push(href, options);
    },
    [router],
  );

  const replace = useCallback(
    (href: string, options?: Parameters<typeof router.replace>[1]) => {
      if (shouldStartForStringHref(href)) {
        startNavigationProgress();
      }

      return router.replace(href, options);
    },
    [router],
  );

  const back = useCallback(() => {
    startNavigationProgress();
    return router.back();
  }, [router]);

  const forward = useCallback(() => {
    startNavigationProgress();
    return router.forward();
  }, [router]);

  const refresh = useCallback(() => {
    startNavigationProgress();
    return router.refresh();
  }, [router]);

  return useMemo(
    () => ({
      ...router,
      push,
      replace,
      back,
      forward,
      refresh,
    }),
    [router, push, replace, back, forward, refresh],
  );
}
