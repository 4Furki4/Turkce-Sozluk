import { api, getServerSession, HydrateClient } from '@/src/trpc/server';
import { Metadata } from 'next';
import WordResultClient from './word-result-client';
import { cache } from "react";
import { scheduleSearchLog } from "@/src/server/search-logging";
import WordCardWrapper from '@/src/components/customs/word-card-wrapper';
import { buildWordJsonLd, buildWordMetadata } from './word-seo';
import type { WordSearchResult } from '@/types';
import WordDetailShell from './word-detail-shell';
import { NoScriptNotice } from '@/src/components/progressive-enhancement/no-script-notice';
import WordPageFallback from './word-page-fallback';

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

const getWord = cache((name: string) => api.word.getWord({ name, skipLogging: true }));

// This is the updated metadata generation function
export async function generateMetadata({
    params,
}: {
    params: Promise<{ word: string, locale: string }>
}): Promise<Metadata> {
    const { word, locale } = await params;
    const wordName = decodeURIComponent(word);
    const [result] = await safeServerRead(
        "metadata word lookup",
        getWord(wordName),
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

export default async function SearchResultPage(
    props: {
        params: Promise<{ locale: string, word: string }>

    }
) {
    const params = await props.params;

    const { locale } = params;

    // Properly decode URL parameters with special characters like commas
    const decodedWordName = decodeURIComponent(params.word);

    const [session, results] = await Promise.all([
        safeServerRead("session", getServerSession(), null),
        safeServerRead("word lookup", getWord(decodedWordName), []),
    ]);
    const wordData = results[0]?.word_data as WordSearchResult["word_data"] | undefined;
    if (wordData?.word_id) {
        scheduleSearchLog({ wordId: wordData.word_id, userId: session?.user?.id ?? null });
    }
    const jsonLd = wordData ? buildWordJsonLd(wordData, locale) : null;
    const resolvedLocale = locale === "en" ? "en" : "tr";

    return (
        <WordDetailShell>
            {jsonLd ? (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            ) : null}

            <WordPageFallback
                locale={resolvedLocale}
                wordName={decodedWordName}
                wordData={wordData}
            />
            <div className="js-enhanced-word-result">
                {wordData ? (
                    <HydrateClient>
                        <WordCardWrapper
                            data={[{ word_data: wordData }]}
                            locale={resolvedLocale}
                            session={session as any}
                            isOnline={true}
                            headingLevel="h1"
                        />
                    </HydrateClient>
                ) : (
                    <HydrateClient>
                        <NoScriptNotice>
                            {locale === "en"
                                ? `No server-rendered dictionary entry was found for "${decodedWordName}". Offline and pattern search require JavaScript.`
                                : `"${decodedWordName}" için sunucuda oluşturulmuş sözlük kaydı bulunamadı. Çevrim dışı arama ve desen arama JavaScript gerektirir.`}
                        </NoScriptNotice>
                        <WordResultClient session={session} wordName={decodedWordName} />
                    </HydrateClient>
                )}
            </div>
        </WordDetailShell>
    )
}
