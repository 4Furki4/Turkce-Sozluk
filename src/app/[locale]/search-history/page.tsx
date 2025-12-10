import { auth } from "@/src/lib/auth";
import { redirect } from 'next/navigation';
import SearchHistory from '@/src/_pages/search-history/search-history';
import { api } from '@/src/trpc/server';
import { HydrateClient } from '@/src/trpc/server';
import { headers } from "next/headers";

export default async function SearchHistoryPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });;

  // Redirect to sign-in if not authenticated
  if (!session?.user) {
    redirect('/signin?backTo=/search-history');
  }

  void api.user.getUserSearchHistory.prefetch({ limit: 50 });
  return (
    <HydrateClient>
      <SearchHistory userId={session.user.id} />
    </HydrateClient>
  );
}
