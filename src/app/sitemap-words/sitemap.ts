// src/app/sitemap-words/sitemap.ts

import { db } from "@/db";
import { words } from "@/db/schema/words";
import { getBaseUrl } from '@/src/lib/seo-utils';
import { count } from "drizzle-orm";
import { MetadataRoute } from 'next';

// How many words to include per sitemap file.
// 5,000 words = 10,000 URLs (tr + en), which is fast and small.
const PAGE_SIZE = 5000;

// 1. This function tells Next.js HOW MANY sitemap files to create.
export async function generateSitemaps() {
    // Fetch the total count of words
    console.log('Fetching total count of words...');
    const totalResult = await db.select({ count: count() }).from(words).execute();
    const totalWords = totalResult[0].count;
    console.log('Total words:', totalWords);

    // Calculate how many pages we need
    const totalPages = Math.ceil(totalWords / PAGE_SIZE);
    console.log('Total pages:', totalPages);

    // Create an array for each page
    // e.g. [{ page: 1 }, { page: 2 }, ..., { page: 20 }]
    console.log('Creating array for each page...');
    const pages = Array.from({ length: totalPages }, (_, i) => ({
        id: i + 1,
    }));
    console.log('Pages:', pages);
    return pages;
}

// 2. This function is called by Next.js FOR EACH page from the array above.
// It receives { page: 1 }, then { page: 2 }, etc.
export default async function sitemap({ id: page }: { id: number }): Promise<MetadataRoute.Sitemap> {
    const baseUrl = getBaseUrl();
    const offset = (page - 1) * PAGE_SIZE;

    // Fetch this page's words
    const rows = await db
        .select({ name: words.name })
        .from(words)
        .orderBy(words.id) // Ensure stable ordering
        .offset(offset)
        .limit(PAGE_SIZE)
        .execute();

    // Map the rows to sitemap URLs
    return rows.flatMap(({ name }) => {
        const encoded = encodeURIComponent(name);
        const lastModified = new Date().toISOString();

        // Return an array with both language versions
        return [
            // Turkish version
            {
                url: `${baseUrl}/arama/${encoded}`,
                lastModified,
                changeFrequency: 'daily',
                priority: 0.8,
                alternates: {
                    languages: {
                        en: `${baseUrl}/en/search/${encoded}`,
                        tr: `${baseUrl}/arama/${encoded}`,
                        'x-default': `${baseUrl}/arama/${encoded}`,
                    },
                },
            },
            // English version
            {
                url: `${baseUrl}/en/search/${encoded}`,
                lastModified,
                changeFrequency: 'daily',
                priority: 0.8,
                alternates: {
                    languages: {
                        en: `${baseUrl}/en/search/${encoded}`,
                        tr: `${baseUrl}/arama/${encoded}`,
                        'x-default': `${baseUrl}/arama/${encoded}`,
                    },
                },
            },
        ];
    });
}