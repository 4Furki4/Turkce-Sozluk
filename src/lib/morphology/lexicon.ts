import {
  type FeatureBundle,
  type LexemeEntry,
  type PartOfSpeech,
  type RootLexeme,
} from "./types";

const KNOWN_LEXEME_OVERRIDES: Record<string, Partial<LexemeEntry>> = {
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
  "Verb:et": {
    irregularClass: "vowel_initial_stem_alternation",
    mutationPolicy: "always",
  },
};

function createLexemeKey(pos: PartOfSpeech, lemma: string) {
  return `${pos}:${lemma}`;
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
  const key = createLexemeKey(root.pos, lemma);
  const knownOverride = KNOWN_LEXEME_OVERRIDES[key] ?? {};

  return {
    id: key,
    lemma,
    rootSurface: lemma,
    pos: root.pos,
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
