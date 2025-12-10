import CompleteProfile from '@/src/_pages/complete-profile/complete-profile'
import { auth } from '@/src/lib/auth';

import { RedirectType } from 'next/navigation';
import { redirect } from 'next/navigation';
import React from 'react'
import { headers } from 'next/headers';
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (session?.user.username && session?.user.name) redirect(`/${locale}/profile/${session?.user?.id}`, RedirectType.replace);
  return (
    <CompleteProfile session={session} />
  );
}
