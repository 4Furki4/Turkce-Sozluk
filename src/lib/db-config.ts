import { DBSchema } from "idb";
import { WordSearchResult } from "@/types";

export const DB_NAME = "turkish-dictionary-offline";
export const DB_VERSION = 7;
export const WORDS_STORE = "offlineWords";
export const METADATA_STORE = "metadata";
export const WORD_DATASET_LOOKUP_INDEX = "dataset_lookup_key_index";
export const WORD_DATASET_SORT_INDEX = "dataset_sort_key_index";
export const WORD_DATASET_VERSION_INDEX = "dataset_version_index";

export const AUTOCOMPLETE_STORE = "autocompleteWords";
export const AUTOCOMPLETE_NAME_INDEX = "autocomplete_name_index";
export const AUTOCOMPLETE_VERSION_KEY = "autocompleteVersion";
export const POPULAR_TRENDS_STORE = "popularTrends";
export const OFFLINE_METADATA_KEY = "offlineMetadata";
export const OFFLINE_SCHEMA_VERSION = 1;

export type WordData = WordSearchResult["word_data"];

export interface AutocompleteWord {
    key: string; // "ankara"
    displayName: string; // "Ankara"
}

export type OfflineInstallStatus =
    | "not-downloaded"
    | "ready"
    | "update-available"
    | "downloading"
    | "failed"
    | "cleared";

export interface OfflineMetadata {
    schemaVersion: number;
    activeVersion: number | null;
    installingVersion?: number | null;
    status: OfflineInstallStatus;
    installedWordCount: number;
    installedAt: number | null;
    totalSize?: number | null;
    lastError?: string | null;
    autocompleteVersion?: string;
}

export interface OfflineWordRecord {
    id: string;
    datasetVersion: number;
    datasetLookupKey: string;
    datasetSortKey: string;
    lookupKey: string;
    wordId: number;
    wordName: string;
    word: WordData;
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
        key: string;
        value: OfflineWordRecord;
        indexes: {
            [WORD_DATASET_LOOKUP_INDEX]: string;
            [WORD_DATASET_SORT_INDEX]: string;
            [WORD_DATASET_VERSION_INDEX]: number;
        };
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
