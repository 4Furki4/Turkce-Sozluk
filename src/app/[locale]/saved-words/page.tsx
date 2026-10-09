import { api, getServerSession, HydrateClient } from "@/src/trpc/server";
import { Metadata } from "next";
import { Params } from "next/dist/server/request/params";
import { RedirectType } from "next/navigation";
import { redirect } from "@/src/i18n/routing";
import React from "react";
import SavedWordsPage from "@/src/components/customs/saved-words-page";
import { savedWordsInitialInput } from "@/src/lib/saved-words-input";

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params
  return {
    title: locale === "en" ? "Saved Words" : "Kaydedilen Kelimeler",
    description: locale === "en" ? "You can see your saved words here." : "Buradan kaydedilen kelimelerinizi görebilirsiniz."
  }
}

export default async function SavedWords(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;
  const session = await getServerSession();
  if (!session) return redirect({ href: "/signin", locale: locale as "en" | "tr" }, RedirectType.replace);
  await Promise.all([
    api.user.getSavedWords.prefetch(savedWordsInitialInput),
    api.user.getSavedWordCount.prefetch({ search: savedWordsInitialInput.search }),
  ]);
  return (
    <HydrateClient>
      <SavedWordsPage
        session={session}
        locale={locale as "en" | "tr"}
      />
    </HydrateClient>
  );
}
