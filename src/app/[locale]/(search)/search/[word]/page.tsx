import { api } from '@/src/trpc/server';
import { Metadata } from 'next';
import { auth } from "@/src/lib/auth";
import WordResultClient from './word-result-client';
import { headers } from 'next/headers';
import WordCardWrapper from '@/src/components/customs/word-card-wrapper';
import { buildWordJsonLd, buildWordMetadata } from './word-seo';
import type { WordSearchResult } from '@/types';
import WordDetailShell from './word-detail-shell';
import WordLoadingSkeleton from '../_components/word-loading-skeleton';
import { Suspense } from 'react';
import { connection } from 'next/server';

// Prefetch only the reusable route shell. The word-specific result stays behind
// the request-time boundary below and is never shared between word URLs.
export const prefetch = "partial";

const isDynamicServerUsageError = (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    error.digest === "DYNAMIC_SERVER_USAGE";

const safeServerRead = async <T,>(
    label: string,
    read: Promise<T>,
    fallback: T,
): Promise<T> => {
    try {
        return await read;
    } catch (error) {
        if (isDynamicServerUsageError(error)) {
            throw error;
        }

        console.warn(`[SearchResultPage] ${label} unavailable; rendering offline-capable fallback.`);
        return fallback;
    }
};

// This is the updated metadata generation function
export async function generateMetadata({
    params,
}: {
    params: Promise<{ word: string, locale: string }>
}): Promise<Metadata> {
    // Metadata uses the same request-bound word lookup as the page. Keep it out
    // of the prefetched Cache Components shell as well.
    await connection();
    const { word, locale } = await params;
    const wordName = decodeURIComponent(word);
    const [result] = await safeServerRead(
        "metadata word lookup",
        api.word.getWord({ name: wordName, skipLogging: true }),
        [],
    );
    return buildWordMetadata(wordName, locale, result?.word_data as WordSearchResult["word_data"] | undefined);
}

// export async function generateStaticParams() {
//     const data = await db.query.words.findMany({
//         columns: {
//             name: true
//         }
//     })
//     return data.map((word) => ({ word: word.name }))
// }

async function FreshWordResult({
    params,
}: {
    params: Promise<{ locale: string, word: string }>;
}) {
    // Resolve word data only for the navigation that actually requested it,
    // never while producing or reusing the Cache Components route shell.
    await connection();
    const { locale, word } = await params;

    // Properly decode URL parameters with special characters like commas.
    const decodedWordName = decodeURIComponent(word);

    const requestHeaders = await headers();
    const session = await safeServerRead(
        "session",
        auth.api.getSession({
            headers: requestHeaders
        }),
        null,
    );
    const [serverResult] = await safeServerRead(
        "word lookup",
        api.word.getWord({ name: decodedWordName, skipLogging: false }),
        [],
    );
    const wordData = serverResult?.word_data as WordSearchResult["word_data"] | undefined;
    const jsonLd = wordData ? buildWordJsonLd(wordData, locale) : null;
    const resolvedLocale = locale === "en" ? "en" : "tr";

    return (
        <>
            {jsonLd ? (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            ) : null}

            <div className="js-enhanced-word-result">
                {wordData ? (
                    <WordCardWrapper
                        key={decodedWordName}
                        data={[{ word_data: wordData }]}
                        locale={resolvedLocale}
                        session={session as any}
                        isOnline={true}
                        headingLevel="h1"
                    />
                ) : (
                    <WordResultClient key={decodedWordName} session={session} wordName={decodedWordName} />
                )}
            </div>
        </>
    );
}

export default function SearchResultPage({
    params,
}: {
    params: Promise<{ locale: string, word: string }>;
}) {
    return (
        <WordDetailShell>
            <Suspense fallback={<WordLoadingSkeleton />}>
                <FreshWordResult params={params} />
            </Suspense>
        </WordDetailShell>
    );
}
