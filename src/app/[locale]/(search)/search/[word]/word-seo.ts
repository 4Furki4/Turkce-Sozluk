import type { Metadata } from "next";

import { getWordCanonicalUrl } from "@/src/lib/seo-utils";

import type { WordSearchResult } from "@/types";

type WordEntryData = WordSearchResult["word_data"];

export function buildWordJsonLd(wordData: WordEntryData, locale: string) {
    const relatedWords = wordData.relatedWords?.map((word) => word.related_word_name) ?? [];
    const firstMeaning = wordData.meanings?.[0]?.meaning ?? "";
    const canonicalLocale = locale === "en" ? "en" : "tr";

    return {
        "@context": "https://schema.org",
        "@type": "DefinedTerm",
        name: wordData.word_name,
        description: firstMeaning,
        inLanguage: canonicalLocale,
        url: getWordCanonicalUrl(wordData.word_name, canonicalLocale),
        isPartOf: {
            "@type": "Dictionary",
            name: locale === "en" ? "Turkish Dictionary" : "Türkçe Sözlük",
            description: locale === "en"
                ? "Community-driven, modern, and open-source Turkish Dictionary"
                : "Toplulukla gelişen, çağdaş ve açık kaynak Türkçe Sözlük",
            url: locale === "en"
                ? "https://turkce-sozluk.com/en"
                : "https://turkce-sozluk.com/tr",
            inLanguage: locale === "en" ? ["en"] : ["tr"],
        },
        alternateName: relatedWords.slice(0, 5),
        additionalType: "https://schema.org/LexicalEntry",
    };
}

export function buildWordNotFoundMetadata(wordName: string, locale: string): Metadata {
    const title = locale === "en"
        ? `"${wordName}" not found in Turkish Dictionary`
        : `"${wordName}" kelimesi bulunamadı`;

    const description = locale === "en"
        ? `The Turkish word "${wordName}" was not found in our dictionary. You can contribute by suggesting this word to our community-driven dictionary.`
        : `"${wordName}" kelimesi sözlüğümüzde bulunamadı. Bu kelimeyi toplulukla gelişen sözlüğümüze önermeniz için katkıda bulunabilirsiniz.`;

    return {
        title,
        description,
        robots: {
            index: false,
            follow: false,
        },
    };
}

export function buildWordMetadata(
    requestedWordName: string,
    locale: string,
    wordData: WordEntryData | undefined,
): Metadata {
    if (!wordData) {
        return buildWordNotFoundMetadata(requestedWordName, locale);
    }

    const isEnglish = locale === "en";
    const seoLocale = isEnglish ? "en" : "tr";
    const canonicalWordName = wordData.word_name;
    const relatedWords = wordData.relatedWords?.map((word) => word.related_word_name) ?? [];
    const relatedPhrases = wordData.relatedPhrases?.map((phrase) => phrase.related_phrase) ?? [];
    const firstMeaning = wordData.meanings?.[0]?.meaning ?? "";

    const title = isEnglish
        ? `What does "${canonicalWordName}" mean? Definition & Examples`
        : `"${canonicalWordName}" ne demek? Anlamı ve Örnek Cümleler`;

    const description = isEnglish
        ? `Official definition, pronunciation, and example sentences for the Turkish word "${canonicalWordName}": ${firstMeaning}. Learn more with our community-driven dictionary.`
        : `"${canonicalWordName}" kelimesinin resmi tanımı, okunuşu ve örnek cümleleri: ${firstMeaning}. Toplulukla gelişen sözlüğümüzle daha fazlasını öğrenin.`;

    const baseKeywords = isEnglish
        ? ["turkish dictionary", `meaning of ${canonicalWordName}`, "turkish words"]
        : ["türkçe sözlük", `${canonicalWordName} anlamı`, `${canonicalWordName} ne demek`, "kelime anlamları"];

    return {
        title,
        description,
        keywords: [canonicalWordName, ...baseKeywords, ...relatedWords, ...relatedPhrases],
        openGraph: {
            title,
            description,
            type: "article",
            locale: isEnglish ? "en_US" : "tr_TR",
        },
        twitter: {
            title,
            description,
            card: "summary_large_image",
        },
        alternates: {
            canonical: getWordCanonicalUrl(canonicalWordName, seoLocale),
        },
        robots: {
            index: !isEnglish,
            follow: true,
            googleBot: {
                index: !isEnglish,
                follow: true,
                "max-video-preview": -1,
                "max-image-preview": "large",
                "max-snippet": -1,
            },
        },
    };
}
