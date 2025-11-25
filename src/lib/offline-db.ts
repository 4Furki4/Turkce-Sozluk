import { openDB, IDBPDatabase } from "idb";
import { decode } from "@msgpack/msgpack";
import {
    DB_NAME,
    DB_VERSION,
    WORDS_STORE,
    METADATA_STORE,
    WORD_NAME_INDEX,
    AUTOCOMPLETE_STORE,
    AUTOCOMPLETE_NAME_INDEX,
    AUTOCOMPLETE_VERSION_KEY,
    POPULAR_TRENDS_STORE,
    OfflineDB,
    WordData,
    AutocompleteWord,
    CachedPopularData,
    PopularWord
} from "./db-config";

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
    const tx = db.transaction([WORDS_STORE, METADATA_STORE], "readwrite");
    await tx.objectStore(WORDS_STORE).clear();
    await tx.objectStore(METADATA_STORE).clear();
    await tx.done;
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

export const searchByPattern = async (
    pattern: string,
    limit: number = 20
): Promise<WordData[]> => {
    const db = await getDb();

    // 1. Convert pattern to Regex
    // Escape special regex characters except underscore
    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Replace underscore with dot (match any char)
    const regexString = `^${escapedPattern.replace(/_/g, '.')}$`;
    const regex = new RegExp(regexString, 'i'); // Case insensitive

    const results: WordData[] = [];
    let count = 0;

    // 2. Iterate using a cursor on AUTOCOMPLETE_STORE
    const tx = db.transaction(AUTOCOMPLETE_STORE, 'readonly');
    const store = tx.objectStore(AUTOCOMPLETE_STORE);

    // Optimization: If pattern starts with characters, use them as a range
    let range: IDBKeyRange | null = null;
    const firstUnderscoreIndex = pattern.indexOf('_');
    if (firstUnderscoreIndex > 0) {
        const prefix = pattern.substring(0, firstUnderscoreIndex).toLowerCase();
        range = IDBKeyRange.bound(prefix, prefix + '\uffff');
    }

    let cursor = await store.openCursor(range);

    while (cursor && count < limit) {
        const word = cursor.value as AutocompleteWord;

        // Check against displayName (original casing)
        if (regex.test(word.displayName)) {
            results.push({
                word_id: 0, // Placeholder ID since we are searching autocomplete
                word_name: word.displayName,
                // We don't have full data here, but it's enough for suggestions
            } as unknown as WordData);
            count++;
        }
        cursor = await cursor.continue();
    }

    return results;
};