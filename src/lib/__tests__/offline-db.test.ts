import "fake-indexeddb/auto";

import { encode } from "@msgpack/msgpack";

import {
    getDatasetLookupKey,
    getOfflineMetadata,
    getWordByNameOffline,
    installOfflineDatasetFromFiles,
    normalizeOfflineSearchKey,
    resetOfflineDbForTests,
    searchAutocompleteOffline,
    searchByPattern,
    toOfflineWordRecord,
} from "@/src/lib/offline-db";
import type { WordData } from "@/src/lib/db-config";

const makeWord = (word_id: number, word_name: string): WordData => ({
    word_id,
    word_name,
    phonetic: "",
    prefix: "",
    suffix: "",
    view_count: 0,
    attributes: [],
    root: {
        root: "",
        language_en: "",
        language_tr: "",
        language_code: "",
    },
    meanings: [
        {
            meaning_id: word_id,
            meaning: `${word_name} meaning`,
            imageUrl: null,
            part_of_speech: "isim",
            sentence: undefined,
            author: undefined,
            author_id: undefined,
            attributes: [],
        },
    ],
    relatedWords: [],
    relatedPhrases: [],
});

const msgpackResponse = (words: WordData[]) => {
    const bytes = encode(words);
    const body = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
    );

    return {
        ok: true,
        arrayBuffer: async () => body,
    };
};

describe("offline dictionary database", () => {
    beforeEach(async () => {
        await resetOfflineDbForTests();
        jest.restoreAllMocks();
        global.fetch = jest.fn() as unknown as typeof fetch;
    });

    afterEach(async () => {
        await resetOfflineDbForTests();
        jest.restoreAllMocks();
        delete (global as typeof globalThis & { fetch?: typeof fetch }).fetch;
    });

    it("normalizes Turkish lookup keys and builds dataset lookup records", () => {
        expect(normalizeOfflineSearchKey("  İSTANBUL   IŞIK  ")).toBe("istanbul ışık");

        const record = toOfflineWordRecord(123, makeWord(7, "İstanbul"));

        expect(record.lookupKey).toBe("istanbul");
        expect(record.datasetLookupKey).toBe(getDatasetLookupKey(123, "istanbul"));
        expect(record.id).toBe("123:7");
    });

    it("installs a versioned dataset and supports exact plus prefix search", async () => {
        jest.spyOn(global, "fetch").mockResolvedValue(
            msgpackResponse([
                makeWord(1, "kalem"),
                makeWord(2, "kapı"),
                makeWord(3, "kitap"),
            ]) as unknown as Response,
        );

        await installOfflineDatasetFromFiles({
            manifest: {
                version: 100,
                files: ["words.msgpack"],
                totalSize: 1234,
            },
            baseUrl: "https://data.test/offline-data",
        });

        await expect(getWordByNameOffline(" KİTAP ")).resolves.toMatchObject({
            word_name: "kitap",
        });
        await expect(searchAutocompleteOffline("ka")).resolves.toEqual([
            "kalem",
            "kapı",
        ]);
        await expect(getOfflineMetadata()).resolves.toMatchObject({
            activeVersion: 100,
            status: "ready",
            installedWordCount: 3,
            totalSize: 1234,
        });
    });

    it("supports underscore pattern search against the active offline dataset", async () => {
        jest.spyOn(global, "fetch").mockResolvedValue(
            msgpackResponse([
                makeWord(1, "kalem"),
                makeWord(2, "kelam"),
                makeWord(3, "kitap"),
            ]) as unknown as Response,
        );

        await installOfflineDatasetFromFiles({
            manifest: {
                version: 200,
                files: ["words.msgpack"],
            },
            baseUrl: "https://data.test/offline-data",
        });

        await expect(searchByPattern("k_l_m")).resolves.toEqual(
            expect.arrayContaining([
                expect.objectContaining({ word_name: "kalem" }),
                expect.objectContaining({ word_name: "kelam" }),
            ]),
        );
        await expect(searchByPattern("k_tap")).resolves.toEqual([
            expect.objectContaining({ word_name: "kitap" }),
        ]);
    });

    it("reports no local matches when the offline dataset has not been installed", async () => {
        await expect(getOfflineMetadata()).resolves.toMatchObject({
            activeVersion: null,
            status: "not-downloaded",
        });
        await expect(getWordByNameOffline("susuz")).resolves.toBeUndefined();
        await expect(searchAutocompleteOffline("su")).resolves.toEqual([]);
        await expect(searchByPattern("s_suz")).resolves.toEqual([]);
    });

    it("keeps the previous active dataset when an update fails", async () => {
        const fetchMock = jest.spyOn(global, "fetch");
        fetchMock.mockResolvedValueOnce(
            msgpackResponse([makeWord(1, "kalem")]) as unknown as Response,
        );

        await installOfflineDatasetFromFiles({
            manifest: {
                version: 300,
                files: ["v1.msgpack"],
            },
            baseUrl: "https://data.test/offline-data",
        });

        fetchMock.mockResolvedValueOnce({
            ok: false,
            arrayBuffer: async () => new ArrayBuffer(0),
        } as unknown as Response);

        await expect(
            installOfflineDatasetFromFiles({
                manifest: {
                    version: 301,
                    files: ["v2.msgpack"],
                },
                baseUrl: "https://data.test/offline-data",
            }),
        ).rejects.toThrow("Failed to download file: v2.msgpack");

        await expect(getOfflineMetadata()).resolves.toMatchObject({
            activeVersion: 300,
            status: "failed",
            installedWordCount: 1,
        });
        await expect(getWordByNameOffline("kalem")).resolves.toMatchObject({
            word_name: "kalem",
        });
    });
});
