import { ANALYTIC_CONSTRUCTION_CATALOG } from "./analytic-catalog";
import { createDefaultFeatureBundle } from "./lexicon";
import { MORPHEME_CATALOG } from "./morpheme-catalog";
import { getAvailableMorphologyActions } from "./morphotactics";
import {
  buildTraceDiff,
  realizeMorphologicalState,
} from "./realization-v2";
import {
  createStateContext,
  resolveNextMorphCategory,
} from "./state-context";
import {
  type LexemeEntry,
  type AnalyticConstructionDefinition,
  type MorphologicalAction,
  type MorphologicalStateV2,
  type MorphologyEvent,
  type MorphologyHistoryEntry,
  type MorphToken,
  type MorphemeDefinition,
  type RealizationResult,
} from "./types";

function getMorphemeById(morphemeId: string): MorphemeDefinition {
  const morpheme = MORPHEME_CATALOG.find((entry) => entry.id === morphemeId);
  if (!morpheme) {
    throw new Error(`Unknown morpheme: ${morphemeId}`);
  }

  return morpheme;
}

function getAnalyticConstructionById(
  constructionId: string,
): AnalyticConstructionDefinition {
  const construction = ANALYTIC_CONSTRUCTION_CATALOG.find(
    (entry) => entry.id === constructionId,
  );
  if (!construction) {
    throw new Error(`Unknown analytic construction: ${constructionId}`);
  }

  return construction;
}

function snapshotState(state: MorphologicalStateV2, surface: string): MorphologicalStateV2 {
  return {
    lexeme: { ...state.lexeme, allomorphOverrides: { ...state.lexeme.allomorphOverrides } },
    currentPos: state.currentPos,
    currentCategory: state.currentCategory,
    tokens: state.tokens.map((token) => ({ ...token })),
    features: { ...state.features },
    surface,
    history: [],
    phase: state.phase,
    continuation: { ...state.continuation },
    attestationCache: { ...state.attestationCache },
  };
}

function createEvent(
  code: MorphologyEvent["code"],
  i18nKey: string,
  params: Record<string, string>,
  action: MorphologicalAction,
): MorphologyEvent {
  return {
    code,
    i18nKey,
    params,
    stage: "morphotactics",
    slot: action.slot,
    morphemeId:
      action.kind === "analytic" ? action.constructionId : action.morphemeId,
  };
}

export class TurkishMorphologyEngineV2 {
  public initializeState(lexeme: LexemeEntry): MorphologicalStateV2 {
    const context = createStateContext(lexeme.pos, "derivation");

    return {
      lexeme,
      ...context,
      tokens: [],
      features: createDefaultFeatureBundle(),
      surface: lexeme.rootSurface,
      history: [],
      phase: "derivation",
      attestationCache: {},
    };
  }

  public getAvailableActions(state: MorphologicalStateV2): MorphologicalAction[] {
    return getAvailableMorphologyActions(state);
  }

