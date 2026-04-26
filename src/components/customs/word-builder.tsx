"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  CardBody,
  Chip,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  ArrowRight,
  Blocks,
  CornerDownLeft,
  Languages,
  Orbit,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link as NextIntlLink } from "@/src/i18n/routing";
import { useDebounce } from "@/src/hooks/use-debounce";
import { sortDictionarySuggestions } from "@/src/lib/search-suggestions";
import { api, type RouterOutputs } from "@/src/trpc/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import CustomCard from "./heroui/custom-card";
import {
  splitActionsByRarity,
  sortActionsForDisplay,
  suppressLowFrequencyDerivations,
  createLexemeEntryFromRoot,
  getSlotTranslationKey,
  TurkishMorphologyEngine,
  type DiffSegment,
  type LexemeInitialCategory,
  type MorphologicalAction,
  type MorphologicalStateV2,
  type MorphologyAttestation,
  type MorphologyEvent,
  type RootLexeme,
} from "@/src/lib/morphology";

type MutationMode = "auto" | "always" | "never";
type BuilderLexicalCategory = LexemeInitialCategory;
type DictionarySuggestion = RouterOutputs["search"]["getWords"][number];
type DictionaryLookup = RouterOutputs["word"]["getWord"];
type BuilderSection = {
  key: string;
  titleKey: string;
  kind: MorphologicalAction["kind"];
  actions: MorphologicalAction[];
};
type CandidateDerivationAction = {
  actionId: string;
  surface: string;
  cacheKey: string;
};
type ActionTabKey =
  | "recommended"
  | "derivational"
  | "analytic"
  | "nonfinite"
  | "inflectional"
  | "postfinite";

const ACTION_TAB_ORDER: ActionTabKey[] = [
  "recommended",
  "derivational",
  "analytic",
  "nonfinite",
  "inflectional",
  "postfinite",
];

const engine = new TurkishMorphologyEngine();

const ROOT_SAMPLES: Array<{
  surface: string;
  pos: BuilderLexicalCategory;
  origin: "native" | "foreign";
  mutationMode: MutationMode;
}> = [
    { surface: "kitap", pos: "Noun", origin: "native", mutationMode: "auto" },
    { surface: "aile", pos: "Noun", origin: "native", mutationMode: "auto" },
    { surface: "ev", pos: "Noun", origin: "native", mutationMode: "auto" },
    { surface: "güzel", pos: "Adjective", origin: "native", mutationMode: "auto" },
    { surface: "yaz", pos: "Verb", origin: "native", mutationMode: "auto" },
    { surface: "gör", pos: "Verb", origin: "native", mutationMode: "auto" },
    { surface: "link", pos: "Noun", origin: "foreign", mutationMode: "auto" },
  ];

function createRootLexeme(
  surface: string,
  category: BuilderLexicalCategory,
  origin: "native" | "foreign",
  mutationMode: MutationMode,
): RootLexeme {
  const normalizedSurface = surface.trim().toLocaleLowerCase("tr");
  const pos = category === "Verb" ? "Verb" : "Noun";

  return {
    surface: normalizedSurface,
    pos,
    category,
    origin,
    forceConsonantMutation: mutationMode === "always",
    allowConsonantMutation: mutationMode === "never" ? false : undefined,
  };
}

function createBuilderState(root: RootLexeme) {
  return engine.initializeState(createLexemeEntryFromRoot(root));
}

function renderDiff(segments: DiffSegment[], mode: "before" | "after") {
  return segments.map((segment, index) => {
    const content = mode === "before" ? segment.before : segment.after;

    if (!content) {
      return null;
    }

    return (
      <span
        key={`${mode}-${index}-${content}`}
        className={segment.changed ? "rounded-md bg-primary/15 px-1.5 py-0.5 text-primary" : undefined}
      >
        {content}
      </span>
    );
  });
}

function mapDictionaryPos(value?: string): BuilderLexicalCategory | null {
  const normalized = value?.trim().toLocaleLowerCase("tr");

  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("fiil") ||
    normalized.includes("eylem") ||
    normalized === "verb"
  ) {
    return "Verb";
  }

  if (
    normalized.includes("sıfat") ||
    normalized === "adjective"
  ) {
    return "Adjective";
  }

  if (
    normalized.includes("isim") ||
    normalized === "ad" ||
    normalized === "noun"
  ) {
    return "Noun";
  }

  return null;
}

function extractDictionaryPosOptions(result: DictionaryLookup | undefined): BuilderLexicalCategory[] {
  const posSet = new Set<BuilderLexicalCategory>();

  result?.[0]?.word_data.meanings.forEach((meaning) => {
    const mapped = mapDictionaryPos(meaning.part_of_speech);
    if (mapped) {
      posSet.add(mapped);
    }
  });

  return Array.from(posSet);
}

function extractDictionaryOrigin(result: DictionaryLookup | undefined): "native" | "foreign" {
  const languageCode =
    result?.[0]?.word_data.root.language_code?.toLocaleLowerCase("tr");

  return languageCode && languageCode !== "tr" ? "foreign" : "native";
}

