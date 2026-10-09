"use client";

import React, { useEffect, useState } from "react";
import SavedWordsToolbar, { AlphabetOrder, DateOrder } from "./saved-words-toolbar";
import SavedWordCard from "./saved-word-card";
import SavedWordCardSkeleton from "./saved-word-card-skeleton";
import { Session } from "@/src/lib/auth";
import { api } from "@/src/trpc/react";
import { CustomPagination } from "./heroui/custom-pagination";
import { savedWordsInitialInput } from "@/src/lib/saved-words-input";
import { useTranslations } from "next-intl";

interface SavedWordsPageProps {
  session: Session;
  locale: "en" | "tr";
}

export default function SavedWordsPage({ session, locale }: SavedWordsPageProps) {
  const t = useTranslations("SavedWords.Table");
  const [sortAlphabet, setSortAlphabet] = useState<AlphabetOrder>(savedWordsInitialInput.sortAlphabet);
  const [sortDate, setSortDate] = useState<DateOrder>(savedWordsInitialInput.sortDate);
  const [pageNumber, setPageNumber] = useState(1);
  const [perPage, setPerPage] = useState<number>(savedWordsInitialInput.take);
  const [sortBy, setSortBy] = useState<"alphabet" | "date">(savedWordsInitialInput.sortBy);
  const [search, setSearch] = useState<string>(savedWordsInitialInput.search);
  const utils = api.useUtils();
  const unsaveMutation = api.user.saveWord.useMutation({ onSuccess: (_, { wordId }) => Promise.all([
    utils.user.getSavedWords.invalidate(),
    utils.user.getSavedWordCount.invalidate(),
    utils.user.getWordSaveStatus.invalidate(wordId),
  ]) });
  const { data: totalCount } = api.user.getSavedWordCount.useQuery({ search });
  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / perPage));
  useEffect(() => {
    if (totalCount !== undefined && pageNumber > totalPages) setPageNumber(totalPages);
  }, [totalCount, totalPages, pageNumber]);
  const { data, isLoading, isFetching } = api.user.getSavedWords.useQuery({
    search,
    sortAlphabet,
    sortDate: sortDate as DateOrder,
    sortBy,
    take: perPage,
    skip: (pageNumber - 1) * perPage,
  });
  const handleAlphabetSort = (sort: AlphabetOrder) => {
    setSortAlphabet(sort);
    setSortBy("alphabet");
    setPageNumber(1);
  };
  const handleDateSort = (sort: DateOrder) => {
    setSortDate(sort);
    setSortBy("date");
    setPageNumber(1);
  };
  const handleSearch = (search: string) => {
    setSearch(search);
    setPageNumber(1);
  };
  return (
    <div className="max-w-7xl w-full mx-auto mt-5 space-y-4 p-4">
      <SavedWordsToolbar
        onSearch={handleSearch}
        onAlphabetSort={handleAlphabetSort}
        onDateSort={handleDateSort}
        perPage={perPage}
        onPerPageChange={(value) => {
          setPerPage(value);
          setPageNumber(1);
        }}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy={isLoading}>
        {isLoading ? (
          Array.from({ length: perPage }).map((_, i) => (
            <SavedWordCardSkeleton key={i} />
          ))
        ) : (
          data?.map((item) => (
            <SavedWordCard
              key={item.word_data.word_id}
              wordData={item.word_data}
              onUnsave={() => unsaveMutation.mutate({ wordId: item.word_data.word_id })}
              session={session}
              locale={locale}
            />
          ))
        )}
      </div>
      {data?.length === 0 && totalCount === 0 ? <p className="rounded-md border border-border bg-background/40 p-6 text-center text-muted-foreground">{t("emptyMessage")}</p> : null}
      <div className="flex justify-center px-4 mt-4">
        <CustomPagination
          total={totalPages}
          initialPage={pageNumber}
          page={pageNumber}
          onChange={(page) => setPageNumber(page)}
        />
      </div>
    </div>
  );
}
