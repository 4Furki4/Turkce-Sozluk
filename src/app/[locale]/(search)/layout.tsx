import { getTranslations, setRequestLocale } from "next-intl/server";
import { Params } from "next/dist/server/request/params";
import React from "react";
import Hero from "@/src/components/hero";
import { api } from "@/src/trpc/server";
import { HydrateClient } from "@/src/trpc/server";

export default async function SearchLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<Params>
}) {
  const { locale } = await params
  setRequestLocale(locale as string)
  const t = await getTranslations("Home");
  void api.word.getPopularWords.prefetch({ period: "allTime", limit: 10 })
  void api.word.getWordOfTheDay.prefetch()
  return (
    <HydrateClient>
      <div className="w-full">
        <Hero>
          {children}
        </Hero>
      </div>
    </HydrateClient>
  );
}
