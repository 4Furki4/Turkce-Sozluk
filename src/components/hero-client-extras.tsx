"use client";

import { Button, CardBody, CardFooter, CardHeader } from "@heroui/react";
import { ArrowRight, BookOpen, CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import CustomCard from "@/src/components/customs/heroui/custom-card";
import { Link } from "@/src/i18n/routing";
import { useOnlineStatus } from "@/src/hooks/use-online-status";
import { api } from "@/src/trpc/react";
import type { RouterOutputs } from "@/src/trpc/shared";

type MisspellingsData = RouterOutputs["extras"]["getMisspellings"];
type GalatiMeshurData = RouterOutputs["extras"]["getGalatiMeshur"];

const HERO_CLIENT_STALE_TIME = 24 * 60 * 60 * 1000;

export function BentoCommonMistake({
  initialData,
}: {
  initialData?: MisspellingsData;
}) {
  const t = useTranslations("Home");
  const [offset, setOffset] = useState(0);
  const isOnline = useOnlineStatus();
  const { data, isLoading } = api.extras.getMisspellings.useQuery(
    { limit: 1, offset },
    {
      enabled: isOnline,
      initialData: offset === 0 ? initialData : undefined,
      staleTime: HERO_CLIENT_STALE_TIME,
    },
  );

  const handleNext = () => {
    if (data?.total && offset < data.total - 1) {
      setOffset((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (offset > 0) {
      setOffset((prev) => prev - 1);
    }
  };

  const item = data?.data[0];

  return (
    <CustomCard className="h-[200px] dark:bg-background/50 bg-background/50 group relative overflow-hidden flex flex-col justify-center">
      <div className="absolute inset-0 dark:bg-gradient-to-b dark:from-transparent dark:from-10% dark:to-primary/20 bg-gradient-to-b from-transparent to-primary/20 pointer-events-none" />

      <CardHeader className="absolute top-0 left-0 pt-4 px-6 z-50 w-full flex flex-row justify-between items-center">
        <Link
          href="/sik-yapilan-yanlislar"
          className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          <div className="w-2 h-2 rounded-md bg-orange-500 animate-pulse" />
          {t("HomeExtras.misspellingsTitle")}
        </Link>
      </CardHeader>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-4">
        <Button
          isIconOnly
          size="sm"
          variant="light"
          className="text-muted-foreground hover:text-foreground"
          onPress={handlePrev}
          isDisabled={offset === 0}
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          className="text-muted-foreground hover:text-foreground"
          onPress={handleNext}
          isDisabled={!data?.total || offset >= data.total - 1}
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <CardBody className="flex flex-row items-center justify-center gap-8 z-10">
        {isLoading ? (
          <div className="flex items-center gap-8 w-full justify-center">
            <div className="flex flex-col items-center gap-2 w-1/3">
              <div className="w-24 h-8 bg-zinc-800/10 dark:bg-zinc-800/50 rounded animate-pulse" />
            </div>
            <div className="w-px h-12 bg-zinc-800/20" />
            <div className="flex flex-col items-center gap-2 w-1/3">
              <div className="w-24 h-8 bg-zinc-800/10 dark:bg-zinc-800/50 rounded animate-pulse" />
            </div>
          </div>
        ) : item ? (
          <>
            <div className="flex flex-col items-center gap-2 group/wrong opacity-75">
              <span className="text-2xl sm:text-3xl font-serif text-zinc-400 line-through decoration-danger decoration-2 text-center">
                {item.wrong}
              </span>
              <XCircle className="w-5 h-5 text-danger" />
            </div>

            <div className="w-px h-12 bg-zinc-800" />

            <div className="flex flex-col items-center gap-2">
              <span className="text-2xl sm:text-3xl font-serif font-semibold text-foreground text-center">
                {item.correct}
              </span>
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
          </>
        ) : (
          <div className="text-muted-foreground text-sm">
            {t("HomeExtras.noMisspellingsFound")}
          </div>
        )}
      </CardBody>
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
  const isOnline = useOnlineStatus();
  const { data, isLoading } = api.extras.getGalatiMeshur.useQuery(
    { limit: 1, offset },
    {
      enabled: isOnline,
      initialData: offset === 0 ? initialData : undefined,
      staleTime: HERO_CLIENT_STALE_TIME,
    },
  );

  const handleNext = () => {
    if (data?.total && offset < data.total - 1) {
      setOffset((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (offset > 0) {
      setOffset((prev) => prev - 1);
    }
  };

  const item = data?.data[0];
  const explanationPreview = item?.explanation
    ? item.explanation.length > 120
      ? `${item.explanation.slice(0, 120).trimEnd()}...`
      : item.explanation
    : "";

  return (
    <CustomCard className="dark:bg-background/50 bg-background/50 group relative overflow-hidden flex flex-col">
      <div className="absolute top-0 right-0 p-4 opacity-50 transition-opacity">
        <BookOpen className="w-16 h-16 text-amber-500" />
      </div>

      <CardHeader className="pt-4 px-6 z-10 flex flex-row justify-between items-center">
        <Link
          href="/galati-meshur"
          className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest flex items-center gap-2 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
        >
          <BookOpen className="w-3 h-3" />
          {t("HomeExtras.galatiMeshurTitle")}
        </Link>
      </CardHeader>

      <CardBody className="px-6 py-2 z-10 flex-1 flex flex-col justify-center gap-3 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 w-full pr-10">
              <div className="h-6 w-3/4 bg-zinc-800/10 dark:bg-zinc-800/50 rounded animate-pulse" />
            </div>
            <div className="w-full pr-10 space-y-2">
              <div className="h-4 w-full bg-zinc-800/10 dark:bg-zinc-800/50 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-zinc-800/10 dark:bg-zinc-800/50 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-zinc-800/10 dark:bg-zinc-800/50 rounded animate-pulse" />
            </div>
          </div>
        ) : item ? (
          <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 pr-10">
            <p className="text-lg font-serif font-semibold text-foreground line-clamp-1 mb-2">
              {item.word}
            </p>
            <p className="text-[11px] font-mono uppercase tracking-wide text-amber-600 dark:text-amber-500 mb-1">
              {t("HomeExtras.explanation")}
            </p>
            <p className="text-[15px] leading-relaxed text-foreground/85 line-clamp-2">
              {explanationPreview}
            </p>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">
            {t("HomeExtras.noGalatiMeshurFound")}
          </div>
        )}
      </CardBody>

      <CardFooter className="pt-0 pb-3 px-6 z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            isIconOnly
            size="sm"
            variant="light"
            className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400"
            onPress={handlePrev}
            isDisabled={offset === 0}
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400"
            onPress={handleNext}
            isDisabled={!data?.total || offset >= data.total - 1}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <span className="text-[11px] font-mono text-muted-foreground">
          {data?.total ? `${offset + 1}/${data.total}` : "0/0"}
        </span>

        {item ? (
          <Link
            href={{
              pathname: "/galati-meshur/[id]",
              params: {
                id: item.id.toString(),
              },
            }}
            className="text-sm font-medium text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
          >
            {t("HomeExtras.readMore")}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">
            {t("HomeExtras.readMore")}
          </span>
        )}
      </CardFooter>
    </CustomCard>
  );
}
