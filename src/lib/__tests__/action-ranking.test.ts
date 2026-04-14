import {
  isRareDerivationAction,
  splitActionsByRarity,
  sortActionsForDisplay,
  suppressLowFrequencyDerivations,
} from "../morphology/action-ranking";
import { type MorphologicalAction } from "../morphology/types";

function createDerivationalAction(
  id: string,
  naturalnessWeight: number,
): MorphologicalAction {
  return {
    id,
    slot: "derivation",
    kind: "derivational",
    group: "TestDerivation",
    labelKey: id,
    preview: id,
    morphemeId: id,
    enabled: true,
    sourcePos: "Noun",
    targetPos: "Noun",
    naturalnessWeight,
  };
}

describe("morphology action ranking", () => {
  it("boosts attested derivations above unattested ones", () => {
    const attested = createDerivationalAction("noun.deriv.lIk", 70);
    const unattested = createDerivationalAction("noun.deriv.sA", 78);

    const sorted = sortActionsForDisplay([unattested, attested], {
      [attested.id]: { matched: true, wordName: "kitaplık" },
      [unattested.id]: { matched: false, wordName: "kitapsa" },
    });

    expect(sorted[0]?.id).toBe(attested.id);
  });

  it("suppresses low-frequency unattested derivations", () => {
    const common = createDerivationalAction("noun.deriv.lIk", 88);
    const marginal = createDerivationalAction("noun.deriv.sA", 36);

    const filtered = suppressLowFrequencyDerivations([common, marginal], {
      [marginal.id]: { matched: false, wordName: "kitapsa" },
    });

    expect(filtered.map((action) => action.id)).toEqual([common.id]);
  });

  it("keeps low-frequency derivations when they are attested", () => {
    const marginal = createDerivationalAction("noun.deriv.DAş", 56);

    const filtered = suppressLowFrequencyDerivations([marginal], {
      [marginal.id]: { matched: true, wordName: "yurttaş" },
    });

    expect(filtered.map((action) => action.id)).toEqual([marginal.id]);
  });

  it("marks low-frequency unattested derivations as rare", () => {
    const marginal = createDerivationalAction("noun.deriv.sA", 36);

    expect(
      isRareDerivationAction(marginal, {
        matched: false,
        wordName: "kitapsa",
      }),
    ).toBe(true);
  });

  it("splits derivational actions into primary and rare buckets", () => {
    const common = createDerivationalAction("noun.deriv.lIk", 88);
    const rare = createDerivationalAction("noun.deriv.sA", 36);

    const split = splitActionsByRarity([common, rare], {
      [rare.id]: { matched: false, wordName: "kitapsa" },
    });

    expect(split.primaryActions.map((action) => action.id)).toEqual([common.id]);
    expect(split.rareActions.map((action) => action.id)).toEqual([rare.id]);
  });
});
