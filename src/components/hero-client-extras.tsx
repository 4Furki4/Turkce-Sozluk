"use client";

import { Button, CardBody, CardFooter, CardHeader } from "@heroui/react";
import { ArrowRight, BookOpen, CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { forwardRef, useState, type ReactNode } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "framer-motion";

import CustomCard from "@/src/components/customs/heroui/custom-card";
import { Link } from "@/src/i18n/routing";
import { useOnlineStatus } from "@/src/hooks/use-online-status";
import { api } from "@/src/trpc/react";
import type { RouterOutputs } from "@/src/trpc/shared";

type MisspellingsData = RouterOutputs["extras"]["getMisspellings"];
type GalatiMeshurData = RouterOutputs["extras"]["getGalatiMeshur"];

const HERO_CLIENT_STALE_TIME = 24 * 60 * 60 * 1000;

type PageDirection = 1 | -1;

const EntryFrame = forwardRef<HTMLDivElement, { children: ReactNode; direction: PageDirection }>(
  function EntryFrame({ children, direction }, ref) {
    const isPresent = useIsPresent();
    const reducedMotion = useReducedMotion();
    return (
      <motion.div
        ref={ref}
        className="hero-carousel-entry w-full min-w-0"
        aria-hidden={!isPresent || undefined}
        data-carousel-direction={direction === 1 ? "next" : "previous"}
        custom={direction}
        initial="enter"
        animate="visible"
        exit="exit"
        variants={{
          enter: (travel: PageDirection) => ({ opacity: 0, x: reducedMotion ? 0 : travel * 36 }),
          visible: { opacity: 1, x: 0 },
          exit: (travel: PageDirection) => ({
            opacity: 0,
            x: reducedMotion ? 0 : travel * -24,
            transition: { duration: reducedMotion ? 0.1 : 0.18 },
          }),
        }}
        transition={{ duration: reducedMotion ? 0.12 : 0.34, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    );
  },
);

function EntryTransition({ children, entryId, direction }: {
  children: ReactNode;
  entryId: number;
  direction: PageDirection;
}) {
  return (
    <div className="relative w-full min-w-0 overflow-hidden" aria-live="polite" aria-atomic="true">
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <EntryFrame key={entryId} direction={direction}>{children}</EntryFrame>
      </AnimatePresence>
    </div>
  );
}

export function BentoCommonMistake({
  initialData,
}: {
  initialData?: MisspellingsData;
}) {
  const t = useTranslations("Home");
  const [offset, setOffset] = useState(0);
  const [direction, setDirection] = useState<PageDirection>(1);
  const isOnline = useOnlineStatus();
  const utils = api.useUtils();
  const { data, isLoading, isFetching, isPlaceholderData } = api.extras.getMisspellings.useQuery(
    { limit: 1, offset },
    {
      enabled: isOnline,
      initialData: offset === 0 ? initialData : undefined,
      staleTime: HERO_CLIENT_STALE_TIME,
      placeholderData: keepPreviousData,
    },
  );

  const canNavigateTo = (target: number) => {
    if (target < 0 || target >= (data?.total ?? 0) || (isOnline && isPlaceholderData)) return false;
    if (isOnline) return true;
    const cached = utils.extras.getMisspellings.getData({ limit: 1, offset: target })
      ?? (target === 0 ? initialData : undefined);
    return Boolean(cached?.data.length);
  };

  const handleNext = () => {
    if (canNavigateTo(offset + 1)) {
      setDirection(1);
      setOffset(offset + 1);
    }
  };

  const handlePrev = () => {
    if (canNavigateTo(offset - 1)) {
      setDirection(-1);
      setOffset(offset - 1);
    }
  };

  const item = data?.data[0];
  const displayedOffset = isPlaceholderData ? offset - direction : offset;

  return (
    <CustomCard className="min-h-52 min-w-0 bg-background/40 flex flex-col">
      <CardHeader className="px-5 pt-2 pb-0 sm:px-6">
        <Link
          href="/sik-yapilan-yanlislar"
          className="inline-flex min-h-11 min-w-0 items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
        >
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />
          {t("HomeExtras.misspellingsTitle")}
        </Link>
      </CardHeader>

      <CardBody className="flex min-w-0 flex-1 justify-center px-5 py-4 sm:px-6" aria-busy={isFetching}>
        {isLoading ? (
          <div className="grid w-full grid-cols-2 gap-4" aria-hidden>
            <div className="mx-auto h-8 w-full max-w-24 rounded bg-muted motion-safe:animate-pulse" />
            <div className="mx-auto h-8 w-full max-w-24 rounded bg-muted motion-safe:animate-pulse" />
          </div>
        ) : item ? (
          <EntryTransition entryId={item.id} direction={direction}>
            <div className="grid min-w-0 grid-cols-2 divide-x divide-border">
              <div className="flex min-w-0 flex-col items-center gap-2 pr-4">
                <span lang="tr" className="dictionary-prose text-center font-serif text-2xl leading-tight text-muted-foreground line-through decoration-danger/70 decoration-2">
                  {item.wrong}
                </span>
                <XCircle aria-hidden className="h-4 w-4 shrink-0 text-danger" />
              </div>
              <div className="flex min-w-0 flex-col items-center gap-2 pl-4">
                <span lang="tr" className="dictionary-prose text-center font-serif text-2xl font-semibold leading-tight text-foreground">
                  {item.correct}
                </span>
                <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0 text-success" />
              </div>
            </div>
          </EntryTransition>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("HomeExtras.noMisspellingsFound")}
          </p>
        )}
      </CardBody>

      {item && (data?.total ?? 0) > 1 ? (
        <CardFooter className="flex items-center justify-between gap-3 px-3 pb-2 pt-0 sm:px-4">
          <div className="flex items-center">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              aria-label={t("HomeExtras.previous")}
              className="h-11 min-w-11 text-muted-foreground hover:text-foreground"
              onPress={handlePrev}
              isDisabled={!canNavigateTo(offset - 1)}
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              aria-label={t("HomeExtras.next")}
              className="h-11 min-w-11 text-muted-foreground hover:text-foreground"
              onPress={handleNext}
              isDisabled={!canNavigateTo(offset + 1)}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <span className="pr-2 text-xs tabular-nums text-muted-foreground">
            {displayedOffset + 1} / {data?.total}
          </span>
        </CardFooter>
      ) : null}
    </CustomCard>
  );
}

export function BentoGalatiMeshur({
  initialData,
}: {
  initialData?: GalatiMeshurData;
}) {
  const t = useTranslations("Home");
  const [offset, setOffset] = useState(0);
  const [direction, setDirection] = useState<PageDirection>(1);
  const isOnline = useOnlineStatus();
  const utils = api.useUtils();
  const { data, isLoading, isFetching, isPlaceholderData } = api.extras.getGalatiMeshur.useQuery(
    { limit: 1, offset },
    {
      enabled: isOnline,
      initialData: offset === 0 ? initialData : undefined,
      staleTime: HERO_CLIENT_STALE_TIME,
      placeholderData: keepPreviousData,
    },
  );

  const canNavigateTo = (target: number) => {
    if (target < 0 || target >= (data?.total ?? 0) || (isOnline && isPlaceholderData)) return false;
    if (isOnline) return true;
    const cached = utils.extras.getGalatiMeshur.getData({ limit: 1, offset: target })
      ?? (target === 0 ? initialData : undefined);
    return Boolean(cached?.data.length);
  };

  const handleNext = () => {
    if (canNavigateTo(offset + 1)) {
      setDirection(1);
      setOffset(offset + 1);
    }
  };

  const handlePrev = () => {
    if (canNavigateTo(offset - 1)) {
      setDirection(-1);
      setOffset(offset - 1);
    }
  };

  const item = data?.data[0];
  const displayedOffset = isPlaceholderData ? offset - direction : offset;
  const explanationPreview = item?.explanation
    ? item.explanation.length > 120
      ? `${item.explanation.slice(0, 120).trimEnd()}...`
      : item.explanation
    : "";

  return (
    <CustomCard className="min-h-60 min-w-0 bg-background/40 flex flex-col">
      <CardHeader className="px-5 pt-2 pb-0 sm:px-6">
        <Link
          href="/galati-meshur"
          className="inline-flex min-h-11 min-w-0 items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-500 uppercase tracking-wide hover:text-amber-800 dark:hover:text-amber-400 transition-colors"
        >
          <BookOpen aria-hidden className="h-4 w-4 shrink-0" />
          {t("HomeExtras.galatiMeshurTitle")}
        </Link>
      </CardHeader>

      <CardBody className="min-w-0 px-5 py-3 sm:px-6 flex-1 flex flex-col justify-center" aria-busy={isFetching}>
        {isLoading ? (
          <div className="flex flex-col gap-4" aria-hidden>
            <div className="flex w-full items-center gap-2">
              <div className="h-6 w-3/4 rounded bg-muted motion-safe:animate-pulse" />
            </div>
            <div className="w-full space-y-2">
              <div className="h-4 w-full rounded bg-muted motion-safe:animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-muted motion-safe:animate-pulse" />
              <div className="h-4 w-2/3 rounded bg-muted motion-safe:animate-pulse" />
            </div>
          </div>
        ) : item ? (
          <EntryTransition entryId={item.id} direction={direction}>
            <div className="min-w-0 space-y-2">
              <p lang="tr" className="dictionary-prose text-2xl font-serif font-semibold leading-tight text-foreground">
                {item.word}
              </p>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-500">
                {t("HomeExtras.explanation")}
              </p>
              <p lang="tr" className="dictionary-prose text-sm leading-relaxed text-muted-foreground line-clamp-2">
                {explanationPreview}
              </p>
            </div>
          </EntryTransition>
        ) : (
          <div className="text-muted-foreground text-sm">
            {t("HomeExtras.noGalatiMeshurFound")}
          </div>
        )}
      </CardBody>

      {item ? (
        <CardFooter className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 pb-2 pt-0 sm:px-4">
          <div className="flex items-center">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              aria-label={t("HomeExtras.previous")}
              className="h-11 min-w-11 text-muted-foreground hover:text-foreground"
              onPress={handlePrev}
              isDisabled={!canNavigateTo(offset - 1)}
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              aria-label={t("HomeExtras.next")}
              className="h-11 min-w-11 text-muted-foreground hover:text-foreground"
              onPress={handleNext}
              isDisabled={!canNavigateTo(offset + 1)}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <span className="text-xs tabular-nums text-muted-foreground">
            {data?.total ? `${displayedOffset + 1} / ${data.total}` : "0 / 0"}
          </span>

          <Link
            href={{
              pathname: "/galati-meshur/[id]",
              params: { id: item.id.toString() },
            }}
            className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-amber-700 dark:text-amber-500 hover:text-amber-800 dark:hover:text-amber-400 transition-colors"
          >
            {t("HomeExtras.readMore")}
          </Link>
        </CardFooter>
      ) : null}
    </CustomCard>
  );
}
