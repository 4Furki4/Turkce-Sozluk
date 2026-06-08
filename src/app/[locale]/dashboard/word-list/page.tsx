import WordList from "@/src/_pages/dashboard/word-list/word-list";
import { api, HydrateClient } from "@/src/trpc/server";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Word List",
  description: "Dashboard word list",
  robots: {
    follow: false,
    index: false,
    googleBot: {
      follow: false,
      index: false,
    },
  },
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function WordListPage(
  props: {
    searchParams: SearchParams;
  }
) {
  const searchParams = await props.searchParams;

  const page = Number(searchParams.page) || 1;
  const perPage = Number(searchParams.per_page) || 10;

  void api.word.getWords.prefetch({
    take: perPage,
    skip: (page - 1) * perPage
  })
  void api.word.getWordCount.prefetch({})
  void api.params.getLanguages.prefetch()
  void api.params.getPartOfSpeeches.prefetch()

  return (
    <HydrateClient>
      <WordList />
    </HydrateClient>
  );
}
