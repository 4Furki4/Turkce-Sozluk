import { type MorphologyAttestation, type MorphologicalAction } from "./types";

export const LOW_FREQUENCY_DERIVATION_THRESHOLD = 60;

export function sortActionsForDisplay(
  actions: MorphologicalAction[],
  attestationByActionId: Record<string, MorphologyAttestation | null | undefined> = {},
): MorphologicalAction[] {
  return [...actions].sort((left, right) => {
    const leftScore = getActionDisplayScore(left, attestationByActionId[left.id]);
    const rightScore = getActionDisplayScore(right, attestationByActionId[right.id]);

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    return left.id.localeCompare(right.id, "tr");
  });
}

export function suppressLowFrequencyDerivations(
  actions: MorphologicalAction[],
  attestationByActionId: Record<string, MorphologyAttestation | null | undefined> = {},
): MorphologicalAction[] {
  return actions.filter((action) => {
    return !isRareDerivationAction(action, attestationByActionId[action.id]);
  });
}

export function isRareDerivationAction(
  action: MorphologicalAction,
  attestation: MorphologyAttestation | null | undefined,
): boolean {
  if (action.kind !== "derivational") {
    return false;
  }

  const naturalnessWeight = action.naturalnessWeight ?? 50;
  if (naturalnessWeight >= LOW_FREQUENCY_DERIVATION_THRESHOLD) {
    return false;
  }

  return attestation?.matched !== true;
}

export function splitActionsByRarity(
  actions: MorphologicalAction[],
  attestationByActionId: Record<string, MorphologyAttestation | null | undefined> = {},
): {
  primaryActions: MorphologicalAction[];
  rareActions: MorphologicalAction[];
} {
  return actions.reduce<{
    primaryActions: MorphologicalAction[];
    rareActions: MorphologicalAction[];
  }>(
    (accumulator, action) => {
      if (isRareDerivationAction(action, attestationByActionId[action.id])) {
        accumulator.rareActions.push(action);
      } else {
        accumulator.primaryActions.push(action);
      }

      return accumulator;
    },
    {
      primaryActions: [],
      rareActions: [],
    },
  );
}

function getActionDisplayScore(
  action: MorphologicalAction,
  attestation: MorphologyAttestation | null | undefined,
): number {
  let score = action.naturalnessWeight ?? 50;

  if (action.kind === "derivational") {
    if (attestation?.matched) {
      score += 30;
    } else if (attestation && !attestation.matched) {
      score -= 8;
    }
  }

  return score;
}
