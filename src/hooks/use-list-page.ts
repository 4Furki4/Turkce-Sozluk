"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useProgressRouter } from "./use-progress-router";

export function useListPage(totalPages?: number) {
  const search = useSearchParams();
  const pathname = usePathname();
  const router = useProgressRouter();
  const requested = Number(search.get("page") ?? 1);
  const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const setPage = (value: number) => {
    const query = new URLSearchParams(search);
    query.set("page", String(value));
    router.replace(`${pathname}?${query}`, { scroll: false });
  };
  useEffect(() => {
    if (totalPages != null && page > Math.max(totalPages, 1))
      setPage(Math.max(totalPages, 1));
  }, [page, totalPages]);
  return [page, setPage] as const;
}
