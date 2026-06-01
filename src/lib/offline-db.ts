import { decode } from "@msgpack/msgpack";
import { deleteDB, IDBPDatabase, openDB } from "idb";

import {
    AUTOCOMPLETE_NAME_INDEX,
    AUTOCOMPLETE_STORE,
    AUTOCOMPLETE_VERSION_KEY,
    AutocompleteWord,
    CachedPopularData,
    DB_NAME,
    DB_VERSION,
    METADATA_STORE,
    OFFLINE_METADATA_KEY,
    OFFLINE_SCHEMA_VERSION,
    OfflineDB,
    OfflineMetadata,
    OfflineWordRecord,
    POPULAR_TRENDS_STORE,
    PopularWord,
    WORD_DATASET_LOOKUP_INDEX,
    WORD_DATASET_SORT_INDEX,
    WORD_DATASET_VERSION_INDEX,
    WORDS_STORE,
    WordData,
} from "./db-config";

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

export type OfflineDatasetManifest = {
    version: number;
    files: string[];
    totalSize?: number | null;
};

export type OfflineInstallProgress = {
    completedFiles: number;
    totalFiles: number;
    progress: number;
    wordCount: number;
};

const LEGACY_WORDS_STORE = "words";
const LEGACY_AUTOCOMPLETE_STORE = "autocompleteWords";
const DATASET_KEY_SEPARATOR = "\u0000";
const legacyStoreName = (storeName: string) => storeName as any;

export const normalizeOfflineSearchKey = (value: string): string =>
    value
        .normalize("NFC")
        .replace(/\s+/g, " ")
        .trim()
        .toLocaleLowerCase("tr");

export const getOfflineWordRecordId = (
    datasetVersion: number,
    wordId: number,
): string => `${datasetVersion}:${wordId}`;

export const getDatasetLookupKey = (
    datasetVersion: number,
    lookupKey: string,
): string => `${datasetVersion}${DATASET_KEY_SEPARATOR}${lookupKey}`;

export const getDatasetSortKey = (
    datasetVersion: number,
    lookupKey: string,
    wordId: number,
): string =>
    `${datasetVersion}${DATASET_KEY_SEPARATOR}${lookupKey}${DATASET_KEY_SEPARATOR}${String(wordId).padStart(10, "0")}`;

const getDefaultMetadata = (): OfflineMetadata => ({
    schemaVersion: OFFLINE_SCHEMA_VERSION,
    activeVersion: null,
    installingVersion: null,
    status: "not-downloaded",
    installedWordCount: 0,
    installedAt: null,
    totalSize: null,
    lastError: null,
});

const createOfflineWordStore = (db: IDBPDatabase<OfflineDB>) => {
    const store = db.createObjectStore(WORDS_STORE, { keyPath: "id" });
    store.createIndex(WORD_DATASET_LOOKUP_INDEX, "datasetLookupKey", {
        unique: false,
    });
    store.createIndex(WORD_DATASET_SORT_INDEX, "datasetSortKey", {
        unique: true,
    });
    store.createIndex(WORD_DATASET_VERSION_INDEX, "datasetVersion", {
        unique: false,
    });
};

const createAutocompleteStore = (db: IDBPDatabase<OfflineDB>) => {
    const store = db.createObjectStore(AUTOCOMPLETE_STORE, { keyPath: "key" });
    store.createIndex(AUTOCOMPLETE_NAME_INDEX, "key", {
        unique: true,
    });
};

const getDb = (): Promise<IDBPDatabase<OfflineDB>> => {
    if (!dbPromise) {
        dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                if (oldVersion < 6) {
                    if (db.objectStoreNames.contains(legacyStoreName(LEGACY_WORDS_STORE))) {
                        db.deleteObjectStore(legacyStoreName(LEGACY_WORDS_STORE));
                    }

                    if (db.objectStoreNames.contains(legacyStoreName(LEGACY_AUTOCOMPLETE_STORE))) {
                        db.deleteObjectStore(legacyStoreName(LEGACY_AUTOCOMPLETE_STORE));
                    }

                    if (db.objectStoreNames.contains(WORDS_STORE)) {
                        db.deleteObjectStore(WORDS_STORE);
                    }

                    if (db.objectStoreNames.contains(METADATA_STORE)) {
                        db.deleteObjectStore(METADATA_STORE);
                    }
                }

                if (!db.objectStoreNames.contains(WORDS_STORE)) {
                    createOfflineWordStore(db);
                }

                if (!db.objectStoreNames.contains(METADATA_STORE)) {
                    db.createObjectStore(METADATA_STORE);
                }

                if (!db.objectStoreNames.contains(AUTOCOMPLETE_STORE)) {
                    createAutocompleteStore(db);
                }

                if (!db.objectStoreNames.contains(POPULAR_TRENDS_STORE)) {
                    db.createObjectStore(POPULAR_TRENDS_STORE, { keyPath: "key" });
                }
            },
        });
    }

    return dbPromise;
};

