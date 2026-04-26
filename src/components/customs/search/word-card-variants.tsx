"use client";

import { Avatar, Button, Chip, Popover, PopoverContent, PopoverTrigger, useDisclosure } from "@heroui/react";
import {
  BookOpen,
  Blocks,
  Camera,
  Eye,
  Link as LinkIcon,
  PenLine,
  Quote,
  Share2,
  Volume2,
  WifiOff,
  WifiSync,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSnapshot } from "valtio";

import { cn } from "@/lib/utils";
import type { WordSearchResult } from "@/types";
import { Link, useRouter } from "@/src/i18n/routing";
import type { Session } from "@/src/lib/auth-client";
import { startNavigationProgress } from "@/src/lib/navigation-progress";
import { api } from "@/src/trpc/react";
import {
  preferencesState,
  setSearchWordCardVariant,
  type SearchWordCardVariant,
} from "@/src/store/preferences";
import { copyPageUrl } from "@/src/utils/clipboard";
import { captureElementScreenshot } from "@/src/utils/screenshot";

import CustomCard from "@/src/components/customs/heroui/custom-card";
import { CustomAudioPlayer } from "@/src/components/customs/custom-audio";
import WordCardRequestModal, {
  type WordCardRequestModalInitialView,
} from "@/src/components/customs/modals/word-card-request-modal";
import { PronunciationCard } from "@/src/components/customs/pronunciation-card";
import SaveWord from "@/src/components/customs/save-word";
import WordNotFoundCard from "@/src/components/customs/word-not-found-card";

const WORD_CARD_VARIANTS: {
  value: SearchWordCardVariant;
  labelKey: "ReadingLayout" | "MagazineLayout";
  icon: LucideIcon;
}[] = [
    { value: "reader", labelKey: "ReadingLayout", icon: BookOpen },
    { value: "magazine", labelKey: "MagazineLayout", icon: Blocks },
  ];

type WordEntryData = WordSearchResult["word_data"] & {
  source?: "online" | "offline";
  updated_at?: string | Date | null;
  pronunciations?: {
    id: number;
    audioUrl: string;
    user?: {
      id?: string | null;
      name?: string | null;
      image?: string | null;
    } | null;
    voteCount?: number;
  }[];
};
type Meaning = WordEntryData["meanings"][number];
type RelatedWord = NonNullable<WordEntryData["relatedWords"]>[number];
type WordCardTranslator = ReturnType<typeof useTranslations>;

type SearchWordCardVariantGroupProps = {
  data?: WordSearchResult[];
  locale: "en" | "tr";
  session: Session | null;
  isWordFetching?: boolean;
  isOnline?: boolean;
  headingLevel?: "h1" | "h2";
};

type SearchWordCardVariantProps = {
  word_data: WordEntryData;
  locale: "en" | "tr";
  session: Session | null;
  variant: SearchWordCardVariant;
  isWordFetching?: boolean;
  isOnline?: boolean;
  headingLevel?: "h1" | "h2";
};

type WordCardVariantBodyProps = SearchWordCardVariantProps & {
  onCapture: () => void;
  onShare: () => void;
  onEditOpen: () => void;
  onPronunciationRequestOpen: () => void;
};

export function SearchWordCardVariantGroup({
  data,
  locale,
  session,
  isOnline,
  isWordFetching,
  headingLevel = "h2",
}: SearchWordCardVariantGroupProps) {
  const { searchWordCardVariant } = useSnapshot(preferencesState);

  if (!data || data.length === 0) {
    return <WordNotFoundCard session={session} />;
  }

  return (
    <div className="grid gap-5">
      <WordCardVariantToggle
        variant={searchWordCardVariant}
        onVariantChange={setSearchWordCardVariant}
      />

      <div className="grid gap-6">
        {data.map((word, index) => {
          const uniqueKey = word.word_data?.word_id || `word-${index}`;
          const resolvedHeadingLevel = headingLevel === "h1" && index > 0 ? "h2" : headingLevel;

          return (
            <SearchWordCardVariant
              key={uniqueKey}
              word_data={word.word_data}
              locale={locale}
              session={session}
              isOnline={isOnline}
              isWordFetching={isWordFetching}
              headingLevel={resolvedHeadingLevel}
              variant={searchWordCardVariant}
            />
          );
        })}
      </div>
    </div>
  );
}

