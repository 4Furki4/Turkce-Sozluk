import { ANALYTIC_CONSTRUCTION_CATALOG } from "./analytic-catalog";
import { MORPHEME_CATALOG } from "./morpheme-catalog";
import { POSTFINITE_OVERLAY_CATALOG } from "./postfinite-catalog";
import {
  type AnalyticConstructionDefinition,
  type MorphemeDefinition,
  type MorphemeSlot,
  type MorphologicalAction,
  type MorphologicalStateV2,
  type PartOfSpeech,
  type PostfiniteOverlayDefinition,
} from "./types";

const SLOT_ORDER: Record<PartOfSpeech, MorphemeSlot[]> = {
  Noun: ["noun_number", "noun_possessive", "noun_case"],
  Verb: ["verb_polarity", "verb_tam", "verb_agreement"],
};

function matchesConstraints(
  state: MorphologicalStateV2,
  morpheme: MorphemeDefinition,
): boolean {
  if (morpheme.requires) {
    for (const [key, value] of Object.entries(morpheme.requires)) {
      if (state.features[key as keyof typeof state.features] !== value) {
        return false;
      }
    }
  }

  if (morpheme.blocks) {
    for (const [key, value] of Object.entries(morpheme.blocks)) {
      if (state.features[key as keyof typeof state.features] === value) {
        return false;
      }
    }
  }

  return true;
}

function canExposeSlot(state: MorphologicalStateV2, slot: MorphemeSlot): boolean {
  if (slot !== "verb_agreement") {
    return true;
  }

  return state.features.tam !== "bare";
}

function canExposePostfinite(state: MorphologicalStateV2): boolean {
  if (state.currentCategory === "Converb") {
    return false;
  }

  if (state.currentCategory === "Verb") {
    return state.features.tam !== "bare";
  }

  return true;
}

function canChainPostfiniteOverlay(
  overlay: PostfiniteOverlayDefinition,
  postfiniteOverlays: PostfiniteOverlayDefinition[],
): boolean {
  if (postfiniteOverlays.length === 0) {
    return overlay.allowAsFirst;
  }

  if (postfiniteOverlays.length === 1) {
    const [firstOverlay] = postfiniteOverlays;

    if (!firstOverlay || firstOverlay.overlayType !== "question") {
      return false;
    }

    return overlay.allowAfterQuestion === true;
  }

  return false;
}

function toAction(morpheme: MorphemeDefinition): MorphologicalAction {
  return {
    id: morpheme.id,
    slot: morpheme.slot,
    kind: morpheme.kind,
    group: morpheme.group,
    labelKey: morpheme.labelKey,
    preview: morpheme.preview,
    morphemeId: morpheme.id,
    enabled: true,
    legacySuffixId: morpheme.legacySuffixId,
    sourcePos: morpheme.sourcePos,
    targetPos: morpheme.targetPos,
    attestationStatus: morpheme.kind === "derivational" ? "unknown" : undefined,
  };
}

function toAnalyticAction(
  construction: AnalyticConstructionDefinition,
): MorphologicalAction {
  return {
    id: construction.id,
    slot: "analytic",
    kind: "analytic",
    group: construction.group,
    labelKey: construction.labelKey,
    preview: construction.preview,
    constructionId: construction.id,
    enabled: true,
    sourcePos: "Verb",
    targetPos: "Verb",
  };
}

function toPostfiniteAction(
  overlay: PostfiniteOverlayDefinition,
  state: MorphologicalStateV2,
): MorphologicalAction {
  return {
    id: overlay.id,
    slot: "postfinite",
    kind: "postfinite",
    group: overlay.group,
    labelKey: overlay.labelKey,
    preview: overlay.preview,
    overlayId: overlay.id,
    enabled: true,
    sourcePos: state.currentPos,
    targetPos: state.currentPos,
  };
}

export function getSlotOrder(pos: PartOfSpeech): MorphemeSlot[] {
  return SLOT_ORDER[pos];
}

export function getSlotTranslationKey(slot: MorphemeSlot): string {
  return `slots.${slot}`;
}

