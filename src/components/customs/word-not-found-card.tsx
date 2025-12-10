"use client";

import React from "react";
import { Card, CardBody, Button, useDisclosure, Tooltip } from "@heroui/react";
import { useTranslations } from "next-intl";
import { Link as NextIntlLink, usePathname, useRouter } from "@/src/i18n/routing";
import { Plus, Search, BookOpen } from "lucide-react";
import SimpleWordRequestModal from "./modals/simple-word-request-modal";

import { useParams } from "next/navigation";

import { useSnapshot } from "valtio";
import { preferencesState } from "@/src/store/preferences";
import { Session } from "@/src/lib/auth-client";

interface WordNotFoundCardProps {
  session: Session | null;
}

export default function WordNotFoundCard({ session }: WordNotFoundCardProps) {
  const { word } = useParams<{ word: string }>();
  const t = useTranslations("WordNotFound");
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const wordName = word ? decodeURIComponent(word) : "Unknown";
  const { isBlurEnabled } = useSnapshot(preferencesState)
  const router = useRouter();
  const pathname = usePathname();

  return (
    <>
      <Card isBlurred={isBlurEnabled} className="border-2 border-dashed border-border bg-background/50 p-0" classNames={{
        base: "p-0",
      }}>
        <CardBody className="text-center space-y-6">
          {/* Main Message */}
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-default-700">
              {t("title")}
            </h2>
            <p className="text-lg text-default-600">
              {t("searchedWord")}: <span className="font-medium text-primary">&ldquo;{wordName}&rdquo;</span>
            </p>
            <p className="text-default-500">
              {t("description")}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            {session ? (
              <Button
                color="primary"
                variant="solid"
                onPress={onOpen}
                startContent={<Plus className="w-4 h-4" />}
                size="lg"
                className="min-w-48"
              >
                {t("requestWord")}
              </Button>
            ) : (
              <Tooltip content={t("signInToRequestWord")}>
                <Button color="primary" variant="solid" size="lg" onPress={() => router.push({
                  pathname: "/signin",
                  query: {
                    callbackUrl: pathname
                  }
                })}>
                  {t("signIn")}
                </Button>
              </Tooltip>
            )}

            <NextIntlLink
              href={{
                pathname: "/contribute-word",
                query: {
                  word: wordName
                }
              }}
            >
              <Button
                color="secondary"
                variant="bordered"
                startContent={<BookOpen className="w-4 h-4" />}
                size="lg"
                className="min-w-48"
              >
                {t("addDetailedEntry")}
              </Button>
            </NextIntlLink>
          </div>

          {/* Help Text */}
          <div className="pt-4 border-t border-default-200">
            <p className="text-sm text-default-400">
              {t("helpText")}
            </p>
          </div>

          {/* Back to Search Link */}
          <div className="text-center">
            <NextIntlLink
              href="/"
              className="text-default-500 hover:text-primary text-sm inline-flex items-center gap-1"
            >
              <Search className="w-3 h-3" />
              {t("backToSearch")}
            </NextIntlLink>
          </div>
        </CardBody>
      </Card>

      {/* Simple Word Request Modal */}
      {session ? (
        <SimpleWordRequestModal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          wordName={wordName}
        />
      ) : null}
    </>
  );
}
