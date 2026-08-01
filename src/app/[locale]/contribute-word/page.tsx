import React from 'react';

import { HydrateClient } from '@/src/trpc/server';
import UserContributeWordPage from '@/src/_pages/contribute-word/user-contribute-word-page';
import { auth } from "@/src/lib/auth";
import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/src/i18n/routing';
import { headers } from 'next/headers';
import { getStaticRouteCanonicalPath } from '@/src/lib/seo-utils';
import type { Metadata } from 'next';

interface ContributeWordPageProps {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ word?: string }>;
}

export const instant = false;

export async function generateMetadata({
    params,
}: Pick<ContributeWordPageProps, "params">): Promise<Metadata> {
    const { locale } = await params;
    const resolvedLocale = locale === "en" ? "en" : "tr";

    return {
        alternates: {
            canonical: getStaticRouteCanonicalPath("/contribute-word", resolvedLocale),
        },
    };
}

export default async function ContributeWord({
    params: paramsPromise,
    searchParams: searchParamsPromise
}: ContributeWordPageProps) {
    const { locale } = await paramsPromise;
    const { word } = await searchParamsPromise;
    const session = await auth.api.getSession({
        headers: await headers()
    });;
    setRequestLocale(locale)
    if (!session) redirect({
        href: {
            pathname: "/signin",
            query: {
                backTo: `/contribute-word${word ? `?word=${word}` : ""}`,
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
