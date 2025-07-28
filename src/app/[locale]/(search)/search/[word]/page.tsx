import React from 'react'
import { api, HydrateClient } from '@/src/trpc/server';
import { Metadata } from 'next';
import { auth } from '@/src/server/auth/auth';
import WordResultClient from './word-result-client';

// This is the updated metadata generation function
export async function generateMetadata({
    params,
}: {
    params: Promise<{ word: string, locale: string }>
}): Promise<Metadata> {
    const { word, locale } = await params;
    const wordName = decodeURIComponent(word);
    const [result] = await api.word.getWord({ name: wordName, skipLogging: true });

    if (!result) {
        return {
            title: "Kelime Bulunamadı",
            description: "Aradığınız kelime sözlükte bulunamadı.",
        };
    }


    // --- Define the canonical base URL ---
    const siteUrl = 'https://turkce-sozluk.com';

    const { word_data } = result
    const relatedWords = word_data?.relatedWords?.map((word) => word.related_word_name) || [];
    const relatedPhrases = word_data?.relatedPhrases?.map((phrase) => phrase.related_phrase) || [];
    const isEnglish = locale === "en";
    const firstMeaning = word_data.meanings[0]?.meaning || "";

    // SEO-optimized Title
    const title = isEnglish
        ? `What does "${word_data.word_name}" mean? Definition & Examples `
        : `"${word_data.word_name}" ne demek? Anlamı ve Örnek Cümleler`;

    // SEO-optimized Description
    const description = isEnglish
        ? `Official definition, pronunciation, and example sentences for the Turkish word "${word_data.word_name}": ${firstMeaning}. Learn more with our community-driven dictionary.`
        : `"${word_data.word_name}" kelimesinin resmi tanımı, okunuşu ve örnek cümleleri: ${firstMeaning}. Toplulukla gelişen sözlüğümüzle daha fazlasını öğrenin.`;

    // Combine them for the keywords tag
    const baseKeywords = isEnglish
        ? ['turkish dictionary', 'meaning of ' + word_data.word_name, 'turkish words']
        : ['türkçe sözlük', `${word_data.word_name} anlamı`, `${word_data.word_name} ne demek`, 'kelime anlamları'];

    const keywords = [word_data.word_name, ...baseKeywords, ...relatedWords, ...relatedPhrases];
    // --- THE FIX: Generate correct, absolute URLs for all tags ---
    const turkishPath = `/tr/arama/${wordName}`;
    const englishPath = `/en/search/${wordName}`;
    return {
        title,
        description,
        keywords,
        openGraph: {
            title: title,
            description: description,
            // Next.js will automatically find the opengraph-image.tsx in this directory
        },
        twitter: {
            title: title,
            description: description,
            // Twitter will also use the opengraph-image by default
        },
        alternates: {
            canonical: locale === 'tr' ? `${siteUrl}${turkishPath}` : `${siteUrl}${englishPath}`,
            languages: {
                'en-US': `${siteUrl}${englishPath}`,
                'tr-TR': `${siteUrl}${turkishPath}`,
            },
        },
    };
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

    const {
        locale,
        word
    } = params;

    // Properly decode URL parameters with special characters like commas
    const decodedWordName = decodeURIComponent(params.word);

    const session = await auth()

    // 1. Fetch data on the server for SEO and initial load.
    try {
        void api.word.getWord.prefetch({ name: decodedWordName, skipLogging: true });
    } catch (error) {
        console.error("Failed to prefetch word data:", error);
        return <WordResultClient session={session} wordName={decodedWordName} />
    }

    // 3. Pass the server-fetched data to the new Client Component.
    return (
        <HydrateClient>
            <WordResultClient session={session} wordName={decodedWordName} />
        </HydrateClient>
    )
}
