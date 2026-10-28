"use client";

import { Button } from "@heroui/react";
import { BookmarkCheck, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/src/lib/utils";
import { getHeadwordProps } from "@/src/lib/headword-presentation";
import type { RouterOutputs } from "@/src/trpc/react";

export type LibraryWord = RouterOutputs["user"]["getSavedWords"][number]["word_data"];
interface SavedWordLibraryRowProps {
  word: LibraryWord;
  locale: "en" | "tr";
  active: boolean;
  selecting: boolean;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onUnsave: () => void;
}

export default function SavedWordLibraryRow({ word, locale, active, selecting, selected, disabled, onSelect, onPreview, onUnsave }: SavedWordLibraryRowProps) {
  const t = useTranslations("SavedWords.Library");
  const date = new Date(word.saved_at);
  const savedAt = Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date) : null;
  return (
    <li className={cn("flex min-w-0 items-start gap-1 border-b border-border last:border-b-0", active && "bg-primary/5", selected && "bg-primary/10")}>
      {selecting && <label className="flex h-14 w-11 shrink-0 cursor-pointer items-center justify-center self-start">
        <input type="checkbox" className="h-5 w-5 accent-primary" aria-label={t("selectWord", { word: word.word_name })}
          checked={selected} disabled={disabled} onChange={onSelect} />
      </label>}
      <button type="button" onClick={onPreview} aria-label={t("previewWord", { word: word.word_name })} aria-pressed={active}
        className={cn("group flex min-w-0 flex-1 items-start gap-2 rounded-md py-4 text-left outline-offset-[-3px] transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none", selecting ? "pl-0 pr-1" : "pl-4 pr-1 sm:pl-5")}>
        <span className="min-w-0 flex-1">
          <span className="dictionary-headword-container block min-w-0">
            <span {...getHeadwordProps(word.word_name)} lang="tr" className="dictionary-headword block text-xl font-semibold leading-tight text-primary [--headword-max:1.25rem]">{word.word_name}</span>
          </span>
          <span lang="tr" className="dictionary-prose mt-1.5 line-clamp-2 block text-sm leading-relaxed text-foreground/85">{word.meaning || t("noMeaning")}</span>
          <span className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            {word.collections?.map((collection) => <span key={collection.id} className="max-w-full rounded bg-primary/10 px-1.5 py-0.5 text-primary [overflow-wrap:anywhere]">{collection.name}</span>)}
            {savedAt && <time dateTime={date.toISOString()}>{t("savedAt", { date: savedAt })}</time>}
          </span>
        </span>
        <ChevronRight aria-hidden size={18} className="mt-1 shrink-0 text-muted-foreground" />
      </button>
      <Button isIconOnly size="sm" variant="light" color="primary" className="mr-1 mt-2 h-11 min-h-11 w-11 min-w-11 shrink-0 sm:mr-2"
        aria-label={t("unsaveWord", { word: word.word_name })} isDisabled={disabled} onPress={onUnsave}>
        <BookmarkCheck aria-hidden size={19} />
      </Button>
    </li>
  );
}
