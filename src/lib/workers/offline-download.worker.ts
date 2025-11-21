import { openDB } from "idb";
import { decode } from "@msgpack/msgpack";
import {
    DB_NAME,
    DB_VERSION,
    WORDS_STORE,
    METADATA_STORE,
    WORD_NAME_INDEX,
    AUTOCOMPLETE_STORE,
    AUTOCOMPLETE_NAME_INDEX,
    POPULAR_TRENDS_STORE,
    OfflineDB,
    WordData
} from "../db-config";

// Define message types
type WorkerMessage =
    | { type: 'START_DOWNLOAD'; files: string[]; baseUrl: string }
    | { type: 'CLEAR_DATA' };

type WorkerResponse =
    | { type: 'PROGRESS'; progress: number }
    | { type: 'COMPLETE' }
    | { type: 'ERROR'; error: string }
    | { type: 'CLEARED' };

const getDb = () => {
    return openDB<OfflineDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
            // We don't need upgrade logic here as it's handled in the main thread or shared config
            // But idb requires it if we open a version higher than current.
            // Ideally, we rely on the main thread to handle upgrades/initialization 
            // OR we duplicate the upgrade logic from db-config if we want the worker to be able to init DB.
            // For now, let's assume the main thread handles the structure or we copy the logic.
            // To be safe and self-contained, let's copy the upgrade logic.
            console.log(`[Worker] Upgrading database from version ${oldVersion} to ${newVersion}...`);

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
                const store = db.createObjectStore(AUTOCOMPLETE_STORE, { keyPath: "key" });
                store.createIndex(AUTOCOMPLETE_NAME_INDEX, "key", { unique: true });
            }
            if (oldVersion < 5) {
                if (!db.objectStoreNames.contains(POPULAR_TRENDS_STORE)) {
                    db.createObjectStore(POPULAR_TRENDS_STORE, { keyPath: "key" });
                }
            }
        },
    });
};

const processWordFile = async (fileUrl: string) => {
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
                continue;
            }
            await tx.store.put(word);
        } catch (error) {
            console.error("Failed to store word:", word, error);
        }
    }

    await tx.done;
};

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type } = event.data;

    try {
        if (type === 'START_DOWNLOAD') {
            const { files, baseUrl } = event.data;
            const db = await getDb();

            // Clear words store before starting (optional, but good practice if full re-download)
            // But usually we might want to clear explicitly. 
            // The client logic clears before calling download.

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                await processWordFile(`${baseUrl}/${file}`);

                const progress = ((i + 1) / files.length) * 100;
                self.postMessage({ type: 'PROGRESS', progress } as WorkerResponse);
            }

            self.postMessage({ type: 'COMPLETE' } as WorkerResponse);
        } else if (type === 'CLEAR_DATA') {
            const db = await getDb();
            const tx = db.transaction([WORDS_STORE, METADATA_STORE], "readwrite");
            await tx.objectStore(WORDS_STORE).clear();
            await tx.objectStore(METADATA_STORE).clear();
            await tx.done;
            self.postMessage({ type: 'CLEARED' } as WorkerResponse);
        }
    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            error: error instanceof Error ? error.message : String(error)
        } as WorkerResponse);
    }
};
