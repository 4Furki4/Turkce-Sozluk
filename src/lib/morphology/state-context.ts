import {
  type ContinuationPolicy,
  type MorphCategory,
  type MorphologicalPhase,
  type PartOfSpeech,
  type SuffixKind,
} from "./types";

type ContextInput = {
  category: MorphCategory;
  pos: PartOfSpeech;
  phase: MorphologicalPhase;
};

export function createMorphCategoryFromPos(pos: PartOfSpeech): MorphCategory {
  return pos;
}

export function resolveNextMorphCategory(
  currentCategory: MorphCategory,
  targetCategory: MorphCategory,
  kind: SuffixKind,
): MorphCategory {
  if (kind === "inflectional" && currentCategory !== targetCategory) {
    return targetCategory;
  }

  if (kind === "derivational") {
    return targetCategory;
  }

  if (kind === "nonfinite") {
    return targetCategory;
  }

  if (kind === "analytic") {
    return targetCategory;
  }

  return currentCategory;
}

export function createContinuationPolicy({
  category,
  pos,
  phase,
}: ContextInput): ContinuationPolicy {
  switch (category) {
    case "Noun":
      return {
        allowDerivation: phase === "derivation",
        allowInflection: true,
        allowFiniteVerbInflection: false,
        allowNominalInflection: true,
        allowPredicativeInflection: true,
        allowNonfinite: false,
        allowAnalyticConstructions: false,
        allowPostFinite: true,
      };
    case "Verb":
      return {
        allowDerivation: phase === "derivation",
        allowInflection: true,
        allowFiniteVerbInflection: pos === "Verb",
        allowNominalInflection: false,
        allowPredicativeInflection: false,
        allowNonfinite: phase !== "postfinite",
        allowAnalyticConstructions: phase === "derivation",
        allowPostFinite: true,
      };
    case "Adjective":
      return {
        allowDerivation: phase === "derivation",
        allowInflection: false,
        allowFiniteVerbInflection: false,
        allowNominalInflection: false,
        allowPredicativeInflection: true,
        allowNonfinite: false,
        allowAnalyticConstructions: false,
        allowPostFinite: true,
      };
    case "Adverb":
      return {
        allowDerivation: false,
        allowInflection: false,
        allowFiniteVerbInflection: false,
        allowNominalInflection: false,
        allowPredicativeInflection: false,
        allowNonfinite: false,
        allowAnalyticConstructions: false,
        allowPostFinite: false,
      };
    case "VerbalNoun":
      return {
        allowDerivation: false,
        allowInflection: true,
        allowFiniteVerbInflection: false,
        allowNominalInflection: true,
        allowPredicativeInflection: true,
        allowNonfinite: false,
        allowAnalyticConstructions: false,
        allowPostFinite: true,
      };
    case "Participle":
      return {
        allowDerivation: false,
        allowInflection: true,
        allowFiniteVerbInflection: false,
        allowNominalInflection: true,
        allowPredicativeInflection: true,
        allowNonfinite: false,
        allowAnalyticConstructions: false,
        allowPostFinite: true,
      };
    case "Converb":
      return {
        allowDerivation: false,
        allowInflection: false,
        allowFiniteVerbInflection: false,
        allowNominalInflection: false,
        allowPredicativeInflection: false,
        allowNonfinite: false,
        allowAnalyticConstructions: false,
        allowPostFinite: false,
      };
    case "Predicative":
      return {
        allowDerivation: false,
        allowInflection: false,
        allowFiniteVerbInflection: false,
        allowNominalInflection: false,
        allowPredicativeInflection: true,
        allowNonfinite: false,
        allowAnalyticConstructions: false,
        allowPostFinite: true,
      };
    default:
      return {
        allowDerivation: false,
        allowInflection: false,
        allowFiniteVerbInflection: false,
        allowNominalInflection: false,
        allowPredicativeInflection: false,
        allowNonfinite: false,
        allowAnalyticConstructions: false,
        allowPostFinite: false,
      };
  }
}

export function createStateContext(
  pos: PartOfSpeech,
  phase: MorphologicalPhase,
  category: MorphCategory = createMorphCategoryFromPos(pos),
) {
  return {
    currentPos: pos,
    currentCategory: category,
    continuation: createContinuationPolicy({
      category,
      pos,
      phase,
    }),
  };
}
