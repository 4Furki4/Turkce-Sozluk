"use client";

import { useEffect } from "react";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { resolveTaskReturn } from "@/src/lib/task-navigation";

/** Contextual navigation on an existing reading page, without a task shell. */
export function SourceReturn({ entries }: { entries: string }) {
  const search = useSearchParams();
  const t = useTranslations("TaskPage");
  const target = resolveTaskReturn(
    search.get("returnTo"),
    "",
    typeof window === "undefined"
      ? "https://task.invalid"
      : window.location.origin,
  );
  const entry = search.get("entry");
  useEffect(() => {
    if (!entry || !/^\d+$/.test(entry)) return;
    document
      .getElementById(`word-${entry}`)
      ?.scrollIntoView({ block: "start" });
  }, [entry, entries]);
  if (!target) return null;
  return (
    <NextLink
      href={target}
      className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md text-primary focus-visible:outline"
    >
      <ArrowLeft aria-hidden className="h-5 w-5" />
      {t("back", {
        destination: /\/(saved-words|kaydedilen-kelimeler)(?:[?#]|$)/.test(
          target,
        )
          ? t("savedWords")
          : t("source"),
      })}
    </NextLink>
  );
}
