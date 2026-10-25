"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { recordTaskLocation } from "@/src/lib/task-navigation";
import { authClient } from "@/src/lib/auth-client";
export function TaskSourceRestoration() {
  const path = usePathname();
  const search = useSearchParams();
  const session = authClient.useSession();
  useEffect(() => {
    if (session.isPending) return;
    try {
      const previous = sessionStorage.getItem("task-draft:account");
      const account = session.data?.user.id;
      if (previous && previous !== account) {
        for (const key of Object.keys(sessionStorage))
          if (key.startsWith(`task-draft:v1:${previous}:`))
            sessionStorage.removeItem(key);
        sessionStorage.removeItem("task-draft:account");
      }
    } catch {
      /* Drafts remain optional when storage is unavailable. */
    }
  }, [session.data?.user.id, session.isPending]);
  useEffect(() => {
    const source = `${path}${search.size ? `?${search}` : ""}${window.location.hash}`;
    recordTaskLocation(source);
    const trackHash = () =>
      recordTaskLocation(
        window.location.pathname +
          window.location.search +
          window.location.hash,
      );
    window.addEventListener("hashchange", trackHash);
    let saved: { scroll: number; id: string } | null = null;
    try {
      const raw = sessionStorage.getItem(`task-source:${source}`);
      if (raw) saved = JSON.parse(raw);
    } catch {}
    if (!saved)
      return () => window.removeEventListener("hashchange", trackHash);
    let cancelled = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout>;
    const restore = () => {
      if (cancelled) return;
      const target = saved!.id ? document.getElementById(saved!.id) : null;
      if (target || attempt++ > 30) {
        target?.focus({ preventScroll: true });
        window.scrollTo({ top: saved!.scroll, behavior: "instant" });
        try {
          sessionStorage.removeItem(`task-source:${source}`);
        } catch {}
      } else timer = setTimeout(restore, 100);
    };
    timer = setTimeout(restore, 50);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("hashchange", trackHash);
    };
  }, [path, search]);
  return null;
}
