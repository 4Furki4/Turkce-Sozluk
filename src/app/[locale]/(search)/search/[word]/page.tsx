import React from 'react'
import { api, HydrateClient } from '@/src/trpc/server';
import { Metadata } from 'next';
import { auth } from "@/src/lib/auth";
import WordResultClient from './word-result-client';
import { getWordCanonicalUrl } from '@/src/lib/seo-utils';
import { headers } from 'next/headers';

function buildWordJsonLd(wordData: any, locale: string) {
    const relatedWords = wordData?.relatedWords?.map((word: { related_word_name: string }) => word.related_word_name) || [];
    const firstMeaning = wordData.meanings[0]?.meaning || "";
    const canonicalLocale = locale === "en" ? "en" : "tr";

    return {
        "@context": "https://schema.org",
        "@type": "DefinedTerm",
        "name": wordData.word_name,
        "description": firstMeaning,
        "inLanguage": canonicalLocale,
        "url": getWordCanonicalUrl(wordData.word_name, canonicalLocale),
        "isPartOf": {
            "@type": "Dictionary",
            "name": locale === "en" ? "Turkish Dictionary" : "Türkçe Sözlük",
            "description": locale === "en"
                ? "Community-driven, modern, and open-source Turkish Dictionary"
                : "Toplulukla gelişen, çağdaş ve açık kaynak Türkçe Sözlük",
            "url": locale === "en"
                ? "https://turkce-sozluk.com/en"
                : "https://turkce-sozluk.com/tr",
            "inLanguage": locale === "en" ? ["en"] : ["tr"],
        },
        "alternateName": relatedWords.slice(0, 5),
        "additionalType": "https://schema.org/LexicalEntry",
    };
}

// This is the updated metadata generation function
export async function generateMetadata({
    params,
}: {
    params: Promise<{ word: string, locale: string }>
}): Promise<Metadata> {
    const { word, locale } = await params;
    const seoLocale = locale === "en" ? "en" : "tr";
    const wordName = decodeURIComponent(word);
    const [result] = await api.word.getWord({ name: wordName, skipLogging: true });

    if (!result) {
        const notFoundTitle = locale === 'en'
            ? `"${wordName}" not found in Turkish Dictionary`
            : `"${wordName}" kelimesi bulunamadı`;

        const notFoundDescription = locale === 'en'
            ? `The Turkish word "${wordName}" was not found in our dictionary. You can contribute by suggesting this word to our community-driven dictionary.`
            : `"${wordName}" kelimesi sözlüğümüzde bulunamadı. Bu kelimeyi toplulukla gelişen sözlüğümüze önermeniz için katkıda bulunabilirsiniz.`;

        return {
            title: notFoundTitle,
            description: notFoundDescription,
            robots: {
                index: false,
                follow: false,
            },
        };
    }

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

    return {
        title,
        description,
        keywords,
        openGraph: {
            title: title,
            description: description,
            type: 'article',
            locale: locale === 'en' ? 'en_US' : 'tr_TR',
            // Next.js will automatically find the opengraph-image.tsx in this directory
        },
        twitter: {
            title: title,
            description: description,
            card: 'summary_large_image',
            // Twitter will also use the opengraph-image by default
        },
        alternates: {
            canonical: getWordCanonicalUrl(wordName, seoLocale),
        },
        robots: {
            index: !isEnglish,
            follow: true,
            googleBot: {
                index: !isEnglish,
                follow: true,
                'max-video-preview': -1,
                'max-image-preview': 'large',
                'max-snippet': -1,
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

    const session = await auth.api.getSession({
        headers: await headers()
    });
    const [serverResult] = await api.word.getWord({ name: decodedWordName, skipLogging: true });
    const jsonLd = serverResult ? buildWordJsonLd(serverResult.word_data, locale) : null;

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
            {jsonLd ? (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            ) : null}
            <WordResultClient session={session} wordName={decodedWordName} />
        </HydrateClient>
    )
}
