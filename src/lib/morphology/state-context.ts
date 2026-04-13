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
  if (kind === "derivational") {
    return targetCategory;
  }

  if (kind === "nonfinite") {
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
        allowNonfinite: false,
        allowAnalyticConstructions: false,
        allowPostFinite: phase === "postfinite",
      };
    case "Verb":
      return {
        allowDerivation: phase === "derivation",
        allowInflection: true,
        allowFiniteVerbInflection: pos === "Verb",
        allowNominalInflection: false,
        allowNonfinite: phase === "derivation",
        allowAnalyticConstructions: phase === "derivation",
        allowPostFinite: phase !== "derivation",
      };
    case "VerbalNoun":
      return {
        allowDerivation: false,
        allowInflection: true,
        allowFiniteVerbInflection: false,
        allowNominalInflection: true,
        allowNonfinite: false,
        allowAnalyticConstructions: false,
        allowPostFinite: false,
      };
    case "Participle":
      return {
        allowDerivation: false,
        allowInflection: true,
        allowFiniteVerbInflection: false,
        allowNominalInflection: true,
        allowNonfinite: false,
        allowAnalyticConstructions: false,
        allowPostFinite: false,
      };
    case "Converb":
      return {
        allowDerivation: false,
        allowInflection: false,
        allowFiniteVerbInflection: false,
        allowNominalInflection: false,
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
