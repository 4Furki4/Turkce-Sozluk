import { openDB, DBSchema, IDBPDatabase } from "idb";
import { decode } from "@msgpack/msgpack";
import { WordSearchResult } from "@/types";

const DB_NAME = "turkish-dictionary-offline";
const DB_VERSION = 5;
const WORDS_STORE = "words";
const METADATA_STORE = "metadata";
const WORD_NAME_INDEX = "word_name_index";

const AUTOCOMPLETE_STORE = "autocompleteWords";
const AUTOCOMPLETE_NAME_INDEX = "autocomplete_name_index"; // This will be on the new lowercase `key`
const AUTOCOMPLETE_VERSION_KEY = "autocompleteVersion";
const POPULAR_TRENDS_STORE = "popularTrends";

export type WordData = WordSearchResult["word_data"];

interface AutocompleteWord {
    key: string; // "ankara"
    displayName: string; // "Ankara"
}
interface PopularWord {
    id: number;
    name: string;
}
interface CachedPopularData {
    key: string; // "popular-allTime", "trending-7days", etc.
    data: PopularWord[];
    timestamp: number;
}

interface OfflineDB extends DBSchema {
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

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

const getDb = (): Promise<IDBPDatabase<OfflineDB>> => {
    if (!dbPromise) {
        dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion, transaction) {
                console.log(`Upgrading database from version ${oldVersion} to ${newVersion}...`);

                if (oldVersion < 2) {
                    if (db.objectStoreNames.contains(WORDS_STORE)) {
                        db.deleteObjectStore(WORDS_STORE);
                    }
                    const store = db.createObjectStore(WORDS_STORE, { keyPath: "word_id" });
                    store.createIndex(WORD_NAME_INDEX, "word_name", { unique: false });

                    if (db.objectStoreNames.contains(METADATA_STORE)) {
                        db.deleteObjectStore(METADATA_STORE);
                    }
                    db.createObjectStore(METADATA_STORE);
                }

                if (oldVersion < 3) {
                    if (!db.objectStoreNames.contains(AUTOCOMPLETE_STORE)) {
                        const store = db.createObjectStore(AUTOCOMPLETE_STORE, { keyPath: "name" });
                        store.createIndex(AUTOCOMPLETE_NAME_INDEX, "name", { unique: true });
                    }
                }

                if (oldVersion < 4) {
                    if (db.objectStoreNames.contains(AUTOCOMPLETE_STORE)) {
                        db.deleteObjectStore(AUTOCOMPLETE_STORE);
                    }
                    // Create the new store, keyPath is the lowercase 'key'
                    const store = db.createObjectStore(AUTOCOMPLETE_STORE, { keyPath: "key" });
                    // The index is also on the lowercase 'key'
                    store.createIndex(AUTOCOMPLETE_NAME_INDEX, "key", { unique: true });
                }
                if (oldVersion < 5) {
                    if (!db.objectStoreNames.contains(POPULAR_TRENDS_STORE)) {
                        // Create the new store, keyPath is the 'key'
                        db.createObjectStore(POPULAR_TRENDS_STORE, { keyPath: "key" });
                    }
                }
            },
        });
    }
    return dbPromise;
};

export const getLocalVersion = async (): Promise<number | null> => {
    const db = await getDb();
    return db.get(METADATA_STORE, "version");
};

export const setLocalVersion = async (version: number): Promise<void> => {
    const db = await getDb();
    await db.put(METADATA_STORE, version, "version");
};

export const clearOfflineData = async (): Promise<void> => {
    const db = await getDb();
    await db.clear(WORDS_STORE);
};