function WordCardVariantToggle({
  variant,
  onVariantChange,
}: {
  variant: SearchWordCardVariant;
  onVariantChange: (variant: SearchWordCardVariant) => void;
}) {
  const t = useTranslations("WordCard");

  return (
    <div className="flex w-full justify-stretch sm:justify-end">
      <div
        role="radiogroup"
        aria-label={t("Layout")}
        className="grid w-full grid-cols-2 rounded-sm border border-border/80 bg-background/90 p-1 shadow-sm shadow-black/5 sm:w-auto"
      >
        {WORD_CARD_VARIANTS.map(({ value, labelKey, icon: Icon }) => {
          const isSelected = variant === value;

          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onVariantChange(value)}
              className={cn(
                "relative inline-flex min-h-7 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-all duration-200 sm:min-w-36",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t(labelKey)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SearchWordCardVariant({
  word_data,
  locale,
  session,
  isWordFetching,
  isOnline,
  headingLevel = "h2",
  variant,
}: SearchWordCardVariantProps) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const t = useTranslations("WordCard");
  const cardRef = useRef<HTMLDivElement>(null);
  const [requestModalInitialView, setRequestModalInitialView] = useState<WordCardRequestModalInitialView>("word");

  const handleCapture = async () => {
    if (!cardRef.current) return;

    await captureElementScreenshot(cardRef.current, {
      processingMessage: t("screenshotProcessing"),
      successMessage: t("screenshotCopied"),
      failureMessage: t("screenshotFailed"),
      clipboardCopyFailureMessage: t("screenshotDownloadFallback"),
      fileName: `${word_data.word_name}.png`,
    });
  };

  const bodyProps: WordCardVariantBodyProps = {
    word_data,
    locale,
    session,
    variant,
    isWordFetching,
    isOnline,
    headingLevel,
    onCapture: handleCapture,
    onShare: () => {
      copyPageUrl({
        successMessage: t("urlCopiedDescription"),
      });
    },
    onEditOpen: () => {
      setRequestModalInitialView("word");
      onOpen();
    },
    onPronunciationRequestOpen: () => {
      setRequestModalInitialView("pronunciation");
      onOpen();
    },
  };

  return (
    <CustomCard
      ref={cardRef}
      as="article"
      aria-label={t("Words")}
      role="article"
      className="overflow-hidden rounded-lg p-0 shadow-sm shadow-black/5"
    >
      <div key={variant} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
        {variant === "magazine" ? (
          <MagazineWordCard {...bodyProps} />
        ) : (
          <ReaderWordCard {...bodyProps} />
        )}
      </div>

      <WordCardRequestModal
        word={{ word_data }}
        session={session}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onClose={onClose}
        initialView={requestModalInitialView}
      />

      <div
        data-screenshot-watermark
        className="w-full border-t border-border/70 px-5 py-3 text-center text-xs text-muted-foreground"
      >
        turkce-sozluk.com
      </div>
    </CustomCard>
  );
}

function ReaderWordCard({
  word_data,
  locale,
  session,
  isOnline,
  isWordFetching,
  headingLevel = "h2",
  onCapture,
  onShare,
  onEditOpen,
}: WordCardVariantBodyProps) {
  const t = useTranslations("WordCard");

  return (
    <div className="bg-background/40">
      <header className="relative border-b border-border/70 bg-muted/15 px-5 py-6 sm:px-8 sm:py-8 sm:pr-52">
        <WordUtilityActions
          word_data={word_data}
          session={session}
          isOnline={isOnline}
          isWordFetching={isWordFetching}
          onCapture={onCapture}
          onShare={onShare}
          className="sm:absolute sm:right-8 sm:top-8"
        />

        <div className="grid gap-4">
          <WordTitleBlock
            word_data={word_data}
            locale={locale}
            headingLevel={headingLevel}
            size="reader"
          />
          <WordMetadata word_data={word_data} locale={locale} />
        </div>
      </header>

      <section className="px-5 py-6 sm:px-8 sm:py-8">
        <SectionHeader icon={BookOpen} title={t("Definitions")} />
        <ReaderMeanings word_data={word_data} locale={locale} />
      </section>

      <ConnectionsSection word_data={word_data} />
      <PronunciationSection word_data={word_data} session={session} />

      <footer className="border-t border-border/70 px-5 py-5 sm:px-8">
        <RequestEditControl session={session} onEditOpen={onEditOpen} />
      </footer>
    </div>
  );
}

function MagazineWordCard({
  word_data,
  locale,
  session,
  isOnline,
  isWordFetching,
  headingLevel = "h2",
  onCapture,
  onShare,
  onEditOpen,
  onPronunciationRequestOpen,
}: WordCardVariantBodyProps) {
  const WordHeading = headingLevel;
  const compactTags = getCompactTags(word_data);
  const rootLanguage = getRootLanguage(word_data, locale);
  const hasRoot = Boolean(word_data.root?.root);
  const [highlightedMeaningId, setHighlightedMeaningId] = useState<number | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const handleMeaningTagClick = (meaningId: number) => {
    document
      .getElementById(getMeaningDomId(word_data.word_id, meaningId))
      ?.scrollIntoView({ behavior: "smooth", block: "center" });

    setHighlightedMeaningId(meaningId);

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedMeaningId(null);
    }, 1800);
  };

  return (
    <div className="bg-background/40">
      <header className="relative border-b border-border/70 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                {word_data.prefix ? (
                  <span className="text-fs--1 text-muted-foreground">
                    <span aria-label="word prefix">{word_data.prefix}</span>
                    <span aria-hidden>- </span>
                  </span>
                ) : null}

                <WordHeading className="break-words text-fs-4 font-semibold leading-none text-foreground hyphens-auto">
                  {word_data.word_name}
                </WordHeading>

                {word_data.suffix ? (
                  <span className="text-fs--1 text-muted-foreground">
                    <span aria-hidden> -</span>
                    <span aria-label="word suffix">{word_data.suffix}</span>
                  </span>
                ) : null}
              </div>

              <CompactPronunciationPopover
                word_data={word_data}
                session={session}
                onPronunciationRequestOpen={onPronunciationRequestOpen}
              />

              {hasRoot ? (
                <CompactBadge tone="root">
                  {word_data.root.root}
                  {rootLanguage ? <span className="ml-1 opacity-80">({rootLanguage})</span> : null}
                </CompactBadge>
              ) : null}

              {compactTags.map((tag) => {
                const meaningId = findMeaningIdForTag(word_data.meanings, tag);

                return (
                  <CompactBadge
                    key={tag}
                    tone={tag === "eskimiş" ? "warning" : "tag"}
                    onClick={meaningId ? () => handleMeaningTagClick(meaningId) : undefined}
                  >
                    {tag}
                  </CompactBadge>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <WordMetadata word_data={word_data} locale={locale} className="min-w-0" hideRoot />
              <DossierStats word_data={word_data} compact />
            </div>
          </div>

          <WordUtilityActions
            word_data={word_data}
            session={session}
            isOnline={isOnline}
            isWordFetching={isWordFetching}
            onCapture={onCapture}
            onShare={onShare}
            compact
            showPronunciation={false}
            className="self-start"
          />
        </div>
      </header>

      <main className="space-y-5 px-5 py-5 sm:px-6">
        <CompactMeanings
          word_data={word_data}
          locale={locale}
          highlightedMeaningId={highlightedMeaningId}
        />
        <CompactConnections word_data={word_data} />
      </main>

      <footer className="flex justify-end border-t border-border/70 px-5 py-3 sm:px-6">
        <RequestEditControl session={session} onEditOpen={onEditOpen} compact />
      </footer>
    </div>
  );
}

function WordTitleBlock({
  word_data,
  locale,
  headingLevel = "h2",
  size,
}: {
  word_data: WordEntryData;
  locale: "en" | "tr";
  headingLevel?: "h1" | "h2";
  size: "reader" | "magazine";
}) {
  const WordHeading = headingLevel;
  const rootLanguage = getRootLanguage(word_data, locale);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-2">
        {word_data.prefix ? (
          <span className="text-fs-0 text-muted-foreground">
            <span aria-label="word prefix">{word_data.prefix}</span>
            <span aria-hidden>- </span>
          </span>
        ) : null}

        <WordHeading
          className={cn(
            "break-words font-semibold text-foreground hyphens-auto",
            size === "reader"
              ? "text-fs-4 leading-tight sm:text-fs-5"
              : "text-fs-3 leading-tight sm:text-fs-4",
          )}
        >
          {word_data.word_name}
        </WordHeading>

        {word_data.suffix ? (
          <span className="text-fs-0 text-muted-foreground">
            <span aria-hidden> -</span>
            <span aria-label="word suffix">{word_data.suffix}</span>
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground",
          size === "magazine" && "mt-2 text-xs",
        )}
      >
        {word_data.phonetic ? (
          <span className="font-mono" aria-label="word phonetic">
            [{word_data.phonetic}]
          </span>
        ) : null}
        {word_data.root?.root ? (
          <span className="font-mono">
            {word_data.root.root}
            {rootLanguage ? <span className="ml-1">({rootLanguage})</span> : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function WordMetadata({
  word_data,
  locale,
  className,
  stacked = false,
  hideRoot = false,
}: {
  word_data: WordEntryData;
  locale: "en" | "tr";
  className?: string;
  stacked?: boolean;
  hideRoot?: boolean;
}) {
  const t = useTranslations("WordCard");
  const rootLanguage = getRootLanguage(word_data, locale);
  const hasRoot = !hideRoot && Boolean(word_data.root?.root);
  const hasViews = Boolean(word_data.view_count && word_data.view_count > 0);
  const hasAttributes = Boolean(word_data.attributes && word_data.attributes.length > 0);
  const updatedAt = formatUpdatedAt(word_data.updated_at, locale);
  const viewCountFreshness = updatedAt
    ? t("ViewCountUpdatedAt", { date: updatedAt })
    : t("ViewCountUpdatedUnknown");

  if (!hasRoot && !hasViews && !hasAttributes) {
    return null;
  }

  return (
    <div
      className={cn(
        stacked ? "grid gap-3" : "flex flex-wrap items-center gap-2",
        className,
      )}
    >
      {hasRoot ? (
        <div className="inline-flex min-h-8 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-1.5 font-mono text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{t("Root")}</span>
          <span>{word_data.root.root}</span>
          {rootLanguage ? <span className="text-muted-foreground/80">({rootLanguage})</span> : null}
        </div>
      ) : null}

      {hasViews ? (
        <div className="group relative inline-flex">
          <button
            type="button"
            className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary outline-none transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-label={viewCountFreshness}
            title={viewCountFreshness}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{formatViewCount(word_data.view_count ?? 0)} {t("views")}</span>
          </button>
          <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-max max-w-56 rounded-md border border-border/70 bg-popover px-3 py-2 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
            {viewCountFreshness}
          </div>
        </div>
      ) : null}

      {hasAttributes ? (
        <div className="flex flex-wrap gap-2">
          {word_data.attributes?.map((attribute) => (
            <Chip
              key={attribute.attribute_id}
              size="sm"
              variant="flat"
              className="rounded-md bg-primary/10 font-mono text-primary"
            >
              {attribute.attribute}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CompactBadge({
  children,
  tone = "default",
  onClick,
}: {
  children: ReactNode;
  tone?: "default" | "root" | "tag" | "warning";
  onClick?: () => void;
}) {
  const className = cn(
    "inline-flex min-h-7 items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
    tone === "default" && "border-border/70 bg-muted/40 text-muted-foreground",
    tone === "root" && "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    tone === "tag" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    tone === "warning" && "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    onClick && "cursor-pointer hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    );
  }

  return (
    <span className={className}>
      {children}
    </span>
  );
}

function CompactPronunciationPopover({
  word_data,
  session,
  onPronunciationRequestOpen,
}: {
  word_data: WordEntryData;
  session: Session | null;
  onPronunciationRequestOpen: () => void;
}) {
  const tWord = useTranslations("WordCard");
  const tPronunciation = useTranslations("Pronunciations");
  const router = useRouter();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { data: pronunciations, isLoading } = api.word.getPronunciationsForWord.useQuery({
    wordId: word_data.word_id,
  });
  const pronunciationItems = pronunciations ?? word_data.pronunciations ?? [];
  const pronunciationCount = pronunciationItems.length;
  const hasPronunciations = pronunciationCount > 0;

  const handleRequestPronunciation = () => {
    setIsPopoverOpen(false);

    if (session) {
      onPronunciationRequestOpen();
      return;
    }

    startNavigationProgress();
    router.push({
      pathname: "/signin",
      query: {
        backTo: window.location.pathname,
      },
    });
  };

  return (
    <Popover showArrow placement="bottom-start" isOpen={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger>
        <button
          type="button"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
          aria-label={hasPronunciations ? tWord("PlayPronunciation") : tWord("RequestPronunciation")}
        >
          {word_data.phonetic ? (
            <span className="font-mono tracking-wide">/{word_data.phonetic}/</span>
          ) : null}
          <Volume2 className={cn("h-4 w-4", hasPronunciations ? "text-primary" : "text-muted-foreground")} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <div className="w-[min(22rem,calc(100vw-2rem))] p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">{tWord("Pronunciations")}</p>
            {pronunciationCount > 0 ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {pronunciationCount}
              </span>
            ) : null}
          </div>

          {isLoading ? (
            <p className="py-3 text-sm text-muted-foreground">
              {tPronunciation("loading") || "Loading pronunciations..."}
            </p>
          ) : pronunciationItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-3">
              <p className="text-sm font-medium text-foreground">{tWord("NoPronunciationsPrompt")}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tWord("AddPronunciationPrompt")}</p>
              <Button
                size="sm"
                color="primary"
                variant="flat"
                className="mt-3 h-8 min-h-8 rounded-md px-3 text-xs font-medium"
                onPress={handleRequestPronunciation}
              >
                {tWord("RequestPronunciation")}
              </Button>
            </div>
          ) : (
            <div className="grid max-h-[24rem] gap-3 overflow-y-auto pr-1">
              {pronunciationItems.map((pronunciation) => {
                const userName = pronunciation.user?.name || "User";
                const profileTarget = pronunciation.user?.id
                  ? {
                    pathname: "/profile/[id]" as const,
                    params: { id: pronunciation.user.id },
                  }
                  : null;
                const owner = (
                  <>
                    <Avatar
                      size="sm"
                      src={pronunciation.user?.image || ""}
                      name={userName}
                      className="h-7 w-7 shrink-0"
                    />
                    <span className="min-w-0 truncate text-xs font-medium text-foreground">{userName}</span>
                  </>
                );

                return (
                  <div key={pronunciation.id} className="rounded-lg border border-border/70 bg-muted/20 p-2">
                    {profileTarget ? (
                      <Link
                        href={profileTarget}
                        prefetch={false}
                        className="mb-2 flex min-w-0 items-center gap-2 hover:text-primary"
                      >
                        {owner}
                      </Link>
                    ) : (
                      <div className="mb-2 flex min-w-0 items-center gap-2">{owner}</div>
                    )}
                    <CustomAudioPlayer src={pronunciation.audioUrl} className="bg-background/70 px-1 py-1" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function WordUtilityActions({
  word_data,
  session,
  isWordFetching,
  isOnline,
  onCapture,
  onShare,
  compact = false,
  showPronunciation = true,
  className,
}: {
  word_data: WordEntryData;
  session: Session | null;
  isWordFetching?: boolean;
  isOnline?: boolean;
  onCapture: () => void;
  onShare: () => void;
  compact?: boolean;
  showPronunciation?: boolean;
  className?: string;
}) {
  const t = useTranslations("WordCard");
  const actionButtonClassName = cn(
    "h-10 min-h-10 w-10 min-w-10 rounded-md bg-transparent p-0 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground",
    compact && "h-9 min-h-9 w-9 min-w-9",
  );
  const iconClassName = compact ? "h-4 w-4" : "h-[18px] w-[18px]";

  return (
    <div
      className={cn(
        "hidden shrink-0 items-center gap-1 sm:flex",
        className,
      )}
    >
      {showPronunciation ? (
        <Button
          className={actionButtonClassName}
          isIconOnly
          isDisabled
          aria-label={t("PlayPronunciation")}
        >
          <Volume2 className={iconClassName} />
        </Button>
      ) : null}

      {isWordFetching ? (
        <span className={cn(actionButtonClassName, "inline-flex items-center justify-center")}>
          <WifiSync className={cn("animate-pulse text-green-500", iconClassName)} aria-label="syncing" />
        </span>
      ) : isOnline === false ? (
        <span className={cn(actionButtonClassName, "inline-flex items-center justify-center")}>
          <WifiOff className={cn("text-amber-500", iconClassName)} aria-label="offline" />
        </span>
      ) : null}

      <SaveWord
        word_data={word_data}
        isSavedWord={!session ? false : undefined}
        className={cn(actionButtonClassName, "z-0 sm:hover:scale-100")}
        iconClassName={iconClassName}
      />

      <Button
        disableRipple
        isIconOnly
        className={actionButtonClassName}
        onPress={onCapture}
        aria-label={t("Screenshot")}
      >
        <Camera className={iconClassName} />
      </Button>

      <Button
        disableRipple
        isIconOnly
        className={actionButtonClassName}
        onPress={onShare}
        aria-label={t("Share")}
      >
        <Share2 className={iconClassName} />
      </Button>
    </div>
  );
}

function ReaderMeanings({ word_data, locale }: { word_data: WordEntryData; locale: "en" | "tr" }) {
  if (!word_data.meanings || word_data.meanings.length === 0) {
    return <NavigationMeaningBlock word_data={word_data} />;
  }

  return (
    <ol className="mt-5 divide-y divide-border/70">
      {word_data.meanings.map((meaning, index) => (
        <li
          key={`${meaning.meaning_id}-${index}`}
          className="py-6 transition-transform duration-200 first:pt-0 hover:translate-x-0.5 motion-reduce:hover:translate-x-0"
        >
          <MeaningContent meaning={meaning} locale={locale} spacious />
        </li>
      ))}
    </ol>
  );
}

function CompactMeanings({
  word_data,
  locale,
  highlightedMeaningId,
}: {
  word_data: WordEntryData;
  locale: "en" | "tr";
  highlightedMeaningId?: number | null;
}) {
  if (!word_data.meanings || word_data.meanings.length === 0) {
    return <NavigationMeaningBlock word_data={word_data} />;
  }

  return (
    <ol className="mt-4 divide-y divide-border/70">
      {word_data.meanings.map((meaning, index) => (
        <li
          id={getMeaningDomId(word_data.word_id, meaning.meaning_id)}
          key={`${meaning.meaning_id}-${index}`}
          className={cn(
            "scroll-mt-28 -mx-3 rounded-md px-3 py-4 transition-colors duration-300 first:pt-0 last:pb-0",
            highlightedMeaningId === meaning.meaning_id && "bg-primary/10 ring-1 ring-primary/30",
          )}
        >
          <MeaningContent meaning={meaning} locale={locale} compact />
        </li>
      ))}
    </ol>
  );
}

function MeaningContent({
  meaning,
  locale,
  compact = false,
  spacious = false,
}: {
  meaning: Meaning;
  locale: "en" | "tr";
  compact?: boolean;
  spacious?: boolean;
}) {
  const meta = getMeaningMeta(meaning);
  const seeAlsoWord = getSeeAlsoWord(meaning.meaning);

  return (
    <div className={cn("min-w-0", spacious ? "space-y-4" : "space-y-3")}>
      {meta ? (
        <p className="font-mono text-xs text-muted-foreground">{meta}</p>
      ) : null}

      <div className={cn("grid gap-4", meaning.imageUrl ? "md:grid-cols-[minmax(0,1fr)_16rem]" : "")}>
        <div className="min-w-0 space-y-3">
          {seeAlsoWord ? (
            <p
              className={cn(
                "flex flex-wrap items-center gap-2 leading-relaxed",
                compact ? "text-fs-0" : "text-fs-1",
              )}
            >
              <span className="text-muted-foreground">{locale === "en" ? "See also" : "Bakınız"}</span>
              <Link
                href={{
                  pathname: "/search/[word]",
                  params: { word: seeAlsoWord },
                }}
                prefetch={false}
                className="text-primary underline decoration-primary underline-offset-4"
              >
                {seeAlsoWord}
              </Link>
            </p>
          ) : (
            <p
              className={cn(
                "break-words text-foreground hyphens-auto",
                compact
                  ? "text-fs-0 leading-relaxed"
                  : "text-fs-1 leading-relaxed",
              )}
            >
              {meaning.meaning}
            </p>
          )}

          {meaning.sentence ? (
            <figure
              className={cn(
                "border-l-2 border-primary/70 bg-primary/5",
                compact ? "px-3 py-2.5" : "px-4 py-3",
              )}
            >
              <Quote className={cn("text-primary", compact ? "mb-1.5 h-3.5 w-3.5" : "mb-2 h-4 w-4")} />
              <blockquote className={cn("italic leading-relaxed text-foreground/90", compact ? "text-sm" : "text-sm")}>
                {meaning.sentence}
              </blockquote>
              {meaning.author ? (
                <figcaption className="mt-2 text-xs text-muted-foreground">-{meaning.author}</figcaption>
              ) : null}
            </figure>
          ) : null}
        </div>

        {meaning.imageUrl ? (
          <div className="overflow-hidden rounded-md border border-border/70 bg-muted/20">
            <Image
              src={meaning.imageUrl}
              alt={meaning.meaning}
              width={360}
              height={240}
              className="aspect-[4/3] h-auto w-full object-cover"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NavigationMeaningBlock({ word_data }: { word_data: WordEntryData }) {
  const t = useTranslations("WordCard");
  const navigationWords = (word_data.relatedWords ?? []).filter(
    (related) => related.relation_type !== "relatedWord" && related.relation_type !== "compoundWord",
  );

  if (navigationWords.length === 0) {
    return (
      <div className="mt-4 border border-border/70 bg-muted/25 p-4 text-muted-foreground">
        {t("NoMeaningsFound")}
      </div>
    );
  }

  return (
    <div className="mt-4 border border-primary/20 bg-primary/5 p-4">
      <p className="text-fs-0 font-medium text-foreground">{t("NavigationWord")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {navigationWords.map((related) => (
          <RelatedWordLink key={related.related_word_id} relatedWord={related} />
        ))}
      </div>
    </div>
  );
}

function CompactConnections({ word_data }: { word_data: WordEntryData }) {
  const t = useTranslations("WordCard");
  const relatedWords = word_data.relatedWords ?? [];
  const relatedPhrases = word_data.relatedPhrases ?? [];

  if (relatedWords.length === 0 && relatedPhrases.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 border-t border-border/70 pt-4">
      {relatedPhrases.length > 0 ? (
        <CompactConnectionBlock icon={BookOpen} title={t("RelatedPhrases")}>
          <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {relatedPhrases.map((relatedPhrase) => (
              <li key={relatedPhrase.related_phrase_id} className="min-w-0">
                <Link
                  href={{
                    pathname: "/search/[word]",
                    params: { word: relatedPhrase.related_phrase },
                  }}
                  prefetch={false}
                  className="inline-flex min-w-0 items-baseline gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <span className="text-border" aria-hidden>
                    -
                  </span>
                  <span className="truncate">{relatedPhrase.related_phrase}</span>
                </Link>
              </li>
            ))}
          </ul>
        </CompactConnectionBlock>
      ) : null}

      {relatedWords.length > 0 ? (
        <CompactConnectionBlock icon={LinkIcon} title={t("RelatedWords")}>
          <div className="flex flex-wrap gap-x-3 gap-y-3">
            {relatedWords.map((relatedWord) => (
              <CompactRelatedWordLink key={relatedWord.related_word_id} relatedWord={relatedWord} />
            ))}
          </div>
        </CompactConnectionBlock>
      ) : null}
    </div>
  );
}

function CompactConnectionBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-foreground/85">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function CompactRelatedWordLink({ relatedWord }: { relatedWord: RelatedWord }) {
  const t = useTranslations("WordCard");
  const relationLabel = getRelationLabel(relatedWord.relation_type, t);

  return (
    <Link
      href={{
        pathname: "/search/[word]",
        params: { word: relatedWord.related_word_name },
      }}
      prefetch={false}
      className="inline-flex min-h-8 items-center rounded-md border border-border/70 bg-muted/35 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
    >
      <span>{relatedWord.related_word_name}</span>
      {relationLabel && relatedWord.relation_type !== "relatedWord" ? (
        <span className="ml-1 text-muted-foreground/80">({relationLabel})</span>
      ) : null}
    </Link>
  );
}

function ConnectionsSection({
  word_data,
  compact = false,
}: {
  word_data: WordEntryData;
  compact?: boolean;
}) {
  const t = useTranslations("WordCard");
  const relatedWords = word_data.relatedWords ?? [];
  const relatedPhrases = word_data.relatedPhrases ?? [];

  if (relatedWords.length === 0 && relatedPhrases.length === 0) {
    return null;
  }

  return (
    <section className={cn(compact ? "" : "border-t border-border/70 px-5 py-6 sm:px-8")}>
      <SectionHeader title={t("Connections")} />

      <div
        className={cn(
          "mt-4 grid gap-5",
          !compact && relatedWords.length > 0 && relatedPhrases.length > 0 ? "lg:grid-cols-2" : "",
        )}
      >
        {relatedWords.length > 0 ? (
          <ConnectionGroup title={t("RelatedWords")}>
            {relatedWords.map((relatedWord) => (
              <RelatedWordLink key={relatedWord.related_word_id} relatedWord={relatedWord} compact={compact} />
            ))}
          </ConnectionGroup>
        ) : null}

        {relatedPhrases.length > 0 ? (
          <ConnectionGroup title={t("RelatedPhrases")}>
            {relatedPhrases.map((relatedPhrase) => (
              <Link
                key={relatedPhrase.related_phrase_id}
                href={{
                  pathname: "/search/[word]",
                  params: { word: relatedPhrase.related_phrase },
                }}
                prefetch={false}
                className={cn(
                  "text-sm text-primary underline decoration-primary/60 underline-offset-4 transition-colors hover:decoration-primary hover:text-primary/80",
                  compact && "text-xs",
                )}
              >
                {relatedPhrase.related_phrase}
              </Link>
            ))}
          </ConnectionGroup>
        ) : null}
      </div>
    </section>
  );
}

function ConnectionGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">{children}</div>
    </div>
  );
}

function RelatedWordLink({
  relatedWord,
  compact = false,
}: {
  relatedWord: RelatedWord;
  compact?: boolean;
}) {
  const t = useTranslations("WordCard");
  const relationLabel = getRelationLabel(relatedWord.relation_type, t);

  return (
    <Link
      href={{
        pathname: "/search/[word]",
        params: { word: relatedWord.related_word_name },
      }}
      prefetch={false}
      className={cn(
        "inline-flex items-baseline text-sm text-primary underline decoration-primary/60 underline-offset-4 transition-colors hover:decoration-primary hover:text-primary/80",
        compact && "text-xs",
      )}
    >
      <span>{relatedWord.related_word_name}</span>
      {relationLabel && relatedWord.relation_type !== "relatedWord" ? (
        <span className="ml-1 text-xs text-muted-foreground">({relationLabel})</span>
      ) : null}
    </Link>
  );
}

function PronunciationSection({
  word_data,
  session,
  compact = false,
}: {
  word_data: WordEntryData;
  session: Session | null;
  compact?: boolean;
}) {
  const t = useTranslations("WordCard");

  return (
    <section className={cn(compact ? "" : "border-t border-border/70 px-5 py-6 sm:px-8")}>
      <SectionHeader icon={Volume2} title={t("Pronunciations")} />
      <div className="mt-4">
        <PronunciationCard wordId={word_data.word_id} session={session} />
      </div>
    </section>
  );
}

function DossierStats({ word_data, compact = false }: { word_data: WordEntryData; compact?: boolean }) {
  const t = useTranslations("WordCard");
  const connectionCount = (word_data.relatedWords?.length ?? 0) + (word_data.relatedPhrases?.length ?? 0);

  if (compact) {
    return (
      <dl className="inline-flex shrink-0 items-center gap-3 rounded-md border border-border/70 bg-background/70 px-2.5 py-1.5 text-xs text-muted-foreground">
        <div className="inline-flex items-baseline gap-1.5">
          <dt>{t("Definitions")}</dt>
          <dd className="font-mono font-semibold text-foreground">{word_data.meanings?.length ?? 0}</dd>
        </div>
        <div className="h-3 w-px bg-border/80" aria-hidden />
        <div className="inline-flex items-baseline gap-1.5">
          <dt>{t("Connections")}</dt>
          <dd className="font-mono font-semibold text-foreground">{connectionCount}</dd>
        </div>
      </dl>
    );
  }

  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-border/70 bg-background/65">
      <div className="border-r border-border/70 p-3">
        <dt className="text-xs text-muted-foreground">{t("Definitions")}</dt>
        <dd className="mt-1 font-mono text-xl font-semibold text-foreground">
          {word_data.meanings?.length ?? 0}
        </dd>
      </div>
      <div className="p-3">
        <dt className="text-xs text-muted-foreground">{t("Connections")}</dt>
        <dd className="mt-1 font-mono text-xl font-semibold text-foreground">{connectionCount}</dd>
      </div>
    </dl>
  );
}

function RequestEditControl({
  session,
  onEditOpen,
  fullWidth = false,
  compact = false,
}: {
  session: Session | null;
  onEditOpen: () => void;
  fullWidth?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("WordCard");
  const router = useRouter();

  if (session) {
    if (compact) {
      return (
        <button
          type="button"
          onClick={onEditOpen}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <PenLine className="h-3.5 w-3.5" />
          {t("RequestEdit")}
        </button>
      );
    }

    return (
      <Button onPress={onEditOpen} color="primary" variant="solid" className={cn(fullWidth && "w-full")}>
        {t("RequestEdit")}
      </Button>
    );
  }

  return (
    <Popover showArrow placement="bottom">
      <PopoverTrigger>
        {compact ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <PenLine className="h-3.5 w-3.5" />
            {t("RequestEdit")}
          </button>
        ) : (
          <Button color="primary" variant="faded" className={cn(fullWidth && "w-full")}>
            {t("RequestEdit")}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent>
        <div className="max-w-64 px-1 py-2">
          <p className="text-sm text-foreground">{t("You can request an edit if you are signed in")}</p>
          <button
            onClick={() => {
              startNavigationProgress();
              router.push({
                pathname: "/signin",
                query: {
                  backTo: window.location.pathname,
                },
              });
            }}
            className="mt-2 cursor-pointer text-sm text-primary underline underline-offset-2"
          >
            {t("SignIn")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SectionHeader({ icon: Icon, title }: { icon?: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2">
      {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
      <h2 className="text-sm font-semibold uppercase text-muted-foreground">{title}</h2>
    </div>
  );
}

function getMeaningMeta(meaning: Meaning) {
  const attributes = meaning.attributes?.map((attribute) => attribute.attribute) ?? [];
  return [meaning.part_of_speech, ...attributes].filter(Boolean).join(", ");
}

function getCompactTags(word_data: WordEntryData) {
  const tags = [
    ...(word_data.attributes?.map((attribute) => attribute.attribute) ?? []),
    ...(word_data.meanings?.flatMap((meaning) => [
      meaning.part_of_speech,
      ...(meaning.attributes?.map((attribute) => attribute.attribute) ?? []),
    ]) ?? []),
  ].filter((tag): tag is string => Boolean(tag));

  return Array.from(new Set(tags)).slice(0, 5);
}

function findMeaningIdForTag(meanings: Meaning[], tag: string) {
  const normalizedTag = tag.trim().toLocaleLowerCase("tr");

  return meanings.find((meaning) => {
    const meaningTags = [
      meaning.part_of_speech,
      ...(meaning.attributes?.map((attribute) => attribute.attribute) ?? []),
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.trim().toLocaleLowerCase("tr"));

    return meaningTags.includes(normalizedTag);
  })?.meaning_id ?? null;
}

function getMeaningDomId(wordId: number, meaningId: number) {
  return `word-${wordId}-meaning-${meaningId}`;
}

function getSeeAlsoWord(meaning: string) {
  const seeAlsoPrefix = "Bakınız:";
  if (!meaning.includes(seeAlsoPrefix)) return null;

  return meaning.split(seeAlsoPrefix)[1]?.trim() || null;
}

function getRootLanguage(word_data: WordEntryData, locale: "en" | "tr") {
  const languageKey = locale === "en" ? "language_en" : "language_tr";
  return word_data.root?.[languageKey];
}

function formatUpdatedAt(value: string | Date | null | undefined, locale: "en" | "tr") {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatViewCount(count: number) {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function getRelationLabel(relationType: string | undefined, t: WordCardTranslator) {
  if (!relationType) return null;

  switch (relationType) {
    case "obsolete":
    case "turkish_equivalent":
    case "see_also":
    case "antonym":
    case "synonym":
    case "correction":
    case "seeAlso":
    case "compoundWord":
    case "turkishEquivalent":
      return t(relationType);
    default:
      return relationType;
  }
}
