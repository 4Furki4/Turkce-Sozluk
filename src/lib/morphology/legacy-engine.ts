import { buildHighlightDiff, realizeSuffix } from "./phonology";
import { DEFAULT_SUFFIX_CATALOG } from "./suffix-catalog";
import {
  type BuildResult,
  type BuildStep,
  type MorphologicalState,
  type PartOfSpeech,
  type RootLexeme,
  type SuffixDefinition,
  type TransformationLog,
  type MorphologyEvent,
} from "./types";

type SuffixInput = string | SuffixDefinition;

interface LogTransformationInput {
  step: number;
  suffix: SuffixDefinition;
  beforeState: MorphologicalState;
  afterState: MorphologicalState;
  surfaceSuffix: string;
  events: MorphologyEvent[];
}

function createEvent(
  code: MorphologyEvent["code"],
  i18nKey: string,
  params: Record<string, string>,
  suffix: SuffixDefinition,
): MorphologyEvent {
  return {
    code,
    i18nKey,
    params,
    stage: "morphotactics",
    morphemeId: suffix.id,
  };
}

export class LegacyTurkishMorphologyEngine {
  private readonly suffixCatalog: SuffixDefinition[];
  private readonly suffixIndex: Map<string, SuffixDefinition>;

  constructor(suffixCatalog: SuffixDefinition[] = DEFAULT_SUFFIX_CATALOG) {
    this.suffixCatalog = suffixCatalog;
    this.suffixIndex = new Map(
      suffixCatalog.map((suffix) => [suffix.id, suffix] as const),
    );
  }

  public getAvailableSuffixes(
    input: RootLexeme | MorphologicalState,
  ): SuffixDefinition[] {
    const state = this.normalizeState(input);

    return this.suffixCatalog.filter((suffix) => {
      if (suffix.sourcePos !== state.pos) {
        return false;
      }

      if (state.phase === "inflection" && suffix.kind !== "inflectional") {
        return false;
      }

      return true;
    });
  }

  public buildWord(root: RootLexeme, suffixList: SuffixInput[]): BuildResult {
    let currentState = this.normalizeState(root);
    const steps: BuildStep[] = [];

    suffixList.forEach((suffixInput, index) => {
      const suffix = this.resolveSuffix(suffixInput);
      this.assertSuffixAllowed(currentState, suffix);

      const beforeState = { ...currentState };
      const realized = realizeSuffix(beforeState, suffix);
      const nextPhase =
        beforeState.phase === "inflection" || suffix.kind === "inflectional"
          ? "inflection"
          : "derivation";

      const afterState: MorphologicalState = {
        ...beforeState,
        surface: `${realized.stem}${realized.surfaceSuffix}`,
        pos: suffix.targetPos,
        phase: nextPhase,
      };

      const events = [...realized.events];
      if (beforeState.pos !== afterState.pos) {
        events.push(
          createEvent(
            "pos_change",
            "events.posChange",
            {
              before: beforeState.pos,
              after: afterState.pos,
            },
            suffix,
          ),
        );
      }

      if (beforeState.phase !== afterState.phase) {
        events.push(
          createEvent(
            "phase_change",
            "events.phaseChange",
            {
              before: beforeState.phase,
              after: afterState.phase,
            },
            suffix,
          ),
        );
      }

      const log = this.logTransformation({
        step: index + 1,
        suffix,
        beforeState,
        afterState,
        surfaceSuffix: realized.surfaceSuffix,
        events,
      });

      steps.push({
        step: index + 1,
        suffix,
        surfaceSuffix: realized.surfaceSuffix,
        beforeState,
        afterState,
        log,
      });

      currentState = afterState;
    });

    return {
      root,
      finalState: currentState,
      finalSurface: currentState.surface,
      finalPos: currentState.pos,
      steps,
      explanationArray: steps.flatMap((step) => step.log.explanationArray),
      availableSuffixes: this.getAvailableSuffixes(currentState),
    };
  }

  public logTransformation({
    step,
    suffix,
    beforeState,
    afterState,
    surfaceSuffix,
    events,
  }: LogTransformationInput): TransformationLog {
    return {
      step,
      suffixId: suffix.id,
      suffixArchiphoneme: suffix.archiphoneme,
      suffixSurface: surfaceSuffix,
      sourcePos: beforeState.pos,
      targetPos: afterState.pos,
      beforeSurface: beforeState.surface,
      afterSurface: afterState.surface,
      explanationArray: events.map((event) => event.i18nKey),
      events,
      diff: buildHighlightDiff(beforeState.surface, afterState.surface),
    };
  }

  public buildState(
    surface: string,
    pos: PartOfSpeech,
    phase: MorphologicalState["phase"] = "derivation",
  ): MorphologicalState {
    return { surface, pos, phase };
  }

  private normalizeState(input: RootLexeme | MorphologicalState): MorphologicalState {
    return {
      ...input,
      phase: input.phase ?? "derivation",
    };
  }

  private resolveSuffix(input: SuffixInput): SuffixDefinition {
    if (typeof input !== "string") {
      return input;
    }

    const suffix = this.suffixIndex.get(input);
    if (!suffix) {
      throw new Error(`Unknown suffix id: ${input}`);
    }

    return suffix;
  }

  private assertSuffixAllowed(
    state: MorphologicalState,
    suffix: SuffixDefinition,
  ): void {
    if (suffix.sourcePos !== state.pos) {
      throw new Error(
        `Suffix ${suffix.id} cannot be applied to ${state.pos}. Current surface: ${state.surface}`,
      );
    }

    if (state.phase === "inflection" && suffix.kind !== "inflectional") {
      throw new Error(
        `Suffix ${suffix.id} is derivational, but the word is already in inflection phase.`,
      );
    }
  }
}
