export const CATEGORY_ORDER = ["negation", "tense", "person", "question"] as const;

export type SuffixCategory = (typeof CATEGORY_ORDER)[number];
export type PersonEndingType = "type1" | "type2" | "imperative";

export type NegationId = "negation";
export type TenseId =
    | "future"
    | "pastSeen"
    | "pastHeard"
    | "presentContinuous"
    | "aorist"
    | "imperative";
export type PersonId = "ben" | "sen" | "o" | "biz" | "siz" | "onlar";
export type QuestionId = "question";

export interface BuilderSelection {
    negation: NegationId | null;
    tense: TenseId | null;
    person: PersonId | null;
    question: boolean;
}

interface BaseSuffixDefinition<TId extends string, TCategory extends SuffixCategory> {
    id: TId;
    category: TCategory;
    label: string;
    description: string;
    abstractDisplay: string;
}

export interface NegationSuffixDefinition
    extends BaseSuffixDefinition<NegationId, "negation"> {
    formula: "mA";
}

export interface TenseSuffixDefinition extends BaseSuffixDefinition<TenseId, "tense"> {
    formula: string;
    alternateFormula?: string;
    personEndingType: PersonEndingType;
    stemTransform?: "dropFinalVowel";
    supportsNegation?: boolean;
}

export interface PersonSuffixDefinition extends BaseSuffixDefinition<PersonId, "person"> {
    formulas: Record<PersonEndingType, string>;
}

export interface QuestionSuffixDefinition
    extends BaseSuffixDefinition<QuestionId, "question"> {
    formula: "mI";
    attachMode: "separate";
}

export const DEFAULT_SELECTION: BuilderSelection = {
    negation: null,
    tense: null,
    person: null,
    question: false,
};

export const NEGATION_SUFFIXES: readonly NegationSuffixDefinition[] = [
    {
        id: "negation",
        category: "negation",
        label: "Negation",
        description: "Makes the verb negative before tense is added.",
        abstractDisplay: "-mA",
        formula: "mA",
    },
] as const;

export const TENSE_SUFFIXES: readonly TenseSuffixDefinition[] = [
    {
        id: "future",
        category: "tense",
        label: "Future",
        description: "Planned or expected action.",
        abstractDisplay: "-yAcAk",
        formula: "yAcAk",
        personEndingType: "type1",
        supportsNegation: true,
    },
    {
        id: "pastSeen",
        category: "tense",
        label: "Past (Seen)",
        description: "Directly witnessed past action.",
        abstractDisplay: "-DI",
        formula: "DI",
        personEndingType: "type2",
        supportsNegation: true,
    },
    {
        id: "pastHeard",
        category: "tense",
        label: "Past (Heard)",
        description: "Reported or inferred past action.",
        abstractDisplay: "-mIş",
        formula: "mIş",
        personEndingType: "type1",
        supportsNegation: true,
    },
    {
        id: "presentContinuous",
        category: "tense",
        label: "Continuous",
        description: "Action happening now.",
        abstractDisplay: "-Iyor",
        formula: "Iyor",
        personEndingType: "type1",
        stemTransform: "dropFinalVowel",
        supportsNegation: true,
    },
    {
        id: "aorist",
        category: "tense",
        label: "Aorist",
        description: "Habitual or general present.",
        abstractDisplay: "-r / -Ar / -Ir",
        formula: "r",
        alternateFormula: "Ir",
        personEndingType: "type1",
        supportsNegation: true,
    },
    {
        id: "imperative",
        category: "tense",
        label: "Imperative",
        description: "Commands, requests, and exhortations.",
        abstractDisplay: "no tense suffix",
        formula: "",
        personEndingType: "imperative",
        supportsNegation: true,
    },
] as const;

export const PERSON_SUFFIXES: readonly PersonSuffixDefinition[] = [
    {
        id: "ben",
        category: "person",
        label: "Ben",
        description: "1st person singular.",
        abstractDisplay: "-yIm / -m",
        formulas: {
            type1: "yIm",
            type2: "m",
            imperative: "",
        },
    },
    {
        id: "sen",
        category: "person",
        label: "Sen",
        description: "2nd person singular.",
        abstractDisplay: "-sIn / -n",
        formulas: {
            type1: "sIn",
            type2: "n",
            imperative: "",
        },
    },
    {
        id: "o",
        category: "person",
        label: "O",
        description: "3rd person singular.",
        abstractDisplay: "no suffix / -sIn",
        formulas: {
            type1: "",
            type2: "",
            imperative: "sIn",
        },
    },
    {
        id: "biz",
        category: "person",
        label: "Biz",
        description: "1st person plural.",
        abstractDisplay: "-yIz / -k / -(y)AlIm",
        formulas: {
            type1: "yIz",
            type2: "k",
            imperative: "yAlIm",
        },
    },
    {
        id: "siz",
        category: "person",
        label: "Siz",
        description: "2nd person plural.",
        abstractDisplay: "-sInIz / -nIz / -(y)In",
        formulas: {
            type1: "sInIz",
            type2: "nIz",
            imperative: "yIn",
        },
    },
    {
        id: "onlar",
        category: "person",
        label: "Onlar",
        description: "3rd person plural.",
        abstractDisplay: "-lAr / -sInlAr",
        formulas: {
            type1: "lAr",
            type2: "lAr",
            imperative: "sInlAr",
        },
    },
] as const;

export const QUESTION_SUFFIXES: readonly QuestionSuffixDefinition[] = [
    {
        id: "question",
        category: "question",
        label: "Question",
        description: "Turns the built form into a yes/no question.",
        abstractDisplay: "-mI",
        formula: "mI",
        attachMode: "separate",
    },
] as const;

export const CATEGORY_LABELS: Record<SuffixCategory | "root", string> = {
    root: "Kok",
    negation: "Olumsuzluk",
    tense: "Zaman",
    person: "Kisi",
    question: "Soru",
};

export const PAST_SEEN_TENSE_ID: TenseId = "pastSeen";
