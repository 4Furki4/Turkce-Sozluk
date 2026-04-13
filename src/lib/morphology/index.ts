export { TurkishMorphologyEngine } from "./engine";
export { TurkishMorphologyEngineV2 } from "./engine-v2";
export { ANALYTIC_CONSTRUCTION_CATALOG } from "./analytic-catalog";
export { createDefaultFeatureBundle, createLexemeEntryFromRoot } from "./lexicon";
export { MORPHEME_CATALOG } from "./morpheme-catalog";
export { getAvailableMorphologyActions, getSlotTranslationKey } from "./morphotactics";
export { buildTraceDiff, realizeMorphologicalState } from "./realization-v2";
export {
  createContinuationPolicy,
  createMorphCategoryFromPos,
  createStateContext,
  resolveNextMorphCategory,
} from "./state-context";
export {
  buildHighlightDiff,
  countSyllables,
  endsWithVowel,
  findLastVowel,
  realizeAffix,
  realizeSuffix,
  resolveFourWayHarmony,
  resolveTwoWayHarmony,
} from "./phonology";
export { DEFAULT_SUFFIX_CATALOG } from "./suffix-catalog";
export type {
  AgreementFeature,
  AnalyticConstructionDefinition,
  AnalyticConstructionToken,
  AnalyticConstructionType,
  BuildResult,
  BuildStep,
  CaseFeature,
  ContinuationPolicy,
  DiffSegment,
  FeatureBundle,
  HarmonyType,
  HighlightDiff,
  LexemeEntry,
  LexemeOrigin,
  MorphCategory,
  MorphemeCategory,
  MorphemeDefinition,
  MorphemeSlot,
  MorphemeToken,
  MorphToken,
  MorphologicalAction,
  MorphologicalPhase,
  MorphologicalState,
  MorphologicalStateV2,
  MorphologyAttestation,
  MorphologyEvent,
  MorphologyEventCode,
  MorphologyHistoryEntry,
  MorphologyStage,
  MutationPolicy,
  NounNumberFeature,
  PartOfSpeech,
  PhonologyEvent,
  PhonologyEventType,
  PolarityFeature,
  PossessiveFeature,
  RealizationResult,
  RealizationSegment,
  RealizationTrace,
  RootLexeme,
  RuleId,
  SuffixDefinition,
  SuffixKind,
  TamFeature,
  TransformationLog,
} from "./types";