function getActionSections(actions: MorphologicalAction[]): BuilderSection[] {
  const derivationalGroups = new Map<string, MorphologicalAction[]>();
  const analyticGroups = new Map<string, MorphologicalAction[]>();
  const nonfiniteGroups = new Map<string, MorphologicalAction[]>();
  const inflectionGroups = new Map<string, MorphologicalAction[]>();
  const postfiniteGroups = new Map<string, MorphologicalAction[]>();

  actions.forEach((action) => {
    const groupMap =
      action.kind === "derivational"
        ? derivationalGroups
        : action.kind === "analytic"
          ? analyticGroups
          : action.kind === "nonfinite"
            ? nonfiniteGroups
            : action.kind === "postfinite"
              ? postfiniteGroups
              : inflectionGroups;
    const key = action.kind === "inflectional" ? action.slot : action.group;
    const currentActions = groupMap.get(key) ?? [];
    currentActions.push(action);
    groupMap.set(key, currentActions);
  });

  return [
    ...Array.from(derivationalGroups.entries()).map(([key, groupedActions]) => ({
      key,
      titleKey: `groups.${key}`,
      kind: "derivational" as const,
      actions: groupedActions,
    })),
    ...Array.from(analyticGroups.entries()).map(([key, groupedActions]) => ({
      key,
      titleKey: `groups.${key}`,
      kind: "analytic" as const,
      actions: groupedActions,
    })),
    ...Array.from(nonfiniteGroups.entries()).map(([key, groupedActions]) => ({
      key,
      titleKey: `groups.${key}`,
      kind: "nonfinite" as const,
      actions: groupedActions,
    })),
    ...Array.from(postfiniteGroups.entries()).map(([key, groupedActions]) => ({
      key,
      titleKey: `groups.${key}`,
      kind: "postfinite" as const,
      actions: groupedActions,
    })),
    ...Array.from(inflectionGroups.entries()).map(([key, groupedActions]) => ({
      key,
      titleKey: getSlotTranslationKey(key as MorphologicalAction["slot"]),
      kind: "inflectional" as const,
      actions: groupedActions,
    })),
  ];
}

function getActionTabLabelKey(tab: ActionTabKey) {
  switch (tab) {
    case "recommended":
      return "tabRecommended";
    case "derivational":
      return "availableDerivations";
    case "analytic":
      return "availableAnalytics";
    case "nonfinite":
      return "availableNonfinite";
    case "inflectional":
      return "availableInflections";
    case "postfinite":
      return "availablePostfinite";
    default:
      return "availableSuffixes";
  }
}

function getRecommendedSections(
  sections: BuilderSection[],
  phase: MorphologicalStateV2["phase"],
  attestationByActionId: Record<
    string,
    MorphologyAttestation | null | undefined
  > = {},
): BuilderSection[] {
  const priorities: Record<MorphologicalAction["kind"], number> =
    phase === "inflection"
      ? {
        inflectional: 0,
        postfinite: 1,
        nonfinite: 2,
        analytic: 3,
        derivational: 4,
      }
      : phase === "postfinite"
        ? {
          postfinite: 0,
          inflectional: 1,
          nonfinite: 2,
          analytic: 3,
          derivational: 4,
        }
        : {
          derivational: 0,
          nonfinite: 1,
          analytic: 2,
          inflectional: 3,
          postfinite: 4,
        };

  const preparedSections = sections
    .map((section) => ({
      ...section,
      actions: sortActionsForDisplay(
        section.kind === "derivational"
          ? suppressLowFrequencyDerivations(
            section.actions,
            attestationByActionId,
          )
          : section.actions,
        attestationByActionId,
      ),
    }))
    .filter((section) => section.actions.length > 0);

  const sortedSections = [...preparedSections].sort(
    (left, right) => priorities[left.kind] - priorities[right.kind],
  );
  const recommended: BuilderSection[] = [];
  let remaining = 8;

  sortedSections.forEach((section, index) => {
    if (remaining <= 0) {
      return;
    }

    const cap = index === 0 ? 3 : 2;
    const actions = section.actions.slice(0, Math.min(cap, remaining));

    if (actions.length > 0) {
      recommended.push({ ...section, actions });
      remaining -= actions.length;
    }
  });

  return recommended;
}

function getTabSections(
  tab: ActionTabKey,
  sections: BuilderSection[],
  phase: MorphologicalStateV2["phase"],
  attestationByActionId: Record<
    string,
    MorphologyAttestation | null | undefined
  > = {},
) {
  if (tab === "recommended") {
    return getRecommendedSections(sections, phase, attestationByActionId);
  }

  return sections
    .filter((section) => section.kind === tab)
    .map((section) => ({
      ...section,
      actions: sortActionsForDisplay(section.actions, attestationByActionId),
    }));
}

function getSectionStorageKey(tab: ActionTabKey, section: BuilderSection) {
  return `${tab}:${section.kind}:${section.key}`;
}

function getLocalizedPos(
  t: ReturnType<typeof useTranslations>,
  pos: "Noun" | "Verb" | "Adjective" | "Adverb",
) {
  if (pos === "Adjective") {
    return t("posAdjective");
  }

  if (pos === "Adverb") {
    return t("posAdverb");
  }

  return pos === "Noun" ? t("posNoun") : t("posVerb");
}

function getLocalizedCategory(
  t: ReturnType<typeof useTranslations>,
  category: MorphologicalStateV2["currentCategory"],
) {
  switch (category) {
    case "VerbalNoun":
      return t("categoryVerbalNoun");
    case "Participle":
      return t("categoryParticiple");
    case "Converb":
      return t("categoryConverb");
    case "Adjective":
      return t("categoryAdjective");
    case "Adverb":
      return t("categoryAdverb");
    case "Predicative":
      return t("categoryPredicative");
    default:
      return getLocalizedPos(t, category as BuilderLexicalCategory);
  }
}

function getLocalizedPhase(
  t: ReturnType<typeof useTranslations>,
  phase: MorphologicalStateV2["phase"],
) {
  if (phase === "inflection") {
    return t("phaseInflection");
  }

  if (phase === "postfinite") {
    return t("phasePostFinite");
  }

  return t("phaseDerivation");
}

function getEventMessage(
  t: ReturnType<typeof useTranslations>,
  event: MorphologyEvent,
) {
  if (event.code === "action_applied") {
    return `${t(event.i18nKey)}: ${t(event.params.actionKey)}`;
  }

  if (event.code === "derivation_applied") {
    return t(event.i18nKey, {
      action: t(event.params.actionKey),
      before: getLocalizedPos(t, event.params.before as BuilderLexicalCategory),
      after: getLocalizedPos(t, event.params.after as BuilderLexicalCategory),
    });
  }

  if (event.code === "analytic_applied") {
    return t(event.i18nKey, {
      action: t(event.params.actionKey),
    });
  }

  if (event.code === "postfinite_applied") {
    return t(event.i18nKey, {
      action: t(event.params.actionKey),
    });
  }

  if (event.code === "phase_change") {
    return t(event.i18nKey, {
      before: getLocalizedPhase(t, event.params.before as MorphologicalStateV2["phase"]),
      after: getLocalizedPhase(t, event.params.after as MorphologicalStateV2["phase"]),
    });
  }

  if (event.code === "pos_change") {
    return t(event.i18nKey, {
      before: getLocalizedPos(t, event.params.before as BuilderLexicalCategory),
      after: getLocalizedPos(t, event.params.after as BuilderLexicalCategory),
    });
  }

  if (event.code === "lexeme_override_applied") {
    return `${t(event.i18nKey)}: ${t(event.params.morphemeKey)} -> ${event.params.pattern}`;
  }

  return t(event.i18nKey, event.params);
}

