"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { parseListState } from "@/src/lib/list-state";
/** Coupled client-side filters stay synchronous while the URL retains their state. */
export function useListState<T extends object>(defaults: T) {
  const search = useSearchParams();
  const pathname = usePathname();
  const raw = search.get("list");
  const baseline = useRef(defaults);
  useEffect(() => { baseline.current = defaults; }, [defaults]);
  const [value, setLocalValue] = useState(() => parseListState(raw, defaults));
  useEffect(() => {
    // Ignore an older transition if another input already updated the URL.
    if (raw !== new URLSearchParams(window.location.search).get("list")) return;
    setLocalValue(parseListState(raw, baseline.current));
  }, [raw]);
  const setValue = useCallback(
    (next: T | ((old: T) => T)) => {
      const query = new URLSearchParams(window.location.search);
      const current = parseListState(query.get("list"), baseline.current);
      const updated = typeof next === "function" ? next(current) : next;
      const serialized = JSON.stringify(updated);
      setLocalValue(updated);
      if (query.get("list") === serialized) return;
      query.set("list", serialized);
      // Next's native History integration updates useSearchParams without fetching RSC.
      window.history.replaceState(null, "", `${pathname}?${query}${window.location.hash}`);
    },
    [pathname],
  );
  return [value, setValue] as const;
}
