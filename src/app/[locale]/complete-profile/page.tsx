import CompleteProfile from '@/src/_pages/complete-profile/complete-profile'
import { auth } from '@/src/server/auth/auth'
import { RedirectType } from 'next/navigation';
import { redirect } from 'next/navigation';
import React from 'react'

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  if (session?.user.username && session?.user.name) redirect(`/${locale}/profile/${session?.user?.id}`, RedirectType.replace);
  return (
    <CompleteProfile session={session} />
  );
}
