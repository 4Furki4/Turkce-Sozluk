// src/app/sitemap-index.xml/route.ts

import { db } from "@/db";
import { words } from "@/db/schema/words";
import { getBaseUrl } from '@/src/lib/seo-utils';
import { count } from "drizzle-orm";

const PAGE_SIZE = 5000; // Must be the same as in your [page].xml file

export async function GET() {
    const baseUrl = getBaseUrl();
    const lastmod = new Date().toISOString();

    // 1. Get the total count of words
    const totalResult = await db.select({ count: count() }).from(words).execute();
    const totalWords = totalResult[0].count;

    // 2. Calculate how many sitemap pages we need
    const totalPages = Math.ceil(totalWords / PAGE_SIZE);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // 3. Add your static sitemap
    xml += `<sitemap><loc>${baseUrl}/sitemap.xml</loc><lastmod>${lastmod}</lastmod></sitemap>\n`;

    // 4. Loop and add all your dynamic word sitemaps
    for (let i = 1; i <= totalPages; i++) {
        xml += `<sitemap><loc>${baseUrl}/sitemap-words/sitemap/${i}.xml</loc><lastmod>${lastmod}</lastmod></sitemap>\n`;
    }

    xml += '</sitemapindex>';

    return new Response(xml, {
        headers: { 'Content-Type': 'application/xml' },
    });
}