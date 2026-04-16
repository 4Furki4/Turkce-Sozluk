import type { BuilderSelection, TenseSuffixDefinition } from "./suffixes";

const TR_LOCALE = "tr-TR";
const VOWELS = new Set(["a", "e", "ı", "i", "o", "ö", "u", "ü"]);
const AORIST_I_TYPE_EXCEPTIONS = new Set([
    "al",
    "bil",
    "bul",
    "dur",
    "gel",
    "gör",
    "kal",
    "ol",
    "öl",
    "san",
    "var",
    "ver",
    "vur",
]);

export function selectAoristFormula(
    word: string,
    selection: BuilderSelection,
    tense: TenseSuffixDefinition,
): string {
    if (selection.negation === "negation") {
        return isNegativeAoristWithoutZ(selection) ? "" : "z";
    }

    if (endsWithVowel(word)) {
        return tense.formula;
    }

    return usesITypeAorist(word) ? tense.alternateFormula ?? tense.formula : "Ar";
}

export function isNegativeAoristWithoutZ(selection: BuilderSelection): boolean {
    if (selection.tense !== "aorist" || selection.negation !== "negation" || selection.question) {
        return false;
    }

    return selection.person === "ben" || selection.person === "biz";
}

function usesITypeAorist(word: string): boolean {
    const lowerWord = toTurkishLower(word);
    return countSyllables(lowerWord) > 1 || AORIST_I_TYPE_EXCEPTIONS.has(lowerWord);
}

function endsWithVowel(word: string): boolean {
    const lastChar = word[word.length - 1];
    return Boolean(lastChar && VOWELS.has(lastChar));
}

function countSyllables(word: string): number {
    let total = 0;

    for (const char of word) {
        if (VOWELS.has(char)) {
            total += 1;
        }
    }

    return total;
}

function toTurkishLower(value: string): string {
    return value.toLocaleLowerCase(TR_LOCALE);
}
