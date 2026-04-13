import { createDefaultFeatureBundle } from "./lexicon";
import { MORPHEME_CATALOG } from "./morpheme-catalog";
import { getAvailableMorphologyActions } from "./morphotactics";
import {
  buildTraceDiff,
  realizeMorphologicalState,
} from "./realization-v2";
import {
  type LexemeEntry,
  type MorphologicalAction,
  type MorphologicalStateV2,
  type MorphologyEvent,
  type MorphologyHistoryEntry,
  type MorphemeDefinition,
  type MorphemeToken,
  type RealizationResult,
} from "./types";

function getMorphemeById(morphemeId: string): MorphemeDefinition {
  const morpheme = MORPHEME_CATALOG.find((entry) => entry.id === morphemeId);
  if (!morpheme) {
    throw new Error(`Unknown morpheme: ${morphemeId}`);
  }

  return morpheme;
}

function snapshotState(state: MorphologicalStateV2, surface: string): MorphologicalStateV2 {
  return {
    lexeme: { ...state.lexeme, allomorphOverrides: { ...state.lexeme.allomorphOverrides } },
    currentPos: state.currentPos,
    tokens: state.tokens.map((token) => ({ ...token })),
    features: { ...state.features },
    surface,
    history: [],
    phase: state.phase,
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
    morphemeId: action.morphemeId,
  };
}

export class TurkishMorphologyEngineV2 {
  public initializeState(lexeme: LexemeEntry): MorphologicalStateV2 {
    return {
      lexeme,
      currentPos: lexeme.pos,
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

    const morpheme = getMorphemeById(action.morphemeId);
    const beforeRealization = this.realize(state);
    const nextStep = state.history.length + 1;
    const token: MorphemeToken = {
      id: `${morpheme.id}#${nextStep}`,
      morphemeId: morpheme.id,
      kind: morpheme.kind,
      slot: morpheme.slot,
      selectedAtStep: nextStep,
    };
    const nextPhase =
      morpheme.kind === "inflectional" ? "inflection" : state.phase;
    const nextCurrentPos = morpheme.targetPos;
    const nextFeatures =
      morpheme.kind === "derivational"
        ? {
            ...createDefaultFeatureBundle(),
            ...morpheme.setsFeatures,
          }
        : {
            ...state.features,
            ...morpheme.setsFeatures,
          };

    const nextStateBase: MorphologicalStateV2 = {
      lexeme: state.lexeme,
      currentPos: nextCurrentPos,
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

    if (morpheme.kind === "derivational") {
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
        suffixId: action.legacySuffixId,
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
    let phase: MorphologicalStateV2["phase"] = "derivation";

    tokens.forEach((token) => {
      const morpheme = getMorphemeById(token.morphemeId);

      if (morpheme.kind === "derivational") {
        features = {
          ...createDefaultFeatureBundle(),
          ...morpheme.setsFeatures,
        };
        currentPos = morpheme.targetPos;
        return;
      }

      features = {
        ...features,
        ...morpheme.setsFeatures,
      };
      phase = "inflection";
    });

    const nextState: MorphologicalStateV2 = {
      lexeme: state.lexeme,
      currentPos,
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
