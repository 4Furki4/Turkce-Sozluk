"use client";

import { useWordSearch } from "@/src/hooks/useWordSearch";
import Loading from "../_loading";
import WordNotFoundCard from "@/src/components/customs/word-not-found-card";
import { Session } from "next-auth";
import WordCardWrapper from "@/src/components/customs/word-card-wrapper";
import { useLocale } from "next-intl";

type WordResultClientProps = {
    session: Session | null;
    wordName: string;
};

export default function WordResultClient({ session, wordName }: WordResultClientProps) {
    const locale = useLocale();
    // The initial data from the server is passed directly to our hook.
    // TanStack Query will use this data immediately without refetching on the client.
    const { data, isLoading, isError } = useWordSearch(wordName);

    // The loading skeleton will only be shown on subsequent client-side navigation.
    if (isLoading) {
        return <Loading />;
    }

    // Show the "Not Found" component if there's an error or no data
    if (isError || !data) {
        return <WordNotFoundCard session={session} />;
    }

    // The WordCard expects data in a specific array format.
    // We wrap our single result to match that expected structure.

    const formattedData = [{ word_data: data }];

    return <WordCardWrapper locale={locale as "en" | "tr"} data={formattedData as any} session={session} />;
}