const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

const isValidWordData = (word: unknown): word is WordData => {
    const maybeWord = word as Partial<WordData> | undefined;
    return (
        !!maybeWord &&
        typeof maybeWord.word_id === "number" &&
        typeof maybeWord.word_name === "string" &&
        maybeWord.word_name.trim().length > 0
    );
};

export const toOfflineWordRecord = (
    datasetVersion: number,
    word: WordData,
): OfflineWordRecord => {
    const lookupKey = normalizeOfflineSearchKey(word.word_name);

    return {
        id: getOfflineWordRecordId(datasetVersion, word.word_id),
        datasetVersion,
        datasetLookupKey: getDatasetLookupKey(datasetVersion, lookupKey),
        datasetSortKey: getDatasetSortKey(datasetVersion, lookupKey, word.word_id),
        lookupKey,
        wordId: word.word_id,
        wordName: word.word_name,
        word,
    };
};

export const getOfflineMetadata = async (): Promise<OfflineMetadata> => {
    const db = await getDb();
    const metadata = await db.get(METADATA_STORE, OFFLINE_METADATA_KEY);

    return {
        ...getDefaultMetadata(),
        ...(metadata ?? {}),
        schemaVersion: OFFLINE_SCHEMA_VERSION,
    };
};

const replaceOfflineMetadata = async (
    metadata: OfflineMetadata,
): Promise<OfflineMetadata> => {
    const db = await getDb();
    const nextMetadata = {
        ...metadata,
        schemaVersion: OFFLINE_SCHEMA_VERSION,
    };

    await db.put(METADATA_STORE, nextMetadata, OFFLINE_METADATA_KEY);

    return nextMetadata;
};

const updateOfflineMetadata = async (
    patch: Partial<OfflineMetadata>,
): Promise<OfflineMetadata> => {
    const current = await getOfflineMetadata();
    return replaceOfflineMetadata({
        ...current,
        ...patch,
        schemaVersion: OFFLINE_SCHEMA_VERSION,
    });
};

const deleteWordsForVersion = async (datasetVersion: number): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction(WORDS_STORE, "readwrite");
    const index = tx.store.index(WORD_DATASET_VERSION_INDEX);
    let cursor = await index.openCursor(datasetVersion);

    while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
    }

    await tx.done;
};

const deleteInactiveWordVersions = async (
    activeVersion: number,
): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction(WORDS_STORE, "readwrite");
    let cursor = await tx.store.openCursor();

    while (cursor) {
        if (cursor.value.datasetVersion !== activeVersion) {
            await cursor.delete();
        }

        cursor = await cursor.continue();
    }

    await tx.done;
};

const putWordChunk = async (
    datasetVersion: number,
    words: WordData[],
): Promise<number> => {
    const db = await getDb();
    const tx = db.transaction(WORDS_STORE, "readwrite");
    let wordCount = 0;

    for (const word of words) {
        if (!isValidWordData(word)) {
            continue;
        }

        await tx.store.put(toOfflineWordRecord(datasetVersion, word));
        wordCount += 1;
    }

    await tx.done;

    return wordCount;
};

