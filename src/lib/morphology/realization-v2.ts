import { ANALYTIC_CONSTRUCTION_CATALOG } from "./analytic-catalog";
import { MORPHEME_CATALOG } from "./morpheme-catalog";
import { POSTFINITE_OVERLAY_CATALOG } from "./postfinite-catalog";
import {
  buildHighlightDiff,
  countSyllables,
  endsWithVowel,
  realizeAffix,
} from "./phonology";
import {
  type MorphemeDefinition,
  type MorphologicalStateV2,
  type MorphologyEvent,
  type PostfiniteOverlayDefinition,
  type PostfiniteOverlayType,
  type RealizationResult,
  type RealizationTrace,
  type AnalyticConstructionDefinition,
} from "./types";

function createEvent(
  code: MorphologyEvent["code"],
  i18nKey: string,
  params: Record<string, string>,
  state: MorphologicalStateV2,
  morpheme: MorphemeDefinition,
  before?: string,
  after?: string,
): MorphologyEvent {
  return {
    code,
    i18nKey,
    params,
    stage: code === "lexeme_override_applied" ? "lexicon" : "realization",
    before,
    after,
    slot: morpheme.slot,
    morphemeId: morpheme.id,
  };
}

function getMorpheme(morphemeId: string): MorphemeDefinition {
  const morpheme = MORPHEME_CATALOG.find((entry) => entry.id === morphemeId);
  if (!morpheme) {
    throw new Error(`Unknown morpheme: ${morphemeId}`);
  }

  return morpheme;
}

