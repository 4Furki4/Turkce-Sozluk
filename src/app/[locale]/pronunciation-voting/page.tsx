import { api } from "@/src/trpc/server";
import { HydrateClient } from "@/src/trpc/server";
import { PronunciationVotingPage } from "@/src/_pages/requests/pronunciation-voting-page";
import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";
import { headers } from "next/headers";

export default async function Pronunciations() {

  const session = await auth.api.getSession({
    headers: await headers()
  });;
  const callbackUrl = "/pronunciation-voting";
  const queryParams = new URLSearchParams();

  queryParams.set("callbackUrl", callbackUrl);
  if (!session) {
    redirect(`/signin?${queryParams.toString()}`);
  }

  void api.request.getVotablePronunciationRequests.prefetch({
    page: 1,
    limit: 10,
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  return (
    <HydrateClient>
      <PronunciationVotingPage />
    </HydrateClient>
  );
}
