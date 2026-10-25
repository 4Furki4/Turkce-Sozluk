"use client";

import { Button } from "@heroui/react";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/routing";
import { getHeadwordProps } from "@/src/lib/headword-presentation";
import type { WordSearchResult } from "@/types";
import type { LibraryWord } from "./saved-word-library-row";
import { PronunciationButton } from "./pronunciation-button";

interface SavedWordPreviewProps {
  word: LibraryWord | null;
  details?: WordSearchResult["word_data"];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

export default function SavedWordPreview({ word, details, loading, error, onRetry }: SavedWordPreviewProps) {
  const t = useTranslations("SavedWords.Library");
  if (!word) return <div className="flex min-h-72 flex-col items-center justify-center px-7 py-10 text-center">
    <BookOpen aria-hidden className="mb-4 h-7 w-7 text-primary" />
    <h2 className="text-lg font-semibold">{t("previewTitle")}</h2>
    <p className="mt-2 max-w-64 text-sm leading-relaxed text-muted-foreground">{t("previewHint")}</p>
  </div>;

  return <div className="min-w-0 p-5 sm:p-6">
    <div className="dictionary-headword-container min-w-0">
      <h2 {...getHeadwordProps(word.word_name)} lang="tr" className="dictionary-headword text-3xl font-semibold leading-tight text-primary [--headword-max:1.875rem]">{word.word_name}</h2>
    </div>
    {word.root?.root && <p lang="tr" className="mt-2 text-sm text-muted-foreground [overflow-wrap:anywhere]">{word.root.root}</p>}
    <div className="mt-4"><PronunciationButton wordId={word.word_id} headword={word.word_name} /></div>
    <div className="mt-6" aria-busy={loading}>
      {loading ? <div className="space-y-3 motion-safe:animate-pulse" aria-label={t("updating")} role="status">
        <div className="h-4 rounded bg-foreground/10" /><div className="h-4 w-5/6 rounded bg-foreground/10" /><div className="h-4 w-2/3 rounded bg-foreground/10" />
      </div> : error ? <div role="alert" className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("detailsFailed")}</p>
        <Button className="min-h-11" variant="bordered" onPress={onRetry}>{t("retry")}</Button>
      </div> : details?.meanings?.length ? <ol className="space-y-5">
        {details.meanings.map((meaning, index) => <li key={meaning.meaning_id} className="flex min-w-0 gap-3">
          <span aria-hidden className="min-w-4 shrink-0 pt-0.5 text-sm tabular-nums text-muted-foreground">{index + 1}.</span>
          <div className="min-w-0">
            {meaning.part_of_speech && <p lang="tr" className="mb-1 text-xs text-muted-foreground">{meaning.part_of_speech}</p>}
            <p lang="tr" className="dictionary-prose max-w-[65ch] text-base leading-relaxed">{meaning.meaning}</p>
            {meaning.sentence && <blockquote className="dictionary-prose mt-2 text-sm italic leading-relaxed text-muted-foreground" lang="tr">“{meaning.sentence}”{meaning.author && <cite className="mt-1 block not-italic">{meaning.author}</cite>}</blockquote>}
          </div>
        </li>)}
      </ol> : <p lang="tr" className="dictionary-prose text-base leading-relaxed">{word.meaning || t("noMeaning")}</p>}
    </div>
    <Link href={{ pathname: "/search/[word]", params: { word: word.word_name } }} prefetch={false}
      className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
      {t("fullEntry")}<ArrowUpRight aria-hidden size={16} />
    </Link>
  </div>;
}
