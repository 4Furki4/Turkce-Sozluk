export const metadata = { robots: { index: false, follow: false } };
import React from 'react';

import { HydrateClient } from '@/src/trpc/server';
import UserContributeWordPage from '@/src/_pages/contribute-word/user-contribute-word-page';
import { auth } from "@/src/lib/auth";
import { setRequestLocale } from 'next-intl/server';
import { redirect, getPathname } from '@/src/i18n/routing';
import { headers } from 'next/headers';

interface ContributeWordPageProps {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ word?: string; mode?: string; returnTo?: string }>;
}

export default async function ContributeWord({
    params: paramsPromise,
    searchParams: searchParamsPromise
}: ContributeWordPageProps) {
    const { locale } = await paramsPromise;
    const query = await searchParamsPromise;
    const { word } = query;
    const session = await auth.api.getSession({
        headers: await headers()
    });;
    setRequestLocale(locale)
    if (!session) redirect({
        href: {
            pathname: "/signin",
            query: {
                backTo: getPathname({ locale: locale as "tr" | "en", href: { pathname: "/contribute-word", query } }),
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
