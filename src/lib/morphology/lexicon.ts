import {
  type FeatureBundle,
  type LexemeEntry,
  type LexemeInitialCategory,
  type PartOfSpeech,
  type RootLexeme,
} from "./types";

const KNOWN_LEXEME_OVERRIDES: Record<string, Partial<LexemeEntry>> = {
  "Verb:al": {
    irregularClass: "aor_irregular",
    allomorphOverrides: {
      "verb.tam.aor": "/Ir/",
    },
  },
  "Verb:bil": {
    irregularClass: "aor_irregular",
    allomorphOverrides: {
      "verb.tam.aor": "/Ir/",
    },
  },
  "Verb:bul": {
    irregularClass: "aor_irregular",
    allomorphOverrides: {
      "verb.tam.aor": "/Ir/",
    },
  },
  "Verb:dur": {
    irregularClass: "aor_irregular",
    allomorphOverrides: {
      "verb.tam.aor": "/Ir/",
    },
  },
  "Verb:gör": {
    irregularClass: "aor_irregular",
    allomorphOverrides: {
      "verb.tam.aor": "/Ir/",
    },
  },
  "Verb:gel": {
    irregularClass: "aor_irregular",
    allomorphOverrides: {
      "verb.tam.aor": "/Ir/",
    },
  },
  "Verb:ver": {
    irregularClass: "aor_irregular",
    allomorphOverrides: {
      "verb.tam.aor": "/Ir/",
    },
  },
  "Verb:git": {
    irregularClass: "vowel_initial_stem_alternation",
    mutationPolicy: "always",
  },
  "Verb:kal": {
    irregularClass: "aor_irregular",
    allomorphOverrides: {
      "verb.tam.aor": "/Ir/",
    },
  },
  "Verb:ol": {
    irregularClass: "aor_irregular",
    allomorphOverrides: {
      "verb.tam.aor": "/Ir/",
    },
  },
  "Verb:öl": {
    irregularClass: "aor_irregular",
    allomorphOverrides: {
      "verb.tam.aor": "/Ir/",
    },
  },
  "Verb:san": {
    irregularClass: "aor_irregular",
    allomorphOverrides: {
      "verb.tam.aor": "/Ir/",
    },
  },
  "Verb:et": {
    irregularClass: "vowel_initial_stem_alternation",
    mutationPolicy: "always",
  },
  "Verb:var": {
    irregularClass: "aor_irregular",
    allomorphOverrides: {
      "verb.tam.aor": "/Ir/",
    },
  },
  "Verb:vur": {
    irregularClass: "aor_irregular",
    allomorphOverrides: {
      "verb.tam.aor": "/Ir/",
    },
  },
};

function createLexemeKey(category: LexemeInitialCategory, lemma: string) {
  return `${category}:${lemma}`;
}

export function createDefaultFeatureBundle(): FeatureBundle {
  return {
    number: "sg",
    possessive: "none",
    case: "nom",
    polarity: "positive",
    tam: "bare",
    agreement: "none",
  };
}

export function createLexemeEntryFromRoot(root: RootLexeme): LexemeEntry {
  const lemma = root.surface.trim().toLocaleLowerCase("tr");
  const initialCategory = root.category ?? root.pos;
  const key = createLexemeKey(initialCategory, lemma);
  const knownOverride = KNOWN_LEXEME_OVERRIDES[key] ?? {};

  return {
    id: key,
    lemma,
    rootSurface: lemma,
    pos: root.pos,
    initialCategory,
    origin: root.origin ?? "native",
    mutationPolicy: root.forceConsonantMutation
      ? "always"
      : root.allowConsonantMutation === false
        ? "never"
        : "auto",
    mutationOverrides: root.mutationOverrides,
    ...knownOverride,
    allomorphOverrides: {
      ...knownOverride.allomorphOverrides,
    },
  };
}
