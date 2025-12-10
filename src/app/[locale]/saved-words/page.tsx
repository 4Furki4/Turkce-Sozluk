import { auth } from "@/src/lib/auth";
import { api, HydrateClient } from "@/src/trpc/server";
import { Metadata } from "next";
import { Params } from "next/dist/server/request/params";
import { redirect, RedirectType } from "next/navigation";
import React from "react";
import SavedWordsPage from "@/src/components/customs/saved-words-page";
import { headers } from "next/headers";

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
  const session = await auth.api.getSession({
    headers: await headers()
  });;
  if (!session) redirect("/signin", RedirectType.replace);
  void api.user.getSavedWords.prefetch({});
  return (
    <HydrateClient>
      <SavedWordsPage
        session={session}
        locale={locale as "en" | "tr"}
      />
    </HydrateClient>
  );
}
