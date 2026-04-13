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

export type LexemeOrigin = "native" | "foreign";

export type MutationPolicy = "auto" | "always" | "never";

export type MorphemeSlot =
  | "derivation"
  | "noun_number"
  | "noun_possessive"
  | "noun_case"
  | "verb_polarity"
  | "verb_tam"
  | "verb_agreement";

export type MorphemeCategory =
  | "derivation"
  | "number"
  | "possessive"
  | "case"
  | "polarity"
  | "tam"
  | "agreement";

export type NounNumberFeature = "sg" | "pl";

export type PossessiveFeature =
  | "none"
  | "p1sg"
  | "p2sg"
  | "p3sg"
  | "p1pl"
  | "p2pl"
  | "p3pl";

export type CaseFeature = "nom" | "acc" | "dat" | "loc" | "abl" | "gen";

export type PolarityFeature = "positive" | "negative";

export type TamFeature = "bare" | "aor" | "prog" | "past" | "fut";

export type AgreementFeature =
  | "none"
  | "1sg"
  | "2sg"
  | "3sg"
  | "1pl"
  | "2pl"
  | "3pl";

export interface FeatureBundle {
  number: NounNumberFeature;
  possessive: PossessiveFeature;
  case: CaseFeature;
  polarity: PolarityFeature;
  tam: TamFeature;
  agreement: AgreementFeature;
}

export interface LexemeEntry {
  id: string;
  lemma: string;
  rootSurface: string;
  pos: PartOfSpeech;
  origin: LexemeOrigin;
  irregularClass?: string;
  flags?: string[];
  mutationPolicy?: MutationPolicy;
  allomorphOverrides?: Partial<Record<string, string>>;
  mutationOverrides?: Partial<Record<"p" | "ç" | "t" | "k", string>>;
}

export interface MorphemeDefinition {
  id: string;
  category: MorphemeCategory;
  slot: MorphemeSlot;
  kind: SuffixKind;
  sourcePos: PartOfSpeech;
  targetPos: PartOfSpeech;
  group: string;
  labelKey: string;
  preview: string;
  legacySuffixId?: string;
  requires?: Partial<FeatureBundle>;
  blocks?: Partial<FeatureBundle>;
  realizationPattern: string;
  phonologyTriggers: RuleId[];
  setsFeatures: Partial<FeatureBundle>;
}

export interface MorphemeToken {
  id: string;
  morphemeId: string;
  kind: SuffixKind;
  slot: MorphemeSlot;
  selectedAtStep: number;
}

export type MorphologyStage = "morphotactics" | "realization" | "lexicon";

export type MorphologyEventCode =
  | "action_applied"
  | "derivation_applied"
  | "vowel_harmony_2_way"
  | "vowel_harmony_4_way"
  | "consonant_assimilation"
  | "buffer_letter"
  | "consonant_mutation"
  | "phase_change"
  | "pos_change"
  | "progressive_vowel_drop"
  | "lexeme_override_applied"
  | "attestation_match_found"
  | "attestation_match_missing";

export interface MorphologyEvent {
  code: MorphologyEventCode;
  i18nKey: string;
  params: Record<string, string>;
  stage: MorphologyStage;
  before?: string;
  after?: string;
  slot?: MorphemeSlot;
  morphemeId?: string;
}

export interface MorphologicalAction {
  id: string;
  slot: MorphemeSlot;
  kind: SuffixKind;
  group: string;
  labelKey: string;
  preview: string;
  morphemeId: string;
  enabled: boolean;
  reasonIfDisabled?: string;
  legacySuffixId?: string;
  sourcePos: PartOfSpeech;
  targetPos: PartOfSpeech;
  attestationStatus?: "unknown" | "attested" | "unattested";
}

export interface RealizationSegment {
  tokenId: string;
  morphemeId: string;
  slot: MorphemeSlot;
  labelKey: string;
  pattern: string;
  surface: string;
}

export interface RealizationTrace {
  tokenId: string;
  morphemeId: string;
  slot: MorphemeSlot;
  labelKey: string;
  pattern: string;
  beforeSurface: string;
  afterSurface: string;
  surface: string;
  events: MorphologyEvent[];
}

export interface RealizationResult {
  surface: string;
  segments: RealizationSegment[];
  events: MorphologyEvent[];
  traces: RealizationTrace[];
}

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
  origin?: LexemeOrigin;
  allowConsonantMutation?: boolean;
  forceConsonantMutation?: boolean;
  mutationOverrides?: Partial<Record<"p" | "ç" | "t" | "k", string>>;
}

export interface MorphologicalState extends RootLexeme {
  phase: MorphologicalPhase;
}

export interface MorphologicalStateV2 {
  lexeme: LexemeEntry;
  currentPos: PartOfSpeech;
  tokens: MorphemeToken[];
  features: FeatureBundle;
  surface?: string;
  history: MorphologyHistoryEntry[];
  phase: MorphologicalPhase;
  attestationCache: Record<string, MorphologyAttestation | null>;
}

export type PhonologyEventType = Extract<
  MorphologyEventCode,
  | "vowel_harmony_2_way"
  | "vowel_harmony_4_way"
  | "consonant_assimilation"
  | "consonant_mutation"
  | "buffer_letter"
>;

export type PhonologyEvent = MorphologyEvent;

export interface MorphologyAttestation {
  matched: boolean;
  wordId?: number;
  wordName?: string;
}

export interface MorphologyHistoryEntry {
  step: number;
  action: MorphologicalAction;
  token: MorphemeToken;
  beforeState: MorphologicalStateV2;
  afterState: MorphologicalStateV2;
  surfaceSuffix: string;
  log: TransformationLog;
  attestation?: MorphologyAttestation;
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
  suffixId?: string;
  suffixArchiphoneme?: string;
  suffixSurface: string;
  sourcePos: PartOfSpeech;
  targetPos: PartOfSpeech;
  beforeSurface: string;
  afterSurface: string;
  explanationArray: string[];
  events: MorphologyEvent[];
  diff: HighlightDiff;
}

export interface BuildStep {
  step: number;
  suffix?: SuffixDefinition;
  action?: MorphologicalAction;
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
