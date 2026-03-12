export type PartOfSpeech = "Noun" | "Verb";

export type HarmonyType = "none" | "2-way" | "4-way";

export type MorphologicalPhase = "derivation" | "inflection";

export type SuffixKind = "derivational" | "inflectional";

export type RuleId =
  | "consonant_mutation_trigger"
  | "consonant_assimilation"
  | "buffer_y"
  | "buffer_s"
  | "buffer_n"
  | "buffer_sh";

export interface SuffixDefinition {
  id: string;
  archiphoneme: `/${string}/`;
  sourcePos: PartOfSpeech;
  targetPos: PartOfSpeech;
  harmonyType: HarmonyType;
  level: string;
  kind: SuffixKind;
  group: string;
  rules: RuleId[];
  label?: string;
  description?: string;
}

export interface RootLexeme {
  surface: string;
  pos: PartOfSpeech;
  phase?: MorphologicalPhase;
  origin?: "native" | "foreign";
  allowConsonantMutation?: boolean;
  forceConsonantMutation?: boolean;
  mutationOverrides?: Partial<Record<"p" | "ç" | "t" | "k", string>>;
}

export interface MorphologicalState extends RootLexeme {
  phase: MorphologicalPhase;
}

export type PhonologyEventType =
  | "vowel_harmony"
  | "consonant_assimilation"
  | "consonant_mutation"
  | "buffer_letter"
  | "pos_change"
  | "phase_change";

export interface PhonologyEvent {
  type: PhonologyEventType;
  message: string;
  before?: string;
  after?: string;
}

export interface DiffSegment {
  before: string;
  after: string;
  changed: boolean;
}

export interface HighlightDiff {
  beforeHighlighted: string;
  afterHighlighted: string;
  segments: DiffSegment[];
}

export interface TransformationLog {
  step: number;
  suffixId: string;
  suffixArchiphoneme: string;
  suffixSurface: string;
  sourcePos: PartOfSpeech;
  targetPos: PartOfSpeech;
  beforeSurface: string;
  afterSurface: string;
  explanationArray: string[];
  events: PhonologyEvent[];
  diff: HighlightDiff;
}

export interface BuildStep {
  step: number;
  suffix: SuffixDefinition;
  surfaceSuffix: string;
  beforeState: MorphologicalState;
  afterState: MorphologicalState;
  log: TransformationLog;
}

export interface BuildResult {
  root: RootLexeme;
  finalState: MorphologicalState;
  finalSurface: string;
  finalPos: PartOfSpeech;
  steps: BuildStep[];
  explanationArray: string[];
  availableSuffixes: SuffixDefinition[];
}

