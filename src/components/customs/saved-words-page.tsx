"use client";

import React, { useState } from "react";
import SavedWordsToolbar, { AlphabetOrder, DateOrder } from "./saved-words-toolbar";
import SavedWordCard from "./saved-word-card";
import SavedWordCardSkeleton from "./saved-word-card-skeleton";
import { Session } from "@/src/lib/auth";
import { api } from "@/src/trpc/react";
import { CustomPagination } from "./heroui/custom-pagination";

interface SavedWordsPageProps {
  session: Session;
  locale: "en" | "tr";
}

export default function SavedWordsPage({ session, locale }: SavedWordsPageProps) {
  const [sortAlphabet, setSortAlphabet] = useState<AlphabetOrder>("az");
  const [sortDate, setSortDate] = useState<DateOrder>("dateDesc");
  const [pageNumber, setPageNumber] = useState(1);
  const [perPage, setPerPage] = useState(6);
  const [sortBy, setSortBy] = useState<"alphabet" | "date">("date");
  const [search, setSearch] = useState("");
  const utils = api.useUtils();
  const unsaveMutation = api.user.saveWord.useMutation({ onSuccess: () => utils.user.getSavedWords.invalidate() });
  const { data: totalCount } = api.user.getSavedWordCount.useQuery({ search });
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
  };
  const handleDateSort = (sort: DateOrder) => {
    setSortDate(sort);
    setSortBy("date");
  };
  const handleSearch = (search: string) => {
    setSearch(search);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      <div className="flex justify-center px-4 mt-4">
        <CustomPagination
          total={totalCount ? Math.ceil(totalCount / perPage) : 1}
          initialPage={pageNumber}
          onChange={(page) => setPageNumber(page)}
        />
      </div>
    </div>
  );
}