export const installOfflineDatasetFromFiles = async ({
    manifest,
    baseUrl,
    onProgress,
}: {
    manifest: OfflineDatasetManifest;
    baseUrl: string;
    onProgress?: (progress: OfflineInstallProgress) => void;
}): Promise<OfflineMetadata> => {
    const previousMetadata = await getOfflineMetadata();
    let wordCount = 0;

    await updateOfflineMetadata({
        status: "downloading",
        installingVersion: manifest.version,
        lastError: null,
        totalSize: manifest.totalSize ?? previousMetadata.totalSize ?? null,
    });

    try {
        await deleteWordsForVersion(manifest.version);

        for (let index = 0; index < manifest.files.length; index += 1) {
            const file = manifest.files[index];
            const response = await fetch(`${baseUrl}/${file}`);

            if (!response.ok) {
                throw new Error(`Failed to download file: ${file}`);
            }

            const words = decode(await response.arrayBuffer()) as WordData[];
            wordCount += await putWordChunk(manifest.version, words);

            onProgress?.({
                completedFiles: index + 1,
                totalFiles: manifest.files.length,
                progress: ((index + 1) / manifest.files.length) * 100,
                wordCount,
            });
        }

        const readyMetadata = await updateOfflineMetadata({
            activeVersion: manifest.version,
            installingVersion: null,
            status: "ready",
            installedWordCount: wordCount,
            installedAt: Date.now(),
            totalSize: manifest.totalSize ?? null,
            lastError: null,
        });

        await deleteInactiveWordVersions(manifest.version);

        return readyMetadata;
    } catch (error) {
        await deleteWordsForVersion(manifest.version);
        await replaceOfflineMetadata({
            ...previousMetadata,
            status: "failed",
            installingVersion: null,
            lastError: getErrorMessage(error),
            schemaVersion: OFFLINE_SCHEMA_VERSION,
        });

        throw error;
    }
};

export const getLocalVersion = async (): Promise<number | null> => {
    const metadata = await getOfflineMetadata();
    return metadata.activeVersion;
};

export const setLocalVersion = async (version: number): Promise<void> => {
    await updateOfflineMetadata({
        activeVersion: version,
        status: "ready",
        installedAt: Date.now(),
    });
};

export const clearOfflineData = async (): Promise<void> => {
    const currentMetadata = await getOfflineMetadata();
    const db = await getDb();
    const tx = db.transaction([WORDS_STORE, METADATA_STORE], "readwrite");
    await tx.objectStore(WORDS_STORE).clear();
    await tx.objectStore(METADATA_STORE).clear();
    await tx.objectStore(METADATA_STORE).put(
        {
            ...getDefaultMetadata(),
            status: "cleared",
            autocompleteVersion: currentMetadata.autocompleteVersion,
        },
        OFFLINE_METADATA_KEY,
    );
    await tx.done;
};

export const processWordFile = async (fileUrl: string): Promise<void> => {
    const response = await fetch(fileUrl);

    if (!response.ok) {
        throw new Error(`Failed to download file: ${fileUrl}`);
    }

    const version = Date.now();
    const words = decode(await response.arrayBuffer()) as WordData[];
    const wordCount = await putWordChunk(version, words);

    await updateOfflineMetadata({
        activeVersion: version,
        status: "ready",
        installedWordCount: wordCount,
        installedAt: Date.now(),
        lastError: null,
    });
};

export const getWordByNameOffline = async (
    wordName: string,
): Promise<WordData | undefined> => {
    const metadata = await getOfflineMetadata();

    if (!metadata.activeVersion) {
        return undefined;
    }

    const lookupKey = normalizeOfflineSearchKey(wordName);

    if (!lookupKey) {
        return undefined;
    }

    const db = await getDb();
    const matches = await db.getAllFromIndex(
        WORDS_STORE,
        WORD_DATASET_LOOKUP_INDEX,
        getDatasetLookupKey(metadata.activeVersion, lookupKey),
        1,
    );

    return matches[0]?.word;
};

export async function getLocalAutocompleteVersion(): Promise<string | undefined> {
    const metadata = await getOfflineMetadata();
    return metadata.autocompleteVersion;
}

