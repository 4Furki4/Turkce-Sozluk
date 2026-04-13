import { TurkishMorphologyEngineV2 } from "./engine-v2";
import { LegacyTurkishMorphologyEngine } from "./legacy-engine";
import { createLexemeEntryFromRoot } from "./lexicon";
import { MORPHEME_CATALOG } from "./morpheme-catalog";
import { DEFAULT_SUFFIX_CATALOG } from "./suffix-catalog";
import {
  type BuildResult,
  type BuildStep,
  type LexemeEntry,
  type MorphologicalAction,
  type MorphologicalState,
  type MorphologicalStateV2,
  type PartOfSpeech,
  type RootLexeme,
  type SuffixDefinition,
} from "./types";

type SuffixInput = string | SuffixDefinition;

export class TurkishMorphologyEngine {
  private readonly legacyEngine: LegacyTurkishMorphologyEngine;
  private readonly v2Engine: TurkishMorphologyEngineV2;
  private readonly suffixIndex: Map<string, SuffixDefinition>;
  private readonly legacySuffixToMorpheme: Map<string, MorphologicalAction["id"]>;

  constructor(suffixCatalog: SuffixDefinition[] = DEFAULT_SUFFIX_CATALOG) {
    this.legacyEngine = new LegacyTurkishMorphologyEngine(suffixCatalog);
    this.v2Engine = new TurkishMorphologyEngineV2();
    this.suffixIndex = new Map(
      suffixCatalog.map((suffix) => [suffix.id, suffix] as const),
    );
    this.legacySuffixToMorpheme = new Map(
      MORPHEME_CATALOG.filter((morpheme) => morpheme.legacySuffixId).map((morpheme) => [
        morpheme.legacySuffixId as string,
        morpheme.id,
      ]),
    );
  }

  public initializeState(lexeme: LexemeEntry): MorphologicalStateV2 {
    return this.v2Engine.initializeState(lexeme);
  }

  public getAvailableActions(state: MorphologicalStateV2): MorphologicalAction[] {
    return this.v2Engine.getAvailableActions(state);
  }

  public applyAction(state: MorphologicalStateV2, actionId: string): MorphologicalStateV2 {
    return this.v2Engine.applyAction(state, actionId);
  }

  public undoAction(state: MorphologicalStateV2): MorphologicalStateV2 {
    return this.v2Engine.undoAction(state);
  }

  public realize(state: MorphologicalStateV2) {
    return this.v2Engine.realize(state);
  }

  public explain(state: MorphologicalStateV2) {
    return this.v2Engine.explain(state);
  }

  public getAvailableSuffixes(
    input: RootLexeme | MorphologicalState,
  ): SuffixDefinition[] {
    return this.legacyEngine.getAvailableSuffixes(input);
  }

  public buildWord(root: RootLexeme, suffixList: SuffixInput[]): BuildResult {
    if (!this.canUseV2Build(suffixList)) {
      return this.legacyEngine.buildWord(root, suffixList);
    }

    let state = this.initializeState(createLexemeEntryFromRoot(root));

    suffixList.forEach((suffixInput) => {
      const suffixId = this.resolveLegacySuffixId(suffixInput);
      const morphemeId = this.legacySuffixToMorpheme.get(suffixId);

      if (!morphemeId) {
        throw new Error(`No V2 morpheme mapping found for suffix ${suffixId}.`);
      }

      state = this.applyAction(state, morphemeId);
    });

    return this.buildLegacyFacadeResult(root, state);
  }

  public buildState(
    surface: string,
    pos: PartOfSpeech,
    phase: MorphologicalState["phase"] = "derivation",
  ): MorphologicalState {
    return this.legacyEngine.buildState(surface, pos, phase);
  }

  private canUseV2Build(suffixList: SuffixInput[]): boolean {
    if (suffixList.length === 0) {
      return false;
    }

    return suffixList.every((suffixInput) =>
      this.legacySuffixToMorpheme.has(this.resolveLegacySuffixId(suffixInput)),
    );
  }

  private resolveLegacySuffixId(input: SuffixInput): string {
    return typeof input === "string" ? input : input.id;
  }

  private toLegacyState(state: MorphologicalStateV2): MorphologicalState {
    return {
      surface: state.surface ?? state.lexeme.rootSurface,
      pos: state.currentPos,
      phase: state.phase,
      origin: state.lexeme.origin,
      forceConsonantMutation: state.lexeme.mutationPolicy === "always",
      allowConsonantMutation: state.lexeme.mutationPolicy === "never" ? false : undefined,
      mutationOverrides: state.lexeme.mutationOverrides,
    };
  }

  private buildLegacyFacadeResult(
    root: RootLexeme,
    state: MorphologicalStateV2,
  ): BuildResult {
    const steps: BuildStep[] = state.history.map((entry) => ({
      step: entry.step,
      suffix: entry.action.kind !== "analytic" && entry.action.legacySuffixId
        ? this.suffixIndex.get(entry.action.legacySuffixId)
        : undefined,
      action: entry.action,
      surfaceSuffix: entry.surfaceSuffix,
      beforeState: this.toLegacyState(entry.beforeState),
      afterState: this.toLegacyState(entry.afterState),
      log: entry.log,
    }));
    const finalState = this.toLegacyState(state);
    const availableSuffixes = this.getAvailableActions(state)
      .map((action) => (action.kind === "analytic" ? undefined : action.legacySuffixId))
      .filter((value): value is string => Boolean(value))
      .map((suffixId) => this.suffixIndex.get(suffixId))
      .filter((suffix): suffix is SuffixDefinition => Boolean(suffix));

    return {
      root,
      finalState,
      finalSurface: finalState.surface,
      finalPos: finalState.pos,
      steps,
      explanationArray: steps.flatMap((step) => step.log.explanationArray),
      availableSuffixes,
    };
  }
}