function getAnalyticConstruction(
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

function getPostfiniteOverlay(
  overlayId: string,
): PostfiniteOverlayDefinition {
  const overlay = POSTFINITE_OVERLAY_CATALOG.find((entry) => entry.id === overlayId);
  if (!overlay) {
    throw new Error(`Unknown postfinite overlay: ${overlayId}`);
  }

  return overlay;
}

function createPhonologyState(
  state: MorphologicalStateV2,
  surface: string,
  pos: MorphemeDefinition["sourcePos"] | AnalyticConstructionDefinition["sourcePos"],
) {
  return {
    surface,
    pos,
    rootSurface: state.lexeme.rootSurface,
    origin: state.lexeme.origin,
    forceConsonantMutation: state.lexeme.mutationPolicy === "always",
    allowConsonantMutation: state.lexeme.mutationPolicy === "never" ? false : undefined,
    mutationOverrides: state.lexeme.mutationOverrides,
  };
}

function resolveNounPossessivePattern(surface: string, state: MorphologicalStateV2) {
  switch (state.features.possessive) {
    case "p1sg":
      return endsWithVowel(surface)
        ? { pattern: "/m/", rules: [] }
        : { pattern: "/Im/", rules: ["consonant_mutation_trigger"] as const };
    case "p2sg":
      return endsWithVowel(surface)
        ? { pattern: "/n/", rules: [] }
        : { pattern: "/In/", rules: ["consonant_mutation_trigger"] as const };
    case "p3sg":
      return { pattern: "/I/", rules: ["buffer_s", "consonant_mutation_trigger"] as const };
    case "p1pl":
      return endsWithVowel(surface)
        ? { pattern: "/mIz/", rules: [] }
        : { pattern: "/ImIz/", rules: ["consonant_mutation_trigger"] as const };
    case "p2pl":
      return endsWithVowel(surface)
        ? { pattern: "/nIz/", rules: [] }
        : { pattern: "/InIz/", rules: ["consonant_mutation_trigger"] as const };
    case "p3pl":
      return state.features.number === "pl"
        ? { pattern: "/I/", rules: [] }
        : { pattern: "/lArI/", rules: [] };
    default:
      return { pattern: "", rules: [] };
  }
}

function resolveNounCasePattern(state: MorphologicalStateV2) {
  const needsPronominalN =
    state.features.possessive === "p3sg" || state.features.possessive === "p3pl";

  switch (state.features.case) {
    case "acc":
      return needsPronominalN
        ? { pattern: "/nI/", rules: [] }
        : { pattern: "/I/", rules: ["buffer_y", "consonant_mutation_trigger"] as const };
    case "dat":
      return needsPronominalN
        ? { pattern: "/nA/", rules: [] }
        : { pattern: "/A/", rules: ["buffer_y", "consonant_mutation_trigger"] as const };
    case "loc":
      return needsPronominalN
        ? { pattern: "/nDA/", rules: ["consonant_assimilation"] as const }
        : { pattern: "/DA/", rules: ["consonant_assimilation"] as const };
    case "abl":
      return needsPronominalN
        ? { pattern: "/nDAn/", rules: ["consonant_assimilation"] as const }
        : { pattern: "/DAn/", rules: ["consonant_assimilation"] as const };
    case "gen":
      return { pattern: "/In/", rules: ["buffer_n", "consonant_mutation_trigger"] as const };
    default:
      return { pattern: "", rules: [] };
  }
}

function resolveVerbAorPattern(state: MorphologicalStateV2, surface: string) {
  const override = state.lexeme.allomorphOverrides?.["verb.tam.aor"];
  if (override) {
    return {
      pattern: override,
      rules: [],
      events: [
        createEvent(
          "lexeme_override_applied",
          "events.lexemeOverrideApplied",
          {
            morphemeKey: "actions.verb.tam.aor",
            pattern: override,
          },
          state,
          getMorpheme("verb.tam.aor"),
        ),
      ],
    };
  }

  if (state.features.polarity === "negative") {
    if (state.features.agreement === "1pl") {
      return { pattern: "/y/", rules: [], events: [] };
    }

    if (
      state.features.agreement === "2sg" ||
      state.features.agreement === "2pl" ||
      state.features.agreement === "3sg" ||
      state.features.agreement === "3pl" ||
      state.features.agreement === "none"
    ) {
      return { pattern: "/z/", rules: [], events: [] };
    }

    return { pattern: "", rules: [], events: [] };
  }

  if (endsWithVowel(surface)) {
    return { pattern: "/r/", rules: [], events: [] };
  }

  return countSyllables(surface) === 1
    ? { pattern: "/Ar/", rules: [], events: [] }
    : { pattern: "/Ir/", rules: [], events: [] };
}

function resolveVerbAgreementPattern(state: MorphologicalStateV2) {
  if (state.features.agreement === "none" || state.features.agreement === "3sg") {
    return { pattern: "", rules: [] };
  }

  if (state.features.tam === "past") {
    switch (state.features.agreement) {
      case "1sg":
        return { pattern: "/m/", rules: [] };
      case "2sg":
        return { pattern: "/n/", rules: [] };
      case "1pl":
        return { pattern: "/k/", rules: [] };
      case "2pl":
        return { pattern: "/nIz/", rules: [] };
      case "3pl":
        return { pattern: "/lAr/", rules: [] };
      default:
        return { pattern: "", rules: [] };
    }
  }

  if (state.features.tam === "aor" && state.features.polarity === "negative") {
    switch (state.features.agreement) {
      case "1sg":
        return { pattern: "/m/", rules: [] };
      case "2sg":
        return { pattern: "/sIn/", rules: [] };
      case "1pl":
        return { pattern: "/Iz/", rules: [] };
      case "2pl":
        return { pattern: "/sInIz/", rules: [] };
      case "3pl":
        return { pattern: "/lAr/", rules: [] };
      default:
        return { pattern: "", rules: [] };
    }
  }

  switch (state.features.agreement) {
    case "1sg":
      return { pattern: "/Im/", rules: ["consonant_mutation_trigger"] as const };
    case "2sg":
      return { pattern: "/sIn/", rules: [] };
    case "1pl":
      return { pattern: "/Iz/", rules: ["consonant_mutation_trigger"] as const };
    case "2pl":
      return { pattern: "/sInIz/", rules: [] };
    case "3pl":
      return { pattern: "/lAr/", rules: [] };
    default:
      return { pattern: "", rules: [] };
  }
}

function getLastPostfiniteOverlayType(
  state: MorphologicalStateV2,
): PostfiniteOverlayType | null {
  const lastPostfiniteToken = [...state.tokens]
    .reverse()
    .find((token) => token.kind === "postfinite");

  if (!lastPostfiniteToken || lastPostfiniteToken.kind !== "postfinite") {
    return null;
  }

  return getPostfiniteOverlay(lastPostfiniteToken.overlayId).overlayType;
}

function resolvePredicativeAgreementPattern(
  state: MorphologicalStateV2,
  surface: string,
) {
  const lastPostfiniteOverlayType = getLastPostfiniteOverlayType(state);
  const vowelFinal = endsWithVowel(surface);
  const usesPastLikeAgreement =
    lastPostfiniteOverlayType === "copula_past" ||
    lastPostfiniteOverlayType === "conditional";

  if (usesPastLikeAgreement) {
    switch (state.features.agreement) {
      case "1sg":
        return { pattern: "/m/", rules: [] };
      case "2sg":
        return { pattern: "/n/", rules: [] };
      case "1pl":
        return { pattern: "/k/", rules: [] };
      case "2pl":
        return { pattern: "/nIz/", rules: [] };
      case "3pl":
        return { pattern: "/lAr/", rules: [] };
      default:
        return { pattern: "", rules: [] };
    }
  }

  switch (state.features.agreement) {
    case "1sg":
      return {
        pattern: vowelFinal ? "/yIm/" : "/Im/",
        rules: vowelFinal ? [] : (["consonant_mutation_trigger"] as const),
      };
    case "2sg":
      return { pattern: "/sIn/", rules: [] };
    case "1pl":
      return {
        pattern: vowelFinal ? "/yIz/" : "/Iz/",
        rules: vowelFinal ? [] : (["consonant_mutation_trigger"] as const),
      };
    case "2pl":
      return { pattern: "/sInIz/", rules: [] };
    case "3pl":
      return { pattern: "/lAr/", rules: [] };
    default:
      return { pattern: "", rules: [] };
  }
}

function resolvePostfiniteRecipe(
  overlay: PostfiniteOverlayDefinition,
  currentSurface: string,
) {
  const vowelFinal = endsWithVowel(currentSurface);

  switch (overlay.overlayType) {
    case "question":
      return { pattern: "/mI/", rules: [] as const, separator: " " };
    case "copula_past":
      return {
        pattern: vowelFinal ? "/yDI/" : "/DI/",
        rules: ["consonant_assimilation"] as const,
        separator: "",
      };
    case "copula_evidential":
      return {
        pattern: vowelFinal ? "/ymIş/" : "/mIş/",
        rules: [] as const,
        separator: "",
      };
    case "conditional":
      return {
        pattern: vowelFinal ? "/ysA/" : "/sA/",
        rules: [] as const,
        separator: "",
      };
    case "while":
      return {
        pattern: vowelFinal ? "/yken/" : "/ken/",
        rules: [] as const,
        separator: "",
      };
    default:
      return { pattern: "", rules: [] as const, separator: "" };
  }
}

function resolveTokenRecipe(
  state: MorphologicalStateV2,
  morpheme: MorphemeDefinition,
  currentSurface: string,
): {
  workingSurface: string;
  pattern: string;
  rules: readonly string[];
  setupEvents: MorphologyEvent[];
} {
  const setupEvents: MorphologyEvent[] = [];

  switch (morpheme.id) {
    case "noun.number.pl":
      return { workingSurface: currentSurface, pattern: "/lAr/", rules: [], setupEvents };
    case "noun.possessive.p1sg":
    case "noun.possessive.p2sg":
    case "noun.possessive.p3sg":
    case "noun.possessive.p1pl":
    case "noun.possessive.p2pl":
    case "noun.possessive.p3pl": {
      const resolved = resolveNounPossessivePattern(currentSurface, state);
      return {
        workingSurface: currentSurface,
        pattern: resolved.pattern,
        rules: resolved.rules,
        setupEvents,
      };
    }
    case "noun.case.acc":
    case "noun.case.dat":
    case "noun.case.loc":
    case "noun.case.abl":
    case "noun.case.gen": {
      const resolved = resolveNounCasePattern(state);
      return {
        workingSurface: currentSurface,
        pattern: resolved.pattern,
        rules: resolved.rules,
        setupEvents,
      };
    }
    case "verb.polarity.neg":
      return { workingSurface: currentSurface, pattern: "/mA/", rules: [], setupEvents };
    case "verb.tam.aor": {
      const resolved = resolveVerbAorPattern(state, currentSurface);
      return {
        workingSurface: currentSurface,
        pattern: resolved.pattern,
        rules: [...resolved.rules, "consonant_mutation_trigger"],
        setupEvents: [...setupEvents, ...resolved.events],
      };
    }
    case "verb.tam.prog": {
      if (endsWithVowel(currentSurface)) {
        const droppedSurface = currentSurface.slice(0, -1);
        setupEvents.push(
          createEvent(
            "progressive_vowel_drop",
            "events.progressiveVowelDrop",
            {
              before: currentSurface.at(-1) ?? "",
              after: "",
            },
            state,
            morpheme,
            currentSurface.at(-1) ?? "",
            "",
          ),
        );

        return {
          workingSurface: droppedSurface,
          pattern: "/Iyor/",
          rules: ["consonant_mutation_trigger"],
          setupEvents,
        };
      }

      return {
        workingSurface: currentSurface,
        pattern: "/Iyor/",
        rules: ["consonant_mutation_trigger"],
        setupEvents,
      };
    }
    case "verb.tam.past":
      return {
        workingSurface: currentSurface,
        pattern: "/DI/",
        rules: ["consonant_assimilation"],
        setupEvents,
      };
    case "verb.tam.fut":
      return {
        workingSurface: currentSurface,
        pattern: "/AcAk/",
        rules: ["buffer_y", "consonant_mutation_trigger"],
        setupEvents,
      };
    case "verb.agreement.1sg":
    case "verb.agreement.2sg":
    case "verb.agreement.1pl":
    case "verb.agreement.2pl":
    case "verb.agreement.3pl": {
      const resolved = resolveVerbAgreementPattern(state);
      return {
        workingSurface: currentSurface,
        pattern: resolved.pattern,
        rules: resolved.rules,
        setupEvents,
      };
    }
    case "predicative.agreement.1sg":
    case "predicative.agreement.2sg":
    case "predicative.agreement.1pl":
    case "predicative.agreement.2pl":
    case "predicative.agreement.3pl": {
      const resolved = resolvePredicativeAgreementPattern(state, currentSurface);
      return {
        workingSurface: currentSurface,
        pattern: resolved.pattern,
        rules: resolved.rules,
        setupEvents,
      };
    }
    case "predicative.assertive.dIr":
      return {
        workingSurface: currentSurface,
        pattern: "/DIr/",
        rules: ["consonant_assimilation"],
        setupEvents,
      };
    default:
      return {
        workingSurface: currentSurface,
        pattern: morpheme.realizationPattern,
        rules: morpheme.phonologyTriggers,
        setupEvents,
      };
  }
}

export function realizeMorphologicalState(
  state: MorphologicalStateV2,
): RealizationResult {
  let currentSurface = state.lexeme.rootSurface;
  const traces: RealizationTrace[] = [];

  state.tokens.forEach((token) => {
    if (token.kind === "analytic") {
      const construction = getAnalyticConstruction(token.constructionId);
      const phonologyState = createPhonologyState(
        state,
        currentSurface,
        construction.sourcePos,
      );
      const realizedLinker = realizeAffix(
        phonologyState,
        construction.linkerPattern,
        construction.linkerPhonologyTriggers,
        { slot: "analytic", morphemeId: construction.id },
      );
      const analyticSurface = `${realizedLinker.surfaceSuffix}${construction.separator ?? ""}${construction.auxiliarySurface}`;
      const afterSurface = `${realizedLinker.stem}${analyticSurface}`;

      traces.push({
        tokenId: token.id,
        constructionId: construction.id,
        slot: "analytic",
        labelKey: construction.labelKey,
        pattern: `${construction.linkerPattern}+${construction.auxiliarySurface}`,
        beforeSurface: currentSurface,
        afterSurface,
        surface: analyticSurface,
        events: realizedLinker.events,
      });

      currentSurface = afterSurface;
      return;
    }

    if (token.kind === "postfinite") {
      const overlay = getPostfiniteOverlay(token.overlayId);
      const recipe = resolvePostfiniteRecipe(overlay, currentSurface);
      const phonologyState = createPhonologyState(
        state,
        currentSurface,
        state.currentPos,
      );
      const realizedOverlay = realizeAffix(
        phonologyState,
        recipe.pattern,
        [...recipe.rules],
        { slot: "postfinite", morphemeId: overlay.id },
      );
      const overlaySurface = `${recipe.separator}${realizedOverlay.surfaceSuffix}`;
      const afterSurface = `${realizedOverlay.stem}${overlaySurface}`;

      traces.push({
        tokenId: token.id,
        overlayId: overlay.id,
        slot: "postfinite",
        labelKey: overlay.labelKey,
        pattern: recipe.pattern,
        beforeSurface: currentSurface,
        afterSurface,
        surface: overlaySurface,
        events: realizedOverlay.events,
      });

      currentSurface = afterSurface;
      return;
    }

    const morpheme = getMorpheme(token.morphemeId);
    const recipe = resolveTokenRecipe(state, morpheme, currentSurface);
    const overridePattern =
      state.lexeme.allomorphOverrides?.[morpheme.id] ?? recipe.pattern;
    const overrideEvents =
      overridePattern !== recipe.pattern
        ? [
            createEvent(
              "lexeme_override_applied",
              "events.lexemeOverrideApplied",
              {
                morphemeKey: morpheme.labelKey,
                pattern: overridePattern,
              },
              state,
              morpheme,
            ),
          ]
        : [];

    const phonologyState = createPhonologyState(
      state,
      recipe.workingSurface,
      morpheme.sourcePos,
    );
    const realized = realizeAffix(
      phonologyState,
      overridePattern,
      recipe.rules as Parameters<typeof realizeAffix>[2],
      { slot: morpheme.slot, morphemeId: morpheme.id },
    );
    const afterSurface = `${realized.stem}${realized.surfaceSuffix}`;

    traces.push({
      tokenId: token.id,
      morphemeId: morpheme.id,
      slot: morpheme.slot,
      labelKey: morpheme.labelKey,
      pattern: overridePattern,
      beforeSurface: currentSurface,
      afterSurface,
      surface: realized.surfaceSuffix,
      events: [...recipe.setupEvents, ...overrideEvents, ...realized.events],
    });

    currentSurface = afterSurface;
  });

  return {
    surface: currentSurface,
    segments: traces.map((trace) => ({
      tokenId: trace.tokenId,
      morphemeId: trace.morphemeId,
      constructionId: trace.constructionId,
      overlayId: trace.overlayId,
      slot: trace.slot,
      labelKey: trace.labelKey,
      pattern: trace.pattern,
      surface: trace.surface,
    })),
    events: traces.flatMap((trace) => trace.events),
    traces,
  };
}

export function buildTraceDiff(beforeSurface: string, afterSurface: string) {
  return buildHighlightDiff(beforeSurface, afterSurface);
}
