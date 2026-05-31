"use client";

import { Button, CardBody } from "@heroui/react";
import { Download, SearchX, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

import CustomCard from "@/src/components/customs/heroui/custom-card";
import { Link } from "@/src/i18n/routing";

type OfflineSearchStateCardProps = {
  wordName: string;
  state: "not-downloaded" | "no-match" | "failed";
  error?: string | null;
};

export default function OfflineSearchStateCard({
  wordName,
  state,
  error,
}: OfflineSearchStateCardProps) {
  const t = useTranslations("OfflineSearch");
  const isNotDownloaded = state !== "no-match";
  const Icon = isNotDownloaded ? WifiOff : SearchX;

  return (
    <CustomCard className="border-2 border-dashed border-border bg-background/50">
      <CardBody className="items-center text-center gap-5 py-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            {isNotDownloaded ? t("notDownloadedTitle") : t("noMatchTitle")}
          </h2>
          <p className="text-lg text-default-600">
            {t("searchedWord")}:{" "}
            <span className="font-medium text-primary">&ldquo;{wordName}&rdquo;</span>
          </p>
          <p className="mx-auto max-w-2xl text-default-500">
            {isNotDownloaded
              ? t("notDownloadedDescription")
              : t("noMatchDescription")}
          </p>
          {state === "failed" && error ? (
            <p className="mx-auto max-w-2xl text-sm text-danger">{error}</p>
          ) : null}
        </div>
        <Button
          as={Link}
          href="/offline-dictionary"
          color="primary"
          startContent={<Download className="h-4 w-4" />}
        >
          {t("manageOfflineDictionary")}
        </Button>
      </CardBody>
    </CustomCard>
  );
}
