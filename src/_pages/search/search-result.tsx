import React from "react";
import { api, HydrateClient } from "../../trpc/server";
import { auth } from "@/src/lib/auth";
import WordCardWrapper from "@/src/components/customs/word-card-wrapper";
import { headers } from "next/headers";

export default async function SearchResult({ word, locale }: { word: string, locale: "en" | "tr" }) {
  void api.word.getWord.prefetch({ name: word, skipLogging: true })
  const session = await auth.api.getSession({
    headers: await headers()
  });

  return (
    <HydrateClient>
      <WordCardWrapper data={[]} session={session} locale={locale} />
    </HydrateClient>
  )
}
