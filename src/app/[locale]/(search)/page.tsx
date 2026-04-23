import Hero from "@/src/components/hero";
import { api, HydrateClient } from "@/src/trpc/server";
import { setRequestLocale } from "next-intl/server";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  void api.word.getPopularWords.prefetch({ period: "last7Days", limit: 5 });
  void api.word.getWordOfTheDay.prefetch();

  return (
    <HydrateClient>
      <Hero />
    </HydrateClient>
  );
}