export function getAvailableMorphologyActions(
  state: MorphologicalStateV2,
): MorphologicalAction[] {
  if (
    !state.continuation.allowInflection &&
    !state.continuation.allowDerivation &&
    !state.continuation.allowNonfinite &&
    !state.continuation.allowPostFinite
  ) {
    return [];
  }

  const slotOrder = SLOT_ORDER[state.currentPos];
  const inflectionTokens = state.tokens.filter((token) => token.kind === "inflectional");
  const hasAnalyticConstruction = state.tokens.some((token) => token.kind === "analytic");
  const postfiniteOverlayIds = state.tokens
    .filter((token): token is Extract<(typeof state.tokens)[number], { kind: "postfinite" }> => token.kind === "postfinite")
    .map((token) => token.overlayId);
  const chosenPostfiniteOverlays = postfiniteOverlayIds
    .map((overlayId) =>
      POSTFINITE_OVERLAY_CATALOG.find((overlay) => overlay.id === overlayId),
    )
    .filter((overlay): overlay is PostfiniteOverlayDefinition => Boolean(overlay));
  const chosenSlots = new Set(inflectionTokens.map((token) => token.slot));
  const chosenIndices = inflectionTokens
    .map((token) => slotOrder.indexOf(token.slot))
    .filter((index) => index >= 0);
  const highestChosenIndex = chosenIndices.length > 0 ? Math.max(...chosenIndices) : -1;

  const derivationalActions =
    state.continuation.allowDerivation
      ? MORPHEME_CATALOG.filter((morpheme) => morpheme.kind === "derivational")
          .filter((morpheme) => morpheme.sourcePos === state.currentPos)
          .filter((morpheme) => morpheme.sourceCategories.includes(state.currentCategory))
          .filter((morpheme) => matchesConstraints(state, morpheme))
          .map(toAction)
      : [];

  const nonfiniteActions =
    state.continuation.allowNonfinite
      ? MORPHEME_CATALOG.filter((morpheme) => morpheme.kind === "nonfinite")
          .filter((morpheme) => morpheme.sourcePos === state.currentPos)
          .filter((morpheme) => morpheme.sourceCategories.includes(state.currentCategory))
          .filter((morpheme) => matchesConstraints(state, morpheme))
          .map(toAction)
      : [];

  const analyticActions =
    state.continuation.allowAnalyticConstructions && !hasAnalyticConstruction
      ? ANALYTIC_CONSTRUCTION_CATALOG.filter(
          (construction) => construction.sourcePos === state.currentPos,
        )
          .filter((construction) =>
            construction.sourceCategories.includes(
              state.currentCategory as AnalyticConstructionDefinition["sourceCategories"][number],
            ),
          )
          .map(toAnalyticAction)
      : [];

  const inflectionalActions = MORPHEME_CATALOG
    .filter((morpheme) => morpheme.kind === "inflectional")
    .filter((morpheme) => morpheme.sourcePos === state.currentPos)
    .filter((morpheme) => morpheme.sourceCategories.includes(state.currentCategory))
    .filter((morpheme) => {
      if (!state.continuation.allowInflection) {
        return false;
      }

      if (morpheme.sourcePos === "Noun") {
        return state.continuation.allowNominalInflection;
      }

      if (morpheme.sourcePos === "Verb") {
        return state.continuation.allowFiniteVerbInflection;
      }

      return false;
    })
    .filter((morpheme) => {
      const slotIndex = slotOrder.indexOf(morpheme.slot);
      if (slotIndex === -1) {
        return false;
      }

      if (chosenSlots.has(morpheme.slot)) {
        return false;
      }

      if (slotIndex <= highestChosenIndex) {
        return false;
      }

      if (!canExposeSlot(state, morpheme.slot)) {
        return false;
      }

      return matchesConstraints(state, morpheme);
    })
    .map(toAction);

  const postfiniteActions =
    state.continuation.allowPostFinite &&
    canExposePostfinite(state)
      ? POSTFINITE_OVERLAY_CATALOG.filter((overlay) =>
          overlay.sourceCategories.includes(
            state.currentCategory as PostfiniteOverlayDefinition["sourceCategories"][number],
          ),
        )
          .filter((overlay) =>
            canChainPostfiniteOverlay(overlay, chosenPostfiniteOverlays),
          )
          .map((overlay) => toPostfiniteAction(overlay, state))
      : [];

  return [
    ...derivationalActions,
    ...analyticActions,
    ...nonfiniteActions,
    ...inflectionalActions,
    ...postfiniteActions,
  ];
}