  public applyAction(
    state: MorphologicalStateV2,
    actionId: string,
  ): MorphologicalStateV2 {
    const action = this.getAvailableActions(state).find((entry) => entry.id === actionId);
    if (!action) {
      throw new Error(`Action ${actionId} is not available in the current state.`);
    }

    const beforeRealization = this.realize(state);
    const nextStep = state.history.length + 1;
    let token: MorphToken;
    let nextPhase = state.phase;
    let nextCurrentPos = state.currentPos;
    let nextCurrentCategory = state.currentCategory;
    let nextFeatures = { ...state.features };
    let derivationApplied = false;

    if (action.kind === "analytic") {
      const construction = getAnalyticConstructionById(action.constructionId);
      token = {
        id: `${construction.id}#${nextStep}`,
        constructionId: construction.id,
        kind: "analytic",
        slot: "analytic",
        selectedAtStep: nextStep,
      };
      nextCurrentPos = construction.targetPos;
      nextCurrentCategory = resolveNextMorphCategory(
        state.currentCategory,
        construction.targetCategory,
        "analytic",
      );
    } else {
      const morpheme = getMorphemeById(action.morphemeId);
      token = {
        id: `${morpheme.id}#${nextStep}`,
        morphemeId: morpheme.id,
        kind: morpheme.kind,
        slot: morpheme.slot,
        selectedAtStep: nextStep,
      };
      nextPhase =
        morpheme.kind === "inflectional" || morpheme.kind === "nonfinite"
          ? "inflection"
          : state.phase;
      nextCurrentPos = morpheme.targetPos;
      nextCurrentCategory = resolveNextMorphCategory(
        state.currentCategory,
        morpheme.targetCategory,
        morpheme.kind,
      );
      nextFeatures =
        morpheme.kind === "derivational" || morpheme.kind === "nonfinite"
          ? {
              ...createDefaultFeatureBundle(),
              ...morpheme.setsFeatures,
            }
          : {
              ...state.features,
              ...morpheme.setsFeatures,
            };
      derivationApplied = morpheme.kind === "derivational";
    }

    const nextContext = createStateContext(
      nextCurrentPos,
      nextPhase,
      nextCurrentCategory,
    );

    const nextStateBase: MorphologicalStateV2 = {
      lexeme: state.lexeme,
      ...nextContext,
      tokens: [...state.tokens, token],
      features: nextFeatures,
      surface: state.surface,
      history: state.history,
      phase: nextPhase,
      attestationCache: { ...state.attestationCache },
    };

    const afterRealization = this.realize(nextStateBase);
    const trace = afterRealization.traces.find((entry) => entry.tokenId === token.id);
    const events: MorphologyEvent[] = [
      createEvent(
        "action_applied",
        "events.actionApplied",
        {
          actionKey: action.labelKey,
          preview: action.preview,
        },
        action,
      ),
    ];

    if (action.kind === "analytic") {
      events.push(
        createEvent(
          "analytic_applied",
          "events.analyticApplied",
          {
            actionKey: action.labelKey,
          },
          action,
        ),
      );
    }

    if (derivationApplied) {
      events.push(
        createEvent(
          "derivation_applied",
          "events.derivationApplied",
          {
            actionKey: action.labelKey,
            before: state.currentPos,
            after: nextCurrentPos,
          },
          action,
        ),
      );
    }

    if (state.phase !== nextPhase) {
      events.push(
        createEvent(
          "phase_change",
          "events.phaseChange",
          {
            before: state.phase,
            after: nextPhase,
          },
          action,
        ),
      );
    }

    if (state.currentPos !== nextCurrentPos) {
      events.push(
        createEvent(
          "pos_change",
          "events.posChange",
          {
            before: state.currentPos,
            after: nextCurrentPos,
          },
          action,
        ),
      );
    }

    if (trace) {
      events.push(...trace.events);
    }

    const beforeSnapshot = snapshotState(state, beforeRealization.surface);
    const afterSnapshot = snapshotState(nextStateBase, afterRealization.surface);
    const historyEntry: MorphologyHistoryEntry = {
      step: nextStep,
      action,
      token,
      beforeState: beforeSnapshot,
      afterState: afterSnapshot,
      surfaceSuffix: trace?.surface ?? "",
      log: {
        step: nextStep,
        suffixId:
          action.kind === "analytic" ? undefined : action.legacySuffixId,
        suffixArchiphoneme: trace?.pattern,
        suffixSurface: trace?.surface ?? "",
        sourcePos: beforeSnapshot.currentPos,
        targetPos: afterSnapshot.currentPos,
        beforeSurface: beforeRealization.surface,
        afterSurface: afterRealization.surface,
        explanationArray: events.map((event) => event.i18nKey),
        events,
        diff: buildTraceDiff(beforeRealization.surface, afterRealization.surface),
      },
    };

    return {
      ...afterSnapshot,
      history: [...state.history, historyEntry],
    };
  }

  public undoAction(state: MorphologicalStateV2): MorphologicalStateV2 {
    if (state.tokens.length === 0) {
      return state;
    }

    const tokens = state.tokens.slice(0, -1);
    const history = state.history.slice(0, -1);
    let features = createDefaultFeatureBundle();
    let currentPos = state.lexeme.pos;
    let currentCategory = createStateContext(state.lexeme.pos, "derivation").currentCategory;
    let phase: MorphologicalStateV2["phase"] = "derivation";

    tokens.forEach((token) => {
      if (token.kind === "analytic") {
        const construction = getAnalyticConstructionById(token.constructionId);
        currentPos = construction.targetPos;
        currentCategory = resolveNextMorphCategory(
          currentCategory,
          construction.targetCategory,
          "analytic",
        );
        return;
      }

      const morpheme = getMorphemeById(token.morphemeId);

      if (morpheme.kind === "derivational" || morpheme.kind === "nonfinite") {
        features = {
          ...createDefaultFeatureBundle(),
          ...morpheme.setsFeatures,
        };
        currentPos = morpheme.targetPos;
        currentCategory = resolveNextMorphCategory(
          currentCategory,
          morpheme.targetCategory,
          morpheme.kind,
        );
        phase = morpheme.kind === "nonfinite" ? "inflection" : phase;
        return;
      }

      features = {
        ...features,
        ...morpheme.setsFeatures,
      };
      phase = "inflection";
    });
    const nextContext = createStateContext(currentPos, phase, currentCategory);

    const nextState: MorphologicalStateV2 = {
      lexeme: state.lexeme,
      ...nextContext,
      tokens,
      features,
      surface: state.lexeme.rootSurface,
      history,
      phase,
      attestationCache: { ...state.attestationCache },
    };
    const realized = this.realize(nextState);

    return {
      ...nextState,
      surface: realized.surface,
    };
  }

  public realize(state: MorphologicalStateV2): RealizationResult {
    return realizeMorphologicalState(state);
  }

  public explain(state: MorphologicalStateV2): MorphologyEvent[] {
    return state.history.flatMap((entry) => entry.log.events);
  }
}
