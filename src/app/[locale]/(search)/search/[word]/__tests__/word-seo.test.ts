import { buildWordMetadata, buildWordNotFoundMetadata } from "../word-seo";
import type { WordSearchResult } from "@/types";

const wordData: WordSearchResult["word_data"] = {
    word_id: 1,
    word_name: "kitap",
    phonetic: "kita:p",
    prefix: "",
    suffix: "",
    view_count: 1530,
    attributes: [{ attribute_id: 1, attribute: "güncel" }],
    root: {
        root: "kitāb",
        language_en: "Arabic",
        language_tr: "Arapça",
        language_code: "ar",
    },
    meanings: [
        {
            meaning_id: 10,
            meaning: "Ciltli veya ciltsiz olarak bir araya getirilmiş, basılı veya yazılı kâğıt yaprakların bütünü; betik",
            imageUrl: null,
            part_of_speech: "isim",
            part_of_speech_id: 1,
            sentence: "Kitap düşüncenin yolunu açar.",
            author: "Örnek Yazar",
            author_id: 2,
            attributes: [{ attribute_id: 2, attribute: "mecaz" }],
        },
    ],
    relatedWords: [
        {
            related_word_id: 20,
            related_word_name: "kitaplık",
            relation_type: "relatedWord",
        },
    ],
    relatedPhrases: [
        {
            related_phrase_id: 30,
            related_phrase: "kitaba el basmak",
        },
    ],
};

describe("word SEO metadata", () => {
    it("keeps missing word metadata noindexed", () => {
        const metadata = buildWordNotFoundMetadata("bulunamayan", "tr");

        expect(metadata.robots).toEqual({
            index: false,
            follow: false,
        });
    });

    it("uses the resolved database word name for canonical metadata", () => {
        const metadata = buildWordMetadata("KİTAP", "tr", wordData);

        expect(metadata.alternates?.canonical).toBe("https://turkce-sozluk.com/tr/arama/kitap");
        expect(metadata.robots).toMatchObject({
            index: true,
            follow: true,
        });
    });
});
