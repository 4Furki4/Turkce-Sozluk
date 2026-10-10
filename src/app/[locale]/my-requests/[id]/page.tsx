import { Metadata } from "next";
import RequestDetail from "@/src/_pages/requests/request-detail";
import { getLocale, getTranslations } from "next-intl/server";
import { HydrateClient } from "@/src/trpc/server";
import { auth } from "@/src/lib/auth";
import { notFound } from "next/navigation";
import { redirect } from "@/src/i18n/routing";
import { api } from "@/src/trpc/server";
import { headers } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");

  return {
    title: t("requestDetail.title"),
    description: t("requestDetail.description"),
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestId = /^\d+$/.test(id) ? Number(id) : NaN;
  if (!Number.isInteger(requestId) || requestId < 1 || requestId > 2147483647) notFound();

  // Check if user is authenticated
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    redirect({ href: "/signin", locale: await getLocale() });
  }

  // Prefetch request data
  api.request.getUserRequest.prefetch({ requestId });

  return (
    <HydrateClient>
      <RequestDetail requestId={requestId} />
    </HydrateClient>
  );
}