export const processWordFile = async (fileUrl: string): Promise<void> => {
    const response = await fetch(fileUrl);
    if (!response.ok) {
        throw new Error(`Failed to download file: ${fileUrl}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const words = decode(arrayBuffer) as WordData[];

    const db = await getDb();
    const tx = db.transaction(WORDS_STORE, "readwrite");

    for (const word of words) {
        try {
            if (!word || typeof word.word_id !== 'number' || typeof word.word_name !== 'string' || word.word_name.length === 0) {
                console.warn("Skipping invalid word object lacking a valid 'word_id' or 'word_name':", word);
                continue;
            }
            await tx.store.put(word);
        } catch (error) {
            console.error("--- IndexedDB Error ---");
            console.error("Failed to store the following word object in IndexedDB:");
            console.error(word);
            console.error("Original Error:", error);

            throw new Error(`Failed to store word with ID: "${word?.word_id || 'unknown'}". Check the console for the problematic data object.`);
        }
    }

    await tx.done;
};

export const getWordByNameOffline = async (
    wordName: string
): Promise<WordData | undefined> => {
    const db = await getDb();
    return db.getFromIndex(WORDS_STORE, WORD_NAME_INDEX, wordName);
};

export async function getLocalAutocompleteVersion(): Promise<string | undefined> {
    const db = await getDb();
    return db.get(METADATA_STORE, AUTOCOMPLETE_VERSION_KEY);
}

export async function updateLocalAutocompleteList(
    words: string[],
    newVersion: string,
) {
    const db = await getDb();

    const tx = db.transaction(
        [AUTOCOMPLETE_STORE, METADATA_STORE],
        "readwrite",
    );

    const autocompleteStore = tx.objectStore(AUTOCOMPLETE_STORE);
    const metadataStore = tx.objectStore(METADATA_STORE);

    await autocompleteStore.clear();

    // Create the new object with lowercase key
    const wordsToStore: AutocompleteWord[] = words.map(displayName => ({
        key: displayName.toLowerCase(),
        displayName: displayName,
    }));

    // Use a Set to handle duplicate lowercase keys (e.g., "Kale" and "kale")
    // We'll prefer the capitalized version if a duplicate exists.
    const uniqueWords = new Map<string, AutocompleteWord>();
    for (const word of wordsToStore) {
        if (!uniqueWords.has(word.key) || word.displayName.charAt(0) === word.displayName.charAt(0).toUpperCase()) {
            uniqueWords.set(word.key, word);
        }
    }

    // Add all new words
    await Promise.all(
        Array.from(uniqueWords.values()).map((wordObject) =>
            autocompleteStore.put(wordObject)
        ),
    );

    await metadataStore.put(newVersion, AUTOCOMPLETE_VERSION_KEY);
    await tx.done;
    console.log(`[OfflineDB] Updated autocomplete list to version ${newVersion} with ${uniqueWords.size} words.`);
}

export async function searchAutocompleteOffline(
    query: string,
): Promise<string[]> {
    if (query.length < 2) return [];

    const db = await getDb();

    // Always search using the lowercase query
    const lowerCaseQuery = query.toLowerCase();

    const lowerBound = lowerCaseQuery;
    const upperBound = lowerCaseQuery + "\uffff";
    const range = IDBKeyRange.bound(lowerBound, upperBound);

    // Query the index (which is on the lowercase 'key')
    const results = await db
        .getAllFromIndex(AUTOCOMPLETE_STORE, AUTOCOMPLETE_NAME_INDEX, range, 10);

    // Return the 'displayName' which has the original casing
    return results.map((word) => word.displayName);
}

/**
 * Gets cached popular/trending data from IndexedDB.
 */
export const getCachedPopularData = async (
    key: string
): Promise<CachedPopularData | undefined> => {
    const db = await getDb();
    return db.get(POPULAR_TRENDS_STORE, key);
};

/**
 * Sets cached popular/trending data in IndexedDB.
 */
export const setCachedPopularData = async (
    key: string,
    data: PopularWord[]
): Promise<void> => {
    const db = await getDb();
    const cacheEntry: CachedPopularData = {
        key,
        data,
        timestamp: Date.now(),
    };
    await db.put(POPULAR_TRENDS_STORE, cacheEntry);
};