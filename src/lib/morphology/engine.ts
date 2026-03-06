import {
    CATEGORY_LABELS,
    DEFAULT_SELECTION,
    NEGATION_SUFFIXES,
    PAST_SEEN_TENSE_ID,
    PERSON_SUFFIXES,
    QUESTION_SUFFIXES,
    TENSE_SUFFIXES,
    type BuilderSelection,
    type PersonEndingType,
    type PersonId,
    type PersonSuffixDefinition,
    type QuestionSuffixDefinition,
    type TenseId,
    type TenseSuffixDefinition,
} from "./suffixes";

const TR_LOCALE = "tr-TR";
const VOWELS = new Set(["a", "e", "ı", "i", "o", "ö", "u", "ü"]);
const BACK_VOWELS = new Set(["a", "ı", "o", "u"]);
const HARD_CONSONANTS = new Set(["f", "s", "t", "k", "ç", "ş", "h", "p"]);
const SOFTENING_MAP: Record<string, string> = {
    p: "b",
    ç: "c",
    t: "d",
    k: "ğ",
};
const SOFTENING_EXCEPTIONS = new Set(["et", "git", "tat"]);
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

export interface ConjugationPart {
    category: "root" | "negation" | "tense" | "person" | "question";
    id: string;
    label: string;
    formula: string;
    surface: string;
    displaySurface: string;
    result: string;
}

export interface ConjugationResult {
    word: string;
    normalizedRoot: string;
    parts: ConjugationPart[];
}

interface AppliedSurface {
    nextWord: string;
    surface: string;
    displaySurface: string;
}

export function normalizeVerbRoot(input: string): string {
    return input.trim().replace(/\s+/g, "");
}

export function getPersonEndingType(tenseId: TenseId | null): PersonEndingType {
    return tenseId === PAST_SEEN_TENSE_ID ? "type2" : "type1";
}

export function buildVerbConjugation(
    rootInput: string,
    selection: Partial<BuilderSelection> = {},
): ConjugationResult {
    const resolvedSelection: BuilderSelection = {
        ...DEFAULT_SELECTION,
        ...selection,
    };
    const normalizedRoot = normalizeVerbRoot(rootInput);

    if (!normalizedRoot) {
        return {
            word: "",
            normalizedRoot: "",
            parts: [],
        };
    }

    const baseWord = toTurkishLower(normalizedRoot);
    const parts: ConjugationPart[] = [
        {
            category: "root",
            id: "root",
            label: CATEGORY_LABELS.root,
            formula: normalizedRoot,
            surface: baseWord,
            displaySurface: preserveInputCase(normalizedRoot, baseWord),
            result: baseWord,
        },
    ];

    let currentWord = baseWord;

    if (resolvedSelection.negation) {
        const negation = NEGATION_SUFFIXES[0];
        const applied = applyAttachedSuffix(currentWord, negation.formula);
        currentWord = applied.nextWord;
        parts.push(createPart("negation", negation.id, negation.abstractDisplay, applied));
    }

    const tense = resolvedSelection.tense
        ? TENSE_SUFFIXES.find((item) => item.id === resolvedSelection.tense) ?? null
        : null;

    if (tense) {
        const applied = applyAttachedSuffix(
            currentWord,
            selectTenseFormula(currentWord, tense, resolvedSelection),
            tense.stemTransform,
        );
        currentWord = applied.nextWord;
        parts.push(createPart("tense", tense.id, tense.abstractDisplay, applied));
    }

    const shouldMovePersonToQuestion =
        Boolean(tense && resolvedSelection.question && resolvedSelection.person) &&
        shouldAttachPersonToQuestion(
            resolvedSelection.person as PersonId,
            getPersonEndingType(tense?.id ?? null),
        );

    if (tense && resolvedSelection.person && !shouldMovePersonToQuestion) {
        const person = PERSON_SUFFIXES.find((item) => item.id === resolvedSelection.person);

        if (person) {
            const formula = selectPersonFormula(person, tense.id, resolvedSelection);
            if (formula) {
                const applied = applyAttachedSuffix(currentWord, formula);
                currentWord = applied.nextWord;
                parts.push(createPart("person", person.id, person.abstractDisplay, applied));
            } else {
                parts.push({
                    category: "person",
                    id: person.id,
                    label: CATEGORY_LABELS.person,
                    formula: person.abstractDisplay,
                    surface: "",
                    displaySurface: "no suffix",
                    result: currentWord,
                });
            }
        }
    }

    if (tense && resolvedSelection.question) {
        const question = QUESTION_SUFFIXES[0];
        const applied = applyQuestionParticle(currentWord, question);
        currentWord = applied.nextWord;
        parts.push(createPart("question", question.id, question.abstractDisplay, applied));
    }

    if (tense && resolvedSelection.person && shouldMovePersonToQuestion) {
        const person = PERSON_SUFFIXES.find((item) => item.id === resolvedSelection.person);

        if (person) {
            const formula = selectPersonFormula(person, tense.id, resolvedSelection);
            if (formula) {
                const applied = applyAttachedSuffix(currentWord, formula);
                currentWord = applied.nextWord;
                parts.push(createPart("person", person.id, person.abstractDisplay, applied));
            }
        }
    }

    return {
        word: preserveInputCase(normalizedRoot, currentWord),
        normalizedRoot,
        parts,
    };
}

function createPart(
    category: ConjugationPart["category"],
    id: string,
    abstractDisplay: string,
    applied: AppliedSurface,
): ConjugationPart {
    return {
        category,
        id,
        label: CATEGORY_LABELS[category],
        formula: abstractDisplay,
        surface: applied.surface,
        displaySurface: applied.displaySurface,
        result: applied.nextWord,
    };
}

function selectTenseFormula(
    word: string,
    tense: TenseSuffixDefinition,
    selection: BuilderSelection,
): string {
    if (tense.id === "aorist") {
        return selectAoristFormula(word, selection, tense);
    }

    return tense.formula;
}

function selectPersonFormula(
    person: PersonSuffixDefinition,
    tenseId: TenseId,
    selection: BuilderSelection,
): string {
    if (isNegativeAoristWithoutZ(selection) && person.id === "ben") {
        return "m";
    }

    return person.formulas[getPersonEndingType(tenseId)];
}

function shouldAttachPersonToQuestion(
    personId: PersonId,
    endingType: PersonEndingType,
): boolean {
    if (endingType !== "type1") {
        return false;
    }

    return personId === "ben" || personId === "sen" || personId === "biz" || personId === "siz";
}

function applyQuestionParticle(
    word: string,
    suffix: QuestionSuffixDefinition,
): AppliedSurface {
    const particle = materializeFormula(suffix.formula, getLastVowel(word));

    return {
        nextWord: `${word} ${particle}`,
        surface: particle,
        displaySurface: particle,
    };
}

