import CreateWord from "@/src/_pages/dashboard/create-word";
import { api, HydrateClient } from "@/src/trpc/server";
import React from "react";

export default async function Page(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  // const meaningAttributesPromise = api.admin.getMeaningAttributes()
  // const authorsPromise = api.admin.getExampleSentenceAuthors()
  // const partOfSpeechesPromise = api.admin.getPartOfSpeeches();
  // const results = await Promise.allSettled([meaningAttributesPromise, authorsPromise, partOfSpeechesPromise])
  // const meaningAttributes = results[0].status === "fulfilled" ? results[0].value : []
  // const authors = results[1].status === "fulfilled" ? results[1].value.map((author) => ({
  //   ...author,
  //   id: author.id.toString(),
  // })) : []
  // const partOfSpeeches = results[2].status === "fulfilled" ? results[2].value : []
  void api.params.getMeaningAttributes.prefetch()
  void api.params.getExampleSentenceAuthors.prefetch()
  void api.params.getPartOfSpeeches.prefetch()
  void api.params.getWordAttributes.prefetch()
  void api.params.getLanguages.prefetch()
  return (
    <HydrateClient>
      <CreateWord locale={locale} />
    </HydrateClient>
  )
}
