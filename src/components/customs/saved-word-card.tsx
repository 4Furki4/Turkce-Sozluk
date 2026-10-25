"use client";

import React from "react";
import { Button, CardBody, CardFooter, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";
import { Session } from "@/src/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import CustomCard from "./heroui/custom-card";
import { TaskLink, TaskButton } from "@/src/components/task-pages/task-link";
import { Clock, Eye, Trash2 } from "lucide-react";
import { getHeadwordProps } from "@/src/lib/headword-presentation";
interface SavedWordCardProps {
  wordData: {
    word_id: number;
    word_name: string;
    saved_at: string;
    attributes?: unknown;
    root: { root: string; language: string };
    meaning?: string;
  };
  onUnsave: () => void;
  session: Session | null;
  locale: "en" | "tr";
}

export default function SavedWordCard({ wordData, onUnsave, session, locale }: SavedWordCardProps) {
  const t = useTranslations("SavedWords.Card");
  return (
    <>
      <CustomCard className="group relative overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/10 dark:from-black/20 dark:to-black/40 backdrop-blur-md hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl hover:border-primary/30">
        <CardHeader className="flex flex-col items-start gap-1 pt-6 px-6 pb-2">
          <div className="dictionary-headword-container flex flex-wrap items-baseline gap-2 w-full min-w-0">
            <h3 {...getHeadwordProps(wordData.word_name)} lang="tr" className="dictionary-headword [--headword-max:1.5rem] text-2xl font-bold">
              <TaskLink className="text-primary hover:text-primary transition-colors max-sm:underline decoration-primary hover:decoration-primary" href={{ pathname: '/search/[word]', params: { word: wordData.word_name }, query: { entry: wordData.word_id } }}>
                {wordData.word_name}
              </TaskLink>
            </h3>
            {wordData.root?.root && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                {wordData.root.root}
              </span>
            )}
          </div>
          {wordData.root?.language && (
            <p className="text-xs text-default-400 uppercase tracking-wider font-semibold">
              {wordData.root.language}
            </p>
          )}
        </CardHeader>

        <CardBody className="px-6 py-2">
          <div className="min-h-[3rem]">
            <p lang="tr" className="dictionary-prose text-default-600 text-base line-clamp-2 leading-relaxed">
              {wordData.meaning || <span className="italic text-default-400">{t("noMeaning")}</span>}
            </p>
          </div>
        </CardBody>

        <CardFooter className="px-6 pb-6 pt-2 flex justify-between items-center">
          <p className="text-xs text-default-400 font-medium flex items-center gap-1.5 bg-default-100/50 px-2 py-1 rounded-md">
            <Clock className="w-3.5 h-3.5" />
            {formatDistanceToNow(new Date(wordData.saved_at), {
              addSuffix: true,
              locale: locale === 'tr' ? tr : undefined
            })}
          </p>
          <div className="flex gap-2">
            <TaskButton
              isIconOnly
              aria-label={t("view")}
              size="sm"
              variant="light"
              color="primary"
              href={{ pathname: "/search/[word]", params: { word: wordData.word_name }, query: { entry: wordData.word_id } }}
              className="h-11 min-w-11 bg-primary/10 hover:bg-primary/20"
            >
              <Eye className="w-4 h-4" />
            </TaskButton>
            <Button
              isIconOnly
              aria-label={t("unsave")}
              size="sm"
              variant="light"
              color="danger"
              onPress={onUnsave}
              className="h-11 min-w-11 bg-danger/10 hover:bg-danger/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardFooter>
      </CustomCard>


    </>
  );
}