function selectAoristFormula(
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

function isNegativeAoristWithoutZ(selection: BuilderSelection): boolean {
    if (selection.tense !== "aorist" || selection.negation !== "negation" || selection.question) {
        return false;
    }

    return selection.person === "ben" || selection.person === "biz";
}

function usesITypeAorist(word: string): boolean {
    const lowerWord = toTurkishLower(word);
    return countSyllables(lowerWord) > 1 || AORIST_I_TYPE_EXCEPTIONS.has(lowerWord);
}

function applyAttachedSuffix(
    inputWord: string,
    formula: string,
    stemTransform?: TenseSuffixDefinition["stemTransform"],
): AppliedSurface {
    let stem = inputWord;

    if (stemTransform === "dropFinalVowel" && endsWithVowel(stem)) {
        stem = stem.slice(0, -1);
    }

    let workingFormula = formula;
    if (workingFormula.startsWith("y") && !endsWithVowel(stem)) {
        workingFormula = workingFormula.slice(1);
    }

    if (startsWithResolvedVowel(workingFormula) && shouldApplySoftening(stem)) {
        stem = softenStem(stem);
    }

    const resolved = materializeFormula(workingFormula, getLastVowel(stem));
    const assimilated = applyConsonantAssimilation(stem, resolved);
    const nextWord = `${stem}${assimilated}`;

    return {
        nextWord,
        surface: assimilated,
        displaySurface: assimilated ? `-${assimilated}` : "no suffix",
    };
}

function materializeFormula(formula: string, lastVowel: string | null): string {
    let surface = "";

    for (const char of formula) {
        switch (char) {
            case "A":
                surface += resolveAType(lastVowel);
                break;
            case "I":
                surface += resolveIType(lastVowel);
                break;
            case "D":
                surface += "d";
                break;
            case "C":
                surface += "c";
                break;
            default:
                surface += char;
                break;
        }
    }

    return surface;
}

function resolveAType(lastVowel: string | null): string {
    if (!lastVowel) {
        return "e";
    }

    return BACK_VOWELS.has(lastVowel) ? "a" : "e";
}

function resolveIType(lastVowel: string | null): string {
    switch (lastVowel) {
        case "a":
        case "ı":
            return "ı";
        case "e":
        case "i":
            return "i";
        case "o":
        case "u":
            return "u";
        case "ö":
        case "ü":
            return "ü";
        default:
            return "i";
    }
}

function applyConsonantAssimilation(stem: string, suffix: string): string {
    const lastChar = stem[stem.length - 1];
    if (!lastChar || !HARD_CONSONANTS.has(lastChar)) {
        return suffix;
    }

    const firstChar = suffix[0];
    if (!firstChar) {
        return suffix;
    }

    if (firstChar === "d") {
        return `t${suffix.slice(1)}`;
    }

    if (firstChar === "c") {
        return `ç${suffix.slice(1)}`;
    }

    if (firstChar === "g") {
        return `k${suffix.slice(1)}`;
    }

    return suffix;
}

function shouldApplySoftening(stem: string): boolean {
    const lastChar = stem[stem.length - 1];
    if (!lastChar || !(lastChar in SOFTENING_MAP)) {
        return false;
    }

    const lowerStem = toTurkishLower(stem);
    return countSyllables(lowerStem) > 1 || SOFTENING_EXCEPTIONS.has(lowerStem);
}

function softenStem(stem: string): string {
    const lastChar = stem[stem.length - 1];

    if (!lastChar) {
        return stem;
    }

    const softened = SOFTENING_MAP[lastChar];
    if (!softened) {
        return stem;
    }

    return `${stem.slice(0, -1)}${softened}`;
}

function startsWithResolvedVowel(formula: string): boolean {
    const firstChar = formula[0];
    if (!firstChar) {
        return false;
    }

    return firstChar === "A" || firstChar === "I" || VOWELS.has(firstChar);
}

function endsWithVowel(word: string): boolean {
    const lastChar = word[word.length - 1];
    return Boolean(lastChar && VOWELS.has(lastChar));
}

function getLastVowel(word: string): string | null {
    const lowerWord = toTurkishLower(word);

    for (let index = lowerWord.length - 1; index >= 0; index -= 1) {
        const char = lowerWord[index];
        if (VOWELS.has(char)) {
            return char;
        }
    }

    return null;
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

function preserveInputCase(source: string, surface: string): string {
    if (!source) {
        return surface;
    }

    if (source === source.toLocaleUpperCase(TR_LOCALE)) {
        return surface.toLocaleUpperCase(TR_LOCALE);
    }

    const firstChar = source[0];
    if (firstChar === firstChar.toLocaleUpperCase(TR_LOCALE)) {
        return `${surface.charAt(0).toLocaleUpperCase(TR_LOCALE)}${surface.slice(1)}`;
    }

    return surface;
}
