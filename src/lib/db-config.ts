import { DBSchema } from "idb";
import { WordSearchResult } from "@/types";

export const DB_NAME = "turkish-dictionary-offline";
export const DB_VERSION = 5;
export const WORDS_STORE = "words";
export const METADATA_STORE = "metadata";
export const WORD_NAME_INDEX = "word_name_index";

export const AUTOCOMPLETE_STORE = "autocompleteWords";
export const AUTOCOMPLETE_NAME_INDEX = "autocomplete_name_index";
export const AUTOCOMPLETE_VERSION_KEY = "autocompleteVersion";
export const POPULAR_TRENDS_STORE = "popularTrends";

export type WordData = WordSearchResult["word_data"];

export interface AutocompleteWord {
    key: string; // "ankara"
    displayName: string; // "Ankara"
}
export interface PopularWord {
    id: number;
    name: string;
}
export interface CachedPopularData {
    key: string; // "popular-allTime", "trending-7days", etc.
    data: PopularWord[];
    timestamp: number;
}

export interface OfflineDB extends DBSchema {
    [WORDS_STORE]: {
        key: number;
        value: WordData;
        indexes: { [WORD_NAME_INDEX]: string };
    };
    [METADATA_STORE]: {
        key: string;
        value: any;
    };
    [AUTOCOMPLETE_STORE]: {
        key: string; // This will be the lowercase name ("ankara")
        value: AutocompleteWord;
        indexes: { [AUTOCOMPLETE_NAME_INDEX]: string }; // Index will be on the 'key'
    };
    [POPULAR_TRENDS_STORE]: {
        key: string;
        value: CachedPopularData;
    };
}