function buildAttestationEvent(
  step: number,
  action: MorphologicalAction,
  attestation: MorphologyAttestation,
  surface: string,
): MorphologyEvent {
  return {
    code: attestation.matched ? "attestation_match_found" : "attestation_match_missing",
    i18nKey: attestation.matched
      ? "events.attestationMatchFound"
      : "events.attestationMatchMissing",
    params: {
      word: attestation.wordName ?? surface,
    },
    stage: "lexicon",
    slot: action.slot,
    morphemeId:
      action.kind === "analytic"
        ? `${action.constructionId}#${step}`
        : action.kind === "postfinite"
          ? `${action.overlayId}#${step}`
          : `${action.morphemeId}#${step}`,
  };
}

function attachAttestationToState(
  state: MorphologicalStateV2,
  stepNumber: number,
  surface: string,
  attestation: MorphologyAttestation,
): MorphologicalStateV2 {
  const existing = state.attestationCache[surface];
  if (
    existing?.matched === attestation.matched &&
    existing?.wordId === attestation.wordId &&
    existing?.wordName === attestation.wordName
  ) {
    return state;
  }

  return {
    ...state,
    attestationCache: {
      ...state.attestationCache,
      [surface]: attestation,
    },
    history: state.history.map((entry) => {
      if (entry.step !== stepNumber) {
        return entry;
      }

      const filteredEvents = entry.log.events.filter(
        (event) =>
          event.code !== "attestation_match_found" &&
          event.code !== "attestation_match_missing",
      );
      const attestationEvent = buildAttestationEvent(
        stepNumber,
        entry.action,
        attestation,
        surface,
      );

      return {
        ...entry,
        attestation,
        log: {
          ...entry.log,
          events: [...filteredEvents, attestationEvent],
          explanationArray: [...filteredEvents, attestationEvent].map(
            (event) => event.i18nKey,
          ),
        },
      };
    }),
  };
}

