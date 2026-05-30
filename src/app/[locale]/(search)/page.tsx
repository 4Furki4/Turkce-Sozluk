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
  void api.extras.getMisspellings.prefetch({ limit: 1, offset: 0 });
  void api.extras.getGalatiMeshur.prefetch({ limit: 1, offset: 0 });

  const [
    initialPopularWords,
    initialWordOfTheDay,
    initialMisspellings,
    initialGalatiMeshur,
  ] = await Promise.all([
    api.word.getPopularWords({ period: "last7Days", limit: 5 }),
    api.word.getWordOfTheDay(),
    api.extras.getMisspellings({ limit: 1, offset: 0 }),
    api.extras.getGalatiMeshur({ limit: 1, offset: 0 }),
  ]);

  return (
    <HydrateClient>
      <Hero
        initialPopularWords={initialPopularWords}
        initialWordOfTheDay={initialWordOfTheDay}
        initialMisspellings={initialMisspellings}
        initialGalatiMeshur={initialGalatiMeshur}
      />
    </HydrateClient>
  );
}
