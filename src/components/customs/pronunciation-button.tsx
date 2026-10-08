"use client";

import { Button } from "@heroui/react";
import { LoaderCircle, Square, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { api } from "@/src/trpc/react";
import { usePronunciationAudio } from "@/src/hooks/use-pronunciation-audio";

export function PronunciationButton({ wordId, headword, offline = false, onCorrect }: {
  wordId: number; headword: string; offline?: boolean; onCorrect?: () => void;
}) {
  const t = useTranslations("SavedPronunciation");
  const statusId = useId();
  const query = api.pronunciation.getSaved.useQuery({ wordId, headword }, { enabled: !offline, staleTime: 60_000 });
  const { state, toggle } = usePronunciationAudio(offline ? undefined : query.data?.audioUrl, `${wordId}:${headword}`);
  const busy = !offline && (query.isLoading || state === "loading");
  const label = busy ? t("loading") : state === "playing" ? t("stop", { word: headword }) : t("play", { word: headword });
  const status = offline ? t("offline") : query.isError || state === "error" ? t("error") : busy ? t("loading") :
    !query.data ? t("missing") : query.data.source === "ai" ? t("ai") : t("reviewed");

  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 align-middle">
      <Button isIconOnly variant="light" color="primary" className="h-11 min-h-11 w-11 min-w-11 rounded-md bg-background/40"
        aria-label={label} aria-describedby={statusId} aria-pressed={state === "playing"} aria-busy={busy}
        isDisabled={offline || busy || (!query.data && !query.isError)}
        onPress={() => query.isError ? void query.refetch() : toggle()}>
        {busy ? <LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden /> :
          state === "playing" ? <Square className="h-4 w-4" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}
      </Button>
      <span id={statusId} role="status" className="max-w-48 text-xs font-normal leading-snug text-muted-foreground">{status}</span>
      {onCorrect && <button type="button" onClick={onCorrect} className="min-h-11 rounded-md px-1 text-xs text-primary underline underline-offset-2 focus-visible:outline focus-visible:outline-2">{t("correct")}</button>}
    </span>
  );
}