export default function WordBuilder() {
  const t = useTranslations("WordBuilder");
  const utils = api.useUtils();
  const initialSample = ROOT_SAMPLES[0];
  const initialRoot = createRootLexeme(
    initialSample.surface,
    initialSample.pos,
    initialSample.origin,
    initialSample.mutationMode,
  );

  const [draftSurface, setDraftSurface] = useState(initialSample.surface);
  const [draftPos, setDraftPos] = useState<BuilderLexicalCategory>(initialSample.pos);
  const [draftOrigin, setDraftOrigin] = useState<"native" | "foreign">(
    initialSample.origin,
  );
  const [draftMutationMode, setDraftMutationMode] =
    useState<MutationMode>(initialSample.mutationMode);
  const [dictionaryQuery, setDictionaryQuery] = useState("");
  const [selectedDictionaryWord, setSelectedDictionaryWord] =
    useState<DictionarySuggestion | null>(null);
  const [selectedDictionaryPos, setSelectedDictionaryPos] =
    useState<BuilderLexicalCategory | null>(null);
  const [activeActionTab, setActiveActionTab] =
    useState<ActionTabKey>("recommended");
  const [selectedStepNumber, setSelectedStepNumber] = useState<number | null>(null);
  const [expandedRareSections, setExpandedRareSections] = useState<
    Record<string, boolean>
  >({});
  const [candidateAttestationCache, setCandidateAttestationCache] = useState<
    Record<string, MorphologyAttestation | null>
  >({});
  const [builderState, setBuilderState] = useState<MorphologicalStateV2>(
    createBuilderState(initialRoot),
  );
  const previousHistoryLengthRef = useRef(builderState.history.length);

  const debouncedDictionaryQuery = useDebounce(dictionaryQuery, 250);
  const dictionarySuggestionsQuery = api.search.getWords.useQuery(
    { query: debouncedDictionaryQuery },
    { enabled: debouncedDictionaryQuery.trim().length >= 2 },
  );
  const dictionarySuggestions = useMemo(
    () =>
      sortDictionarySuggestions(
        dictionarySuggestionsQuery.data ?? [],
        dictionaryQuery,
      ),
    [dictionaryQuery, dictionarySuggestionsQuery.data],
  );
  const selectedDictionaryWordQuery = api.word.getWord.useQuery(
    {
      name: selectedDictionaryWord?.name ?? "",
      skipLogging: true,
    },
    { enabled: Boolean(selectedDictionaryWord?.name) },
  );

  const dictionaryPosOptions = useMemo(
    () => extractDictionaryPosOptions(selectedDictionaryWordQuery.data),
    [selectedDictionaryWordQuery.data],
  );
  const dictionaryOrigin = useMemo(
    () => extractDictionaryOrigin(selectedDictionaryWordQuery.data),
    [selectedDictionaryWordQuery.data],
  );

  useEffect(() => {
    if (!selectedDictionaryWord) {
      return;
    }

    setDraftSurface(selectedDictionaryWord.name);
    setDraftOrigin(dictionaryOrigin);

    if (dictionaryPosOptions.length === 1) {
      setSelectedDictionaryPos(dictionaryPosOptions[0]);
    } else if (
      selectedDictionaryPos &&
      !dictionaryPosOptions.includes(selectedDictionaryPos)
    ) {
      setSelectedDictionaryPos(null);
    }
  }, [
    dictionaryOrigin,
    dictionaryPosOptions,
    selectedDictionaryPos,
    selectedDictionaryWord,
  ]);

  useEffect(() => {
    const pendingAttestations = builderState.history
      .filter((step) => step.action.kind === "derivational")
      .map((step) => ({
        stepNumber: step.step,
        surface: step.afterState.surface ?? step.log.afterSurface,
      }))
      .filter(
        (item) =>
          item.surface &&
          !Object.prototype.hasOwnProperty.call(
            builderState.attestationCache,
            item.surface,
          ),
      );

    if (pendingAttestations.length === 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      for (const pending of pendingAttestations) {
        let attestation: MorphologyAttestation = {
          matched: false,
          wordName: pending.surface,
        };

        try {
          const result = await utils.word.getWord.fetch({
            name: pending.surface,
            skipLogging: true,
          });
          const matchedWord = result?.[0]?.word_data;

          if (
            matchedWord &&
            matchedWord.word_name.toLocaleLowerCase("tr") ===
            pending.surface.toLocaleLowerCase("tr")
          ) {
            attestation = {
              matched: true,
              wordId: matchedWord.word_id,
              wordName: matchedWord.word_name,
            };
          }
        } catch {
          attestation = {
            matched: false,
            wordName: pending.surface,
          };
        }

        if (cancelled) {
          return;
        }

        setBuilderState((current) =>
          attachAttestationToState(
            current,
            pending.stepNumber,
            pending.surface,
            attestation,
          ),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [builderState.attestationCache, builderState.history, utils.word.getWord]);

  const realization = engine.realize(builderState);
  const availableActions = engine.getAvailableActions(builderState);
  const derivationCandidates = useMemo<CandidateDerivationAction[]>(
    () =>
      availableActions
        .filter((action) => action.kind === "derivational")
        .map((action) => {
          const nextState = engine.applyAction(builderState, action.id);
          const surface = engine.realize(nextState).surface;

          return {
            actionId: action.id,
            surface,
            cacheKey: `${action.id}::${surface}`,
          };
        }),
    [availableActions, builderState],
  );
  const candidateAttestationByActionId = useMemo(
    () =>
      derivationCandidates.reduce<Record<string, MorphologyAttestation | null | undefined>>(
        (accumulator, candidate) => {
          accumulator[candidate.actionId] =
            builderState.attestationCache[candidate.surface] ??
            candidateAttestationCache[candidate.cacheKey];
          return accumulator;
        },
        {},
      ),
    [builderState.attestationCache, candidateAttestationCache, derivationCandidates],
  );

  useEffect(() => {
    const pendingCandidates = derivationCandidates.filter((candidate) => {
      if (builderState.attestationCache[candidate.surface]) {
        return false;
      }

      return !Object.prototype.hasOwnProperty.call(
        candidateAttestationCache,
        candidate.cacheKey,
      );
    });

    if (pendingCandidates.length === 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      for (const pending of pendingCandidates) {
        let attestation: MorphologyAttestation = {
          matched: false,
          wordName: pending.surface,
        };

        try {
          const result = await utils.word.getWord.fetch({
            name: pending.surface,
            skipLogging: true,
          });
          const matchedWord = result?.[0]?.word_data;

          if (
            matchedWord &&
            matchedWord.word_name.toLocaleLowerCase("tr") ===
            pending.surface.toLocaleLowerCase("tr")
          ) {
            attestation = {
              matched: true,
              wordId: matchedWord.word_id,
              wordName: matchedWord.word_name,
            };
          }
        } catch {
          attestation = {
            matched: false,
            wordName: pending.surface,
          };
        }

        if (cancelled) {
          return;
        }

        setCandidateAttestationCache((current) => ({
          ...current,
          [pending.cacheKey]: attestation,
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    builderState.attestationCache,
    candidateAttestationCache,
    derivationCandidates,
    utils.word.getWord,
  ]);
  const actionSections = useMemo(
    () => getActionSections(availableActions),
    [availableActions],
  );
  const visibleActionSections = useMemo(
    () =>
      getTabSections(
        activeActionTab,
        actionSections,
        builderState.phase,
        candidateAttestationByActionId,
      ),
    [
      actionSections,
      activeActionTab,
      builderState.phase,
      candidateAttestationByActionId,
    ],
  );
  const selectedHistoryEntry = useMemo(
    () =>
      builderState.history.find((step) => step.step === selectedStepNumber) ??
      builderState.history.at(-1) ??
      null,
    [builderState.history, selectedStepNumber],
  );
  const selectedPos =
    selectedDictionaryWord && dictionaryPosOptions.length > 0
      ? dictionaryPosOptions.length === 1
        ? dictionaryPosOptions[0]
        : selectedDictionaryPos
      : draftPos;
  const canStart = selectedDictionaryWord
    ? Boolean(selectedPos) && !selectedDictionaryWordQuery.isLoading
    : draftSurface.trim().length > 0;
  const currentAttestation = builderState.attestationCache[realization.surface] ?? null;
  const showInflectionLockNotice =
    builderState.phase === "inflection" &&
    availableActions.every(
      (action) => action.kind === "inflectional" || action.kind === "postfinite",
    );
  const actionTabCounts = useMemo(
    () => ({
      recommended: getRecommendedSections(
        actionSections,
        builderState.phase,
        candidateAttestationByActionId,
      ).reduce(
        (total, section) => total + section.actions.length,
        0,
      ),
      derivational: actionSections
        .filter((section) => section.kind === "derivational")
        .reduce((total, section) => total + section.actions.length, 0),
      analytic: actionSections
        .filter((section) => section.kind === "analytic")
        .reduce((total, section) => total + section.actions.length, 0),
      nonfinite: actionSections
        .filter((section) => section.kind === "nonfinite")
        .reduce((total, section) => total + section.actions.length, 0),
      inflectional: actionSections
        .filter((section) => section.kind === "inflectional")
        .reduce((total, section) => total + section.actions.length, 0),
      postfinite: actionSections
        .filter((section) => section.kind === "postfinite")
        .reduce((total, section) => total + section.actions.length, 0),
    }),
    [actionSections, builderState.phase, candidateAttestationByActionId],
  );

  useEffect(() => {
    const previousLength = previousHistoryLengthRef.current;
    const currentLength = builderState.history.length;

    if (currentLength === 0) {
      if (selectedStepNumber !== null) {
        setSelectedStepNumber(null);
      }
      previousHistoryLengthRef.current = 0;
      return;
    }

    if (currentLength > previousLength) {
      setSelectedStepNumber(builderState.history[currentLength - 1]?.step ?? null);
      previousHistoryLengthRef.current = currentLength;
      return;
    }

    if (
      selectedStepNumber !== null &&
      !builderState.history.some((step) => step.step === selectedStepNumber)
    ) {
      setSelectedStepNumber(builderState.history[currentLength - 1]?.step ?? null);
    }

    previousHistoryLengthRef.current = currentLength;
  }, [builderState.history, selectedStepNumber]);

  const startBuilder = () => {
    if (!canStart || !selectedPos) {
      return;
    }

    const rootSurface = selectedDictionaryWord?.name ?? draftSurface;
    const rootOrigin = selectedDictionaryWord ? dictionaryOrigin : draftOrigin;

    setBuilderState(
      createBuilderState(
        createRootLexeme(
          rootSurface,
          selectedPos,
          rootOrigin,
          draftMutationMode,
        ),
      ),
    );
    setExpandedRareSections({});
    setCandidateAttestationCache({});
  };

  const applyAction = (actionId: string) => {
    setBuilderState((current) => engine.applyAction(current, actionId));
    setExpandedRareSections({});
  };

  const clearDictionarySelection = () => {
    setSelectedDictionaryWord(null);
    setSelectedDictionaryPos(null);
    setDictionaryQuery("");
  };

  const applySample = (sample: (typeof ROOT_SAMPLES)[number]) => {
    clearDictionarySelection();
    setDraftSurface(sample.surface);
    setDraftPos(sample.pos);
    setDraftOrigin(sample.origin);
    setDraftMutationMode(sample.mutationMode);
    setBuilderState(
      createBuilderState(
        createRootLexeme(
          sample.surface,
          sample.pos,
          sample.origin,
          sample.mutationMode,
        ),
      ),
    );
    setExpandedRareSections({});
    setCandidateAttestationCache({});
  };

  const undoLastStep = () => {
    setBuilderState((current) => engine.undoAction(current));
    setExpandedRareSections({});
  };

  const resetSteps = () => {
    setBuilderState((current) =>
      createBuilderState({
        surface: current.lexeme.rootSurface,
        pos: current.lexeme.pos,
        category: current.lexeme.initialCategory,
        origin: current.lexeme.origin,
        forceConsonantMutation: current.lexeme.mutationPolicy === "always",
        allowConsonantMutation:
          current.lexeme.mutationPolicy === "never" ? false : undefined,
        mutationOverrides: current.lexeme.mutationOverrides,
      }),
    );
    setExpandedRareSections({});
    setCandidateAttestationCache({});
  };

  const renderActionCard = (section: BuilderSection, action: MorphologicalAction) => {
    const attestation =
      section.kind === "derivational"
        ? candidateAttestationByActionId[action.id]
        : undefined;

    return (
      <button
        key={action.id}
        type="button"
        onClick={() => applyAction(action.id)}
        className="group rounded-md border border-border/70 bg-background/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base font-semibold text-foreground">
                {t(action.labelKey)}
              </div>
              {section.kind === "derivational" && attestation?.matched ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-primary/20 bg-primary/8 px-2 py-0.5 text-[11px] text-primary"
                >
                  {t("attestedBadge")}
                </Badge>
              ) : null}
              {section.kind === "derivational" &&
                attestation &&
                !attestation.matched ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-300"
                >
                  {t("candidateUnattestedBadge")}
                </Badge>
              ) : null}
            </div>
            <div className="mt-1 font-mono text-xs text-foreground/50">
              {action.preview}
            </div>
          </div>
          <ArrowRight className="mt-1 h-4 w-4 text-foreground/35 transition-colors group-hover:text-primary" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-foreground/60">
          {section.kind === "derivational" ||
            section.kind === "analytic" ? (
            <>
              <span className="rounded-full border border-border/70 px-2.5 py-1">
                {getLocalizedPos(t, action.sourcePos)}
              </span>
              <span className="rounded-full border border-border/70 px-2.5 py-1">
                {getLocalizedPos(t, action.targetPos)}
              </span>
            </>
          ) : null}

          {section.kind === "nonfinite" ? (
            <>
              <span className="rounded-full border border-border/70 px-2.5 py-1">
                {getLocalizedCategory(t, builderState.currentCategory)}
              </span>
              <span className="rounded-full border border-border/70 px-2.5 py-1">
                {section.key === "VerbalNoun"
                  ? t("categoryVerbalNoun")
                  : section.key === "Participle"
                    ? t("categoryParticiple")
                    : t("categoryConverb")}
              </span>
            </>
          ) : null}

          {section.kind === "inflectional" ? (
            <>
              <span className="rounded-full border border-border/70 px-2.5 py-1">
                {getLocalizedPos(t, builderState.currentPos)}
              </span>
              <span className="rounded-full border border-border/70 px-2.5 py-1">
                {t(section.titleKey)}
              </span>
            </>
          ) : null}

          {section.kind === "postfinite" ? (
            <span className="rounded-full border border-border/70 px-2.5 py-1">
              {getLocalizedPos(t, action.sourcePos)}
            </span>
          ) : null}

          <span className="rounded-full border border-border/70 px-2.5 py-1">
            {section.kind === "derivational"
              ? t("phaseDerivation")
              : section.kind === "analytic"
                ? t("analyticKind")
                : section.kind === "nonfinite"
                  ? t("nonfiniteKind")
                  : section.kind === "postfinite"
                    ? t("phasePostFinite")
                    : t("phaseInflection")}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-2 py-4 lg:py-10">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <CustomCard className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background/70 to-background/90 shadow-[0_18px_60px_-26px_rgba(194,65,12,0.65)]">
          <CardBody className="gap-6 p-2 sm:p-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border-primary/25 bg-primary/12 px-3 py-1 text-primary" variant="outline">
                  {t("titleBadge")}
                </Badge>
                <Badge className="rounded-full border-border/60 bg-background/60 px-3 py-1" variant="outline">
                  {t("phaseAware")}
                </Badge>
              </div>
              <div className="max-w-3xl space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {t("title")}
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-foreground/75 sm:text-base">
                  {t("description")}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-md border border-primary/15 bg-background/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <Languages className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                    {t("featureHarmonyTitle")}
                  </span>
                </div>
                <p className="text-sm text-foreground/75">{t("featureHarmonyBody")}</p>
              </div>
              <div className="rounded-md border border-primary/15 bg-background/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <Orbit className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                    {t("featurePhonologyTitle")}
                  </span>
                </div>
                <p className="text-sm text-foreground/75">{t("featurePhonologyBody")}</p>
              </div>
              <div className="rounded-md border border-primary/15 bg-background/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <Blocks className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                    {t("featurePosTitle")}
                  </span>
                </div>
                <p className="text-sm text-foreground/75">{t("featurePosBody")}</p>
              </div>
              <div className="rounded-md border border-primary/15 bg-background/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                    {t("featureLogTitle")}
                  </span>
                </div>
                <p className="text-sm text-foreground/75">{t("featureLogBody")}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="rounded-full bg-background/70 px-3 py-1" variant="outline">
                  {t("samples")}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {ROOT_SAMPLES.map((sample) => (
                  <button
                    key={`${sample.surface}-${sample.pos}`}
                    type="button"
                    onClick={() => applySample(sample)}
                    className="rounded-full border border-border/70 bg-background/75 px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {sample.surface}
                    <span className="ml-2 text-xs text-foreground/50">
                      {getLocalizedPos(t, sample.pos)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </CardBody>
        </CustomCard>

        <CustomCard className="border-border/70 bg-background/85 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.55)]">
          <CardBody className="gap-5 px-2 py-4 sm:p-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">{t("rootSetup")}</h2>
              <p className="text-sm text-foreground/65">{t("rootSetupHint")}</p>
            </div>

            <Autocomplete
              label={t("dictionarySearchLabel")}
              placeholder={t("dictionarySearchPlaceholder")}
              inputValue={dictionaryQuery}
              onInputChange={setDictionaryQuery}
              selectedKey={selectedDictionaryWord ? String(selectedDictionaryWord.id) : null}
              onSelectionChange={(key) => {
                const nextWord =
                  dictionarySuggestions.find(
                    (item) => String(item.id) === String(key),
                  ) ?? null;

                setSelectedDictionaryWord(nextWord);
                setSelectedDictionaryPos(null);
                setDictionaryQuery(nextWord?.name ?? "");
              }}
              isLoading={
                dictionarySuggestionsQuery.isLoading ||
                dictionarySuggestionsQuery.isFetching
              }
              items={dictionarySuggestions}
              variant="bordered"
            >
              {(item) => (
                <AutocompleteItem key={String(item.id)} textValue={item.name}>
                  {item.name}
                </AutocompleteItem>
              )}
            </Autocomplete>

            {selectedDictionaryWord ? (
              <div className="rounded-md border border-primary/20 bg-primary/8 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {t("dictionarySelectionActive")}
                    </div>
                    <div className="text-sm text-foreground/70">
                      {selectedDictionaryWord.name}
                    </div>
                  </div>
                  <Button variant="flat" size="sm" onPress={clearDictionarySelection}>
                    {t("clearDictionarySelection")}
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {dictionaryPosOptions.length > 0 ? (
                    dictionaryPosOptions.map((pos) => (
                      <Chip key={pos} variant="flat">
                        {getLocalizedPos(t, pos)}
                      </Chip>
                    ))
                  ) : (
                    <Chip variant="flat">{t("dictionaryPosLoading")}</Chip>
                  )}
                </div>
              </div>
            ) : null}

            <Input
              label={t("rootLabel")}
              placeholder={t("rootPlaceholder")}
              value={draftSurface}
              onValueChange={setDraftSurface}
              variant="bordered"
              isDisabled={Boolean(selectedDictionaryWord)}
            />

            {selectedDictionaryWord && dictionaryPosOptions.length > 1 ? (
              <Select
                label={t("dictionaryPosLabel")}
                placeholder={t("dictionaryPosPlaceholder")}
                selectedKeys={selectedDictionaryPos ? [selectedDictionaryPos] : []}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as BuilderLexicalCategory | undefined;
                  setSelectedDictionaryPos(value ?? null);
                }}
              >
                {dictionaryPosOptions.map((pos) => (
                  <SelectItem key={pos}>{getLocalizedPos(t, pos)}</SelectItem>
                ))}
              </Select>
            ) : (
              <Select
                label={t("posLabel")}
                selectedKeys={[draftPos]}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as BuilderLexicalCategory | undefined;
                  if (value) {
                    setDraftPos(value);
                  }
                }}
                isDisabled={Boolean(selectedDictionaryWord)}
              >
                <SelectItem key="Noun">{t("posNoun")}</SelectItem>
                <SelectItem key="Adjective">{t("posAdjective")}</SelectItem>
                <SelectItem key="Verb">{t("posVerb")}</SelectItem>
              </Select>
            )}

            {selectedDictionaryWord && dictionaryPosOptions.length > 1 ? (
              <p className="rounded-md border border-border/60 bg-background/60 px-4 py-3 text-sm leading-6 text-foreground/65">
                {t("dictionaryPosRequired")}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label={t("originLabel")}
                selectedKeys={[draftOrigin]}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as "native" | "foreign" | undefined;
                  if (value) {
                    setDraftOrigin(value);
                  }
                }}
              >
                <SelectItem key="native">{t("originNative")}</SelectItem>
                <SelectItem key="foreign">{t("originForeign")}</SelectItem>
              </Select>

              <Select
                label={t("mutationLabel")}
                selectedKeys={[draftMutationMode]}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as MutationMode | undefined;
                  if (value) {
                    setDraftMutationMode(value);
                  }
                }}
              >
                <SelectItem key="auto">{t("mutationAuto")}</SelectItem>
                <SelectItem key="always">{t("mutationAlways")}</SelectItem>
                <SelectItem key="never">{t("mutationNever")}</SelectItem>
              </Select>
            </div>

            <p className="rounded-md border border-border/60 bg-background/60 px-4 py-3 text-sm leading-6 text-foreground/65">
              {t("mutationHint")}
            </p>

            <Button
              color="primary"
              className="w-full"
              isDisabled={!canStart}
              onPress={startBuilder}
            >
              {t("startBuilder")}
            </Button>
          </CardBody>
        </CustomCard>
      </div>

      <CustomCard className="sticky top-4 z-20">
        <CardBody className="flex flex-col gap-4 px-2 py-4 sm:p-5">
          <div className="space-y-3">
            <div className="space-y-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                  {t("currentWord")}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    {realization.surface}
                  </div>
                  {currentAttestation?.matched ? (
                    <NextIntlLink
                      href={{
                        pathname: "/search/[word]",
                        params: {
                          word: currentAttestation.wordName ?? realization.surface,
                        },
                      }}
                      className="inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-sm text-primary transition-colors hover:bg-primary/12"
                    >
                      {t("attestedBadge")}
                    </NextIntlLink>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Chip color="primary" variant="flat">
                  {t("currentPos")}: {getLocalizedPos(t, builderState.currentPos)}
                </Chip>
                <Chip variant="flat">
                  {getLocalizedCategory(t, builderState.currentCategory)}
                </Chip>
                <Chip variant="flat">
                  {t("currentPhase")}: {getLocalizedPhase(t, builderState.phase)}
                </Chip>
                <Chip variant="flat">
                  {t("stepCount")}: {builderState.history.length}
                </Chip>
              </div>
            </div>
          </div>

          {showInflectionLockNotice ? (
            <div className="rounded-md border border-primary/20 bg-primary/8 px-4 py-3 text-sm text-foreground/80">
              {t("lockedInflection")}
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">{t("selectedChain")}</h2>
              <span className="text-xs uppercase tracking-[0.16em] text-foreground/45">
                {availableActions.length} {t("availableNow")}
              </span>
            </div>
            <div className="overflow-x-auto pb-1">
              <div className="flex min-h-16 min-w-max items-center gap-2 rounded-md border border-dashed border-border/70 bg-background/55 p-3">
                {builderState.history.length > 0 ? (
                  builderState.history.map((step) => (
                    <Badge
                      key={step.step}
                      variant="outline"
                      className={cn(
                        "rounded-full px-3 py-1 text-sm",
                        step.action.kind === "derivational"
                          ? "border-primary/20 bg-primary/8 text-primary"
                          : step.action.kind === "analytic"
                            ? "border-sky-200 bg-sky-50 text-sky-700"
                            : step.action.kind === "nonfinite"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : step.action.kind === "postfinite"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-border/70 bg-background/70 text-foreground/80",
                      )}
                    >
                      {t(step.action.labelKey)}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-foreground/55">{t("chainEmpty")}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="flat"
              size="sm"
              onPress={undoLastStep}
              isDisabled={builderState.history.length === 0}
              startContent={<CornerDownLeft className="h-4 w-4" />}
            >
              {t("undoLast")}
            </Button>
            <Button
              variant="flat"
              size="sm"
              onPress={resetSteps}
              isDisabled={builderState.history.length === 0}
              startContent={<RotateCcw className="h-4 w-4" />}
            >
              {t("resetSteps")}
            </Button>
          </div>
        </CardBody>
      </CustomCard>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <CustomCard className="border-border/70">
          <CardBody className="gap-5 px-2 py-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">{t("actionDockTitle")}</h2>
                <p className="text-sm text-foreground/65">{t("actionDockHint")}</p>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {availableActions.length} {t("availableNow")}
              </Badge>
            </div>

            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2">
                {ACTION_TAB_ORDER.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveActionTab(tab)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      activeActionTab === tab
                        ? "border-primary/25 bg-primary/10 text-primary"
                        : "border-border/70 bg-background/70 text-foreground/70 hover:border-primary/20 hover:text-foreground",
                    )}
                  >
                    <span>{t(getActionTabLabelKey(tab))}</span>
                    <span className="rounded-full bg-background/80 px-2 py-0.5 text-xs text-foreground/55">
                      {actionTabCounts[tab]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 lg:max-h-[48rem] lg:overflow-y-auto lg:pr-1">
              {visibleActionSections.length > 0 ? (
                visibleActionSections.map((section) => (
                  <div key={section.key} className="space-y-2">
                    {(() => {
                      const sectionStorageKey = getSectionStorageKey(
                        activeActionTab,
                        section,
                      );
                      const { primaryActions, rareActions } =
                        section.kind === "derivational"
                          ? splitActionsByRarity(
                            section.actions,
                            candidateAttestationByActionId,
                          )
                          : {
                            primaryActions: section.actions,
                            rareActions: [],
                          };
                      const showRareActions =
                        expandedRareSections[sectionStorageKey] === true;

                      return (
                        <>
                          <div className="flex items-center gap-2 pb-0.5">
                            <Badge variant="outline" className="rounded-full px-3 py-1">
                              {t(section.titleKey)}
                            </Badge>
                            {rareActions.length > 0 ? (
                              <Badge
                                variant="outline"
                                className="rounded-full border-border/60 bg-background/60 px-2.5 py-1 text-[11px] text-foreground/55"
                              >
                                {t("rareOptionsLabel")}
                              </Badge>
                            ) : null}
                          </div>

                          {primaryActions.length > 0 ? (
                            <div className="grid gap-3 md:grid-cols-2">
                              {primaryActions.map((action) =>
                                renderActionCard(section, action),
                              )}
                            </div>
                          ) : null}

                          {rareActions.length > 0 ? (
                            <div className="space-y-3 rounded-md border border-dashed border-border/60 bg-background/45 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="text-sm font-medium text-foreground/80">
                                    {t("rareOptionsLabel")}
                                  </div>
                                  <p className="text-xs text-foreground/55">
                                    {t("rareOptionsHint")}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedRareSections((current) => ({
                                      ...current,
                                      [sectionStorageKey]: !showRareActions,
                                    }))
                                  }
                                  className="inline-flex items-center rounded-full border border-border/70 bg-background/75 px-3 py-1.5 text-sm font-medium text-foreground/75 transition-colors hover:border-primary/20 hover:text-foreground"
                                >
                                  {showRareActions
                                    ? t("hideRareOptions")
                                    : t("showRareOptions", {
                                      count: rareActions.length,
                                    })}
                                </button>
                              </div>

                              {showRareActions ? (
                                <div className="grid gap-3 md:grid-cols-2">
                                  {rareActions.map((action) =>
                                    renderActionCard(section, action),
                                  )}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border/70 bg-background/55 px-4 py-5 text-sm text-foreground/55">
                  {t("noAvailableSuffixes")}
                </div>
              )}
            </div>
          </CardBody>
        </CustomCard>

        <CustomCard className="border-border/70">
          <CardBody className="gap-5 px-2 py-4 sm:p-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">{t("timelineTitle")}</h2>
              <p className="text-sm text-foreground/65">{t("timelineHint")}</p>
            </div>

            {builderState.history.length > 0 ? (
              <div className="grid gap-5 xl:grid-cols-[0.4fr_0.6fr]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{t("logsTitle")}</h3>
                    <span className="text-xs uppercase tracking-[0.16em] text-foreground/45">
                      {builderState.history.length}
                    </span>
                  </div>

                  <div className="space-y-2 xl:max-h-[48rem] xl:overflow-y-auto xl:pr-1">
                    {builderState.history.map((step) => (
                      <button
                        key={step.step}
                        type="button"
                        onClick={() => setSelectedStepNumber(step.step)}
                        className={cn(
                          "w-full rounded-md border p-4 text-left transition-colors",
                          selectedHistoryEntry?.step === step.step
                            ? "border-primary/25 bg-primary/8 shadow-[0_12px_25px_-20px_rgba(194,65,12,0.8)]"
                            : "border-border/70 bg-background/60 hover:border-primary/20 hover:bg-background/80",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/80">
                              {t("stepLabel", { step: step.step })}
                            </div>
                            <div className="mt-2 truncate text-sm font-semibold text-foreground">
                              {t(step.action.labelKey)}
                            </div>
                          </div>
                          {step.attestation?.matched ? (
                            <Badge
                              variant="outline"
                              className="shrink-0 rounded-full border-primary/20 bg-primary/8 px-2 py-0.5 text-xs text-primary"
                            >
                              {t("attestedBadge")}
                            </Badge>
                          ) : null}
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-sm text-foreground/70">
                          <span className="truncate">{step.log.beforeSurface}</span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
                          <span className="truncate font-medium text-foreground">
                            {step.log.afterSurface}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{t("detailTitle")}</h3>
                    <p className="text-sm text-foreground/65">{t("detailHint")}</p>
                  </div>

                  {selectedHistoryEntry ? (
                    <div className="rounded-md border border-border/70 bg-background/60 p-6 shadow-[0_10px_35px_-28px_rgba(15,23,42,0.9)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                            {t("stepLabel", { step: selectedHistoryEntry.step })}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
                            <span>{selectedHistoryEntry.log.beforeSurface}</span>
                            <ArrowRight className="h-4 w-4 text-foreground/45" />
                            <span>{selectedHistoryEntry.log.afterSurface}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {selectedHistoryEntry.attestation?.matched ? (
                            <NextIntlLink
                              href={{
                                pathname: "/search/[word]",
                                params: {
                                  word:
                                    selectedHistoryEntry.attestation.wordName ??
                                    selectedHistoryEntry.log.afterSurface,
                                },
                              }}
                              className="inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-sm text-primary transition-colors hover:bg-primary/12"
                            >
                              {t("attestedBadge")}
                            </NextIntlLink>
                          ) : null}
                          <Badge
                            className="rounded-full border-primary/20 bg-primary/8 px-3 py-1 text-primary"
                            variant="outline"
                          >
                            {t(selectedHistoryEntry.action.labelKey)}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <div className="rounded-md border border-border/70 bg-background/70 p-4">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/45">
                            {t("before")}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 font-mono text-base">
                            {renderDiff(selectedHistoryEntry.log.diff.segments, "before")}
                          </div>
                        </div>
                        <div className="rounded-md border border-primary/20 bg-primary/8 p-4">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary/75">
                            {t("after")}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 font-mono text-base">
                            {renderDiff(selectedHistoryEntry.log.diff.segments, "after")}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <Chip variant="flat">
                          {getLocalizedPos(t, selectedHistoryEntry.beforeState.currentPos)}{" "}
                          <ArrowRight className="mx-1 inline h-3.5 w-3.5" />{" "}
                          {getLocalizedPos(t, selectedHistoryEntry.afterState.currentPos)}
                        </Chip>
                        <Chip variant="flat">
                          {t("surfaceSuffix")}:{" "}
                          {selectedHistoryEntry.surfaceSuffix || t("zeroMorpheme")}
                        </Chip>
                        <Chip variant="flat">
                          {t("archiphoneme")}:{" "}
                          {selectedHistoryEntry.log.suffixArchiphoneme ??
                            selectedHistoryEntry.action.preview}
                        </Chip>
                      </div>

                      <div className="mt-5 space-y-3">
                        <div className="text-sm font-semibold text-foreground/85">
                          {t("appliedRules")}
                        </div>
                        <ul className="space-y-2">
                          {selectedHistoryEntry.log.events.map((event, index) => (
                            <li
                              key={`${selectedHistoryEntry.step}-${event.code}-${index}`}
                              className={cn(
                                "rounded-md border border-border/65 px-4 py-3 text-sm leading-6 text-foreground/75",
                                index === 0
                                  ? "border-primary/20 bg-primary/8 text-foreground"
                                  : "bg-background/55",
                              )}
                            >
                              {getEventMessage(t, event)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-border/70 bg-background/55 px-5 py-10 text-center text-sm text-foreground/55">
                      {t("selectStepHint")}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border/70 bg-background/55 px-5 py-10 text-center text-sm text-foreground/55">
                {t("noSteps")}
              </div>
            )}
          </CardBody>
        </CustomCard>
      </div>
    </div>
  );
}
