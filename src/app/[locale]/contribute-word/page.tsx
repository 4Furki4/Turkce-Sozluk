import React from 'react';

import { HydrateClient } from '@/src/trpc/server';
import UserContributeWordPage from '@/src/_pages/contribute-word/user-contribute-word-page';
import { auth } from '@/src/server/auth/auth';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/src/i18n/routing';

interface ContributeWordPageProps {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ word?: string }>;
}

export default async function ContributeWord({
    params: paramsPromise,
    searchParams: searchParamsPromise
}: ContributeWordPageProps) {
    const { locale } = await paramsPromise;
    const { word } = await searchParamsPromise;
    const session = await auth();
    setRequestLocale(locale)
    if (!session) redirect({
        href: {
            pathname: "/signin",
            query: {
                callbackUrl: `/contribute-word${word ? `?word=${word}` : ""}`,
            }
        },
        locale,
    });
    return (
        <HydrateClient>
            <UserContributeWordPage
                session={session}
                locale={locale as "en" | "tr"}
                prefillWord={word}
            />
        </HydrateClient>
    );
}
