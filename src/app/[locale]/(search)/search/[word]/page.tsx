import React from 'react'
import { api, HydrateClient } from '@/src/trpc/server';
import { Metadata } from 'next';
import { auth } from '@/src/server/auth/auth';
import WordResultClient from './word-result-client';
import { getWordCanonicalUrl, getWordHreflangUrls } from '@/src/lib/seo-utils';

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

    // Generate JSON-LD structured data for better SEO
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "DefinedTerm",
        "name": word_data.word_name,
        "description": firstMeaning,
        "inLanguage": "tr",
        "url": getWordCanonicalUrl(wordName, locale),
        "isPartOf": {
            "@type": "Dictionary",
            "name": isEnglish ? "Turkish Dictionary" : "Türkçe Sözlük",
            "description": isEnglish
                ? "Community-driven, modern, and open-source Turkish Dictionary"
                : "Toplulukla gelişen, çağdaş ve açık kaynak Türkçe Sözlük",
            "url": isEnglish ? "https://turkce-sozluk.com/en" : "https://turkce-sozluk.com",
            "inLanguage": ["tr", "en"]
        },
        "alternateName": relatedWords.slice(0, 5), // Limit to avoid bloating
        "additionalType": "https://schema.org/LexicalEntry"
    };

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
            canonical: getWordCanonicalUrl(wordName, locale),
            languages: getWordHreflangUrls(wordName),
        },
        other: {
            'application/ld+json': JSON.stringify(jsonLd),
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
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

    const session = await auth()

    // 1. Fetch data on the server for SEO and initial load.
    try {
        void api.word.getWord.prefetch({ name: decodedWordName, });
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
