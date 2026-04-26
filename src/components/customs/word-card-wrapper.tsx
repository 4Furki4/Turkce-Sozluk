"use client"
import React from 'react'
import { Session } from '@/src/lib/auth-client';
import { WordSearchResult } from '@/types';
import { SearchWordCardVariantGroup } from './search/word-card-variants';

export default function WordCardWrapper({ session, locale, data, isOnline, isWordFetching, headingLevel = "h2" }: { session: Session | null, locale: "en" | "tr", data?: WordSearchResult[], isOnline?: boolean, isWordFetching?: boolean, headingLevel?: "h1" | "h2" }) {
    return (
        <SearchWordCardVariantGroup
            data={data}
            locale={locale}
            session={session}
            isOnline={isOnline}
            isWordFetching={isWordFetching}
            headingLevel={headingLevel}
        />
    );
}