export async function updateLocalAutocompleteList(
    words: string[],
    newVersion: string,
) {
    const db = await getDb();
    const tx = db.transaction([AUTOCOMPLETE_STORE, METADATA_STORE], "readwrite");
    const autocompleteStore = tx.objectStore(AUTOCOMPLETE_STORE);
    const seenKeys = new Set<string>();

    await autocompleteStore.clear();

    for (const word of words) {
        const displayName = word.replace(/\s+/g, " ").trim();
        const key = normalizeOfflineSearchKey(displayName);

        if (!key || seenKeys.has(key)) {
            continue;
        }

        seenKeys.add(key);
        await autocompleteStore.put({
            key,
            displayName,
        } satisfies AutocompleteWord);
    }

    const currentMetadata = await tx.objectStore(METADATA_STORE).get(OFFLINE_METADATA_KEY);
    await tx.objectStore(METADATA_STORE).put(
        {
            ...getDefaultMetadata(),
            ...(currentMetadata ?? {}),
            schemaVersion: OFFLINE_SCHEMA_VERSION,
            autocompleteVersion: newVersion,
        },
        OFFLINE_METADATA_KEY,
    );

    await tx.done;
}

export async function searchAutocompleteOffline(
    query: string,
    limit = 10,
): Promise<string[]> {
    const prefix = normalizeOfflineSearchKey(query);

    if (prefix.length < 2) {
        return [];
    }

    const db = await getDb();
    const autocompleteResults: string[] = [];
    const autocompleteRange = IDBKeyRange.bound(prefix, `${prefix}\uffff`);
    const autocompleteTx = db.transaction(AUTOCOMPLETE_STORE, "readonly");
    const autocompleteIndex = autocompleteTx.store.index(AUTOCOMPLETE_NAME_INDEX);
    let autocompleteCursor = await autocompleteIndex.openCursor(autocompleteRange);

    while (autocompleteCursor && autocompleteResults.length < limit) {
        autocompleteResults.push(autocompleteCursor.value.displayName);
        autocompleteCursor = await autocompleteCursor.continue();
    }

    await autocompleteTx.done;

    if (autocompleteResults.length > 0) {
        return autocompleteResults;
    }

    const metadata = await getOfflineMetadata();

    if (!metadata.activeVersion) {
        return [];
    }

    const range = IDBKeyRange.bound(
        `${metadata.activeVersion}${DATASET_KEY_SEPARATOR}${prefix}`,
        `${metadata.activeVersion}${DATASET_KEY_SEPARATOR}${prefix}\uffff`,
    );
    const tx = db.transaction(WORDS_STORE, "readonly");
    const index = tx.store.index(WORD_DATASET_SORT_INDEX);
    const results = new Map<string, string>();
    let cursor = await index.openCursor(range);

    while (cursor && results.size < limit) {
        const word = cursor.value;
        results.set(word.lookupKey, word.wordName);
        cursor = await cursor.continue();
    }

    await tx.done;

    return Array.from(results.values());
}

export const getCachedPopularData = async (
    key: string,
): Promise<CachedPopularData | undefined> => {
    const db = await getDb();
    return db.get(POPULAR_TRENDS_STORE, key);
};

export const setCachedPopularData = async (
    key: string,
    data: PopularWord[],
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
    limit = 20,
): Promise<WordData[]> => {
    const metadata = await getOfflineMetadata();
    const normalizedPattern = normalizeOfflineSearchKey(pattern);

    if (!metadata.activeVersion || normalizedPattern.length < 2) {
        return [];
    }

    const escapedPattern = normalizedPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`^${escapedPattern.replace(/_/g, ".")}$`, "u");
    const firstUnderscoreIndex = normalizedPattern.indexOf("_");
    const prefix =
        firstUnderscoreIndex > 0
            ? normalizedPattern.substring(0, firstUnderscoreIndex)
            : "";

    const db = await getDb();
    const tx = db.transaction(WORDS_STORE, "readonly");
    const index = tx.store.index(WORD_DATASET_SORT_INDEX);
    const range = IDBKeyRange.bound(
        `${metadata.activeVersion}${DATASET_KEY_SEPARATOR}${prefix}`,
        `${metadata.activeVersion}${DATASET_KEY_SEPARATOR}${prefix}\uffff`,
    );
    const results: WordData[] = [];
    let cursor = await index.openCursor(range);

    while (cursor && results.length < limit) {
        if (regex.test(cursor.value.lookupKey)) {
            results.push(cursor.value.word);
        }

        cursor = await cursor.continue();
    }

    await tx.done;

    return results;
};

export const resetOfflineDbForTests = async (): Promise<void> => {
    if (dbPromise) {
        const db = await dbPromise.catch(() => null);
        db?.close();
    }

    dbPromise = null;
    await deleteDB(DB_NAME);
};
