"use client"
import React from 'react'
import WordCard from './word-card';
import { Session } from 'next-auth';
import WordNotFoundCard from './word-not-found-card';
import { WordSearchResult } from '@/types';

export default function WordCardWrapper({ session, locale, data, isOnline, isWordFetching }: { session: Session | null, locale: "en" | "tr", data?: WordSearchResult[], isOnline?: boolean, isWordFetching?: boolean }) {

    if (!data || data.length === 0) {
        return (
            <WordNotFoundCard
                session={session}
            />
        );
    }
    return data && data.length > 0 ? (
        data.map((word, index) => {
            // Ensure we have a valid unique key for each word card
            const uniqueKey = word.word_data?.word_id || `word-${index}`;
            return (
                <WordCard
                    key={uniqueKey}
                    word_data={word.word_data}
                    locale={locale}
                    session={session}
                    isOnline={isOnline}
                    isWordFetching={isWordFetching}
                />
            );
        })
    ) : (
        <WordNotFoundCard
            session={session}
        />
    );
}
