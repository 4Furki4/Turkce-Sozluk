import { api, HydrateClient } from '@/src/trpc/server';
import { Metadata } from 'next';
import { auth } from "@/src/lib/auth";
import WordResultClient from './word-result-client';
import { headers } from 'next/headers';
import WordCardWrapper from '@/src/components/customs/word-card-wrapper';
import { buildWordJsonLd, buildWordMetadata } from './word-seo';
import type { WordSearchResult } from '@/types';
import WordDetailShell from './word-detail-shell';
import WordRouteTransitionBoundary from './word-route-transition-boundary';

// This is the updated metadata generation function
export async function generateMetadata({
    params,
}: {
    params: Promise<{ word: string, locale: string }>
}): Promise<Metadata> {
    const { word, locale } = await params;
    const wordName = decodeURIComponent(word);
    const [result] = await api.word.getWord({ name: wordName, skipLogging: true });
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

    const session = await auth.api.getSession({
        headers: await headers()
    });
    const [serverResult] = await api.word.getWord({ name: decodedWordName, skipLogging: true });
    const wordData = serverResult?.word_data as WordSearchResult["word_data"] | undefined;
    const jsonLd = wordData ? buildWordJsonLd(wordData, locale) : null;

    return (
        <WordDetailShell>
            {jsonLd ? (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            ) : null}

            <WordRouteTransitionBoundary>
                {wordData ? (
                    <HydrateClient>
                        <WordCardWrapper
                            data={[{ word_data: wordData }]}
                            locale={locale === "en" ? "en" : "tr"}
                            session={session as any}
                            isOnline={true}
                            headingLevel="h1"
                        />
                    </HydrateClient>
                ) : (
                    <HydrateClient>
                        <WordResultClient session={session} wordName={decodedWordName} />
                    </HydrateClient>
                )}
            </WordRouteTransitionBoundary>
        </WordDetailShell>
    )
}
