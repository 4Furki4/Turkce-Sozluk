export { TurkishMorphologyEngine } from "./engine";
export { buildHighlightDiff, countSyllables, findLastVowel, realizeSuffix } from "./phonology";
export { DEFAULT_SUFFIX_CATALOG } from "./suffix-catalog";
export type {
  BuildResult,
  BuildStep,
  DiffSegment,
  HarmonyType,
  HighlightDiff,
  MorphologicalPhase,
  MorphologicalState,
  PartOfSpeech,
  PhonologyEvent,
  PhonologyEventType,
  RootLexeme,
  RuleId,
  SuffixDefinition,
  SuffixKind,
  TransformationLog,
} from "./types";

