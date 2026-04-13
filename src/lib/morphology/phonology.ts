import {
  type DiffSegment,
  type HighlightDiff,
  type MorphologicalState,
  type MorphologyEvent,
  type MorphemeSlot,
  type RootLexeme,
  type RuleId,
  type SuffixDefinition,
} from "./types";

const VOWELS = new Set(["a", "e", "ı", "i", "o", "ö", "u", "ü"]);
const FRONT_VOWELS = new Set(["e", "i", "ö", "ü"]);
const ROUNDED_VOWELS = new Set(["o", "ö", "u", "ü"]);
const HARD_CONSONANTS = new Set(["f", "s", "t", "k", "ç", "ş", "h", "p"]);
const MUTATION_MAP = {
  p: "b",
  ç: "c",
  t: "d",
  k: "ğ",
} as const;

type PhonologyState = Pick<
  RootLexeme,
  | "surface"
  | "pos"
  | "origin"
  | "allowConsonantMutation"
  | "forceConsonantMutation"
  | "mutationOverrides"
> & {
  rootSurface?: string;
};

interface EventContext {
  slot?: MorphemeSlot;
  morphemeId?: string;
}

function createEvent(
  code: MorphologyEvent["code"],
  i18nKey: string,
  params: Record<string, string>,
  context: EventContext,
  before?: string,
  after?: string,
): MorphologyEvent {
  return {
    code,
    i18nKey,
    params,
    stage: "realization",
    before,
    after,
    slot: context.slot,
    morphemeId: context.morphemeId,
  };
}

function stripArchiphonemeDelimiters(value: string): string {
  return value.replaceAll("/", "");
}

export function countSyllables(surface: string): number {
  return Array.from(surface.toLocaleLowerCase("tr")).filter((letter) =>
    VOWELS.has(letter),
  ).length;
}

export function findLastVowel(surface: string): string | undefined {
  const letters = Array.from(surface.toLocaleLowerCase("tr"));

  for (let index = letters.length - 1; index >= 0; index -= 1) {
    if (VOWELS.has(letters[index])) {
      return letters[index];
    }
  }

  return undefined;
}

export function endsWithVowel(surface: string): boolean {
  const lastLetter = Array.from(surface.toLocaleLowerCase("tr")).at(-1);
  return lastLetter !== undefined && VOWELS.has(lastLetter);
}

export function resolveTwoWayHarmony(lastVowel: string | undefined): "a" | "e" {
  if (!lastVowel) {
    return "a";
  }

  return FRONT_VOWELS.has(lastVowel) ? "e" : "a";
}

export function resolveFourWayHarmony(
  lastVowel: string | undefined,
): "ı" | "i" | "u" | "ü" {
  if (!lastVowel) {
    return "ı";
  }

  if (FRONT_VOWELS.has(lastVowel)) {
    return ROUNDED_VOWELS.has(lastVowel) ? "ü" : "i";
  }

  return ROUNDED_VOWELS.has(lastVowel) ? "u" : "ı";
}

function applyHarmony(
  stem: string,
  archiphoneme: string,
  context: EventContext,
): { surface: string; events: MorphologyEvent[] } {
  const events: MorphologyEvent[] = [];
  const lastVowel = findLastVowel(stem);
  let surface = archiphoneme;

  if (surface.includes("I")) {
    const resolved = resolveFourWayHarmony(lastVowel);
    surface = surface.replaceAll("I", resolved);
    events.push(
      createEvent(
        "vowel_harmony_4_way",
        "events.vowelHarmonyFourWay",
        { archiphoneme: "I", resolved },
        context,
        "I",
        resolved,
      ),
    );
  }

  if (surface.includes("A") || surface.includes("E")) {
    const resolved = resolveTwoWayHarmony(lastVowel);
    surface = surface.replaceAll("A", resolved).replaceAll("E", resolved);
    events.push(
      createEvent(
        "vowel_harmony_2_way",
        "events.vowelHarmonyTwoWay",
        { archiphoneme: "A", resolved },
        context,
        "A",
        resolved,
      ),
    );
  }

  return { surface, events };
}

function applyConsonantAssimilation(
  stem: string,
  suffixSurface: string,
  rules: RuleId[],
  context: EventContext,
): { surface: string; event?: MorphologyEvent } {
  if (!rules.includes("consonant_assimilation") || suffixSurface.length === 0) {
    return { surface: suffixSurface };
  }

  const lastLetter = Array.from(stem.toLocaleLowerCase("tr")).at(-1);
  if (!lastLetter || !HARD_CONSONANTS.has(lastLetter)) {
    return { surface: suffixSurface };
  }

  const firstLetter = suffixSurface[0];
  const map: Record<string, string> = {
    C: "ç",
    D: "t",
    G: "k",
    c: "ç",
    d: "t",
    g: "k",
  };

  const replacement = map[firstLetter];
  if (!replacement) {
    return { surface: suffixSurface };
  }

  return {
    surface: `${replacement}${suffixSurface.slice(1)}`,
    event: createEvent(
      "consonant_assimilation",
      "events.consonantAssimilation",
      { before: firstLetter, after: replacement },
      context,
      firstLetter,
      replacement,
    ),
  };
}

function applyBufferLetter(
  stem: string,
  suffixSurface: string,
  rules: RuleId[],
  context: EventContext,
): { surface: string; event?: MorphologyEvent } {
  if (!endsWithVowel(stem) || suffixSurface.length === 0 || !endsWithVowel(suffixSurface[0])) {
    return { surface: suffixSurface };
  }

  const bufferRule = rules.find((rule) =>
    rule === "buffer_y" ||
    rule === "buffer_s" ||
    rule === "buffer_n" ||
    rule === "buffer_sh",
  );

  if (!bufferRule) {
    return { surface: suffixSurface };
  }

  const bufferMap: Record<RuleId, string | undefined> = {
    buffer_y: "y",
    buffer_s: "s",
    buffer_n: "n",
    buffer_sh: "ş",
    consonant_assimilation: undefined,
    consonant_mutation_trigger: undefined,
  };

  const bufferLetter = bufferMap[bufferRule];
  if (!bufferLetter) {
    return { surface: suffixSurface };
  }

  return {
    surface: `${bufferLetter}${suffixSurface}`,
    event: createEvent(
      "buffer_letter",
      "events.bufferLetter",
      { letter: bufferLetter },
      context,
      "",
      bufferLetter,
    ),
  };
}

function shouldApplyConsonantMutation(
  state: PhonologyState,
  suffixSurface: string,
  rules: RuleId[],
): boolean {
  if (!rules.includes("consonant_mutation_trigger")) {
    return false;
  }

  if (!suffixSurface || !endsWithVowel(suffixSurface[0])) {
    return false;
  }

  const lastLetter = Array.from(state.surface.toLocaleLowerCase("tr")).at(-1);
  if (!lastLetter || !(lastLetter in MUTATION_MAP)) {
    return false;
  }

  if (state.forceConsonantMutation) {
    return true;
  }

  if (state.allowConsonantMutation === false) {
    return false;
  }

  if (state.origin === "foreign") {
    return false;
  }

  const rootSurface = state.rootSurface ?? state.surface;

  if (state.pos === "Verb" && state.surface === rootSurface) {
    return false;
  }

  return countSyllables(state.surface) > 1;
}

function applyConsonantMutation(
  state: PhonologyState,
  suffixSurface: string,
  rules: RuleId[],
  context: EventContext,
): { stem: string; event?: MorphologyEvent } {
  if (!shouldApplyConsonantMutation(state, suffixSurface, rules)) {
    return { stem: state.surface };
  }

  const letters = Array.from(state.surface);
  const originalLastLetter = letters.at(-1)?.toLocaleLowerCase("tr");
  if (!originalLastLetter || !(originalLastLetter in MUTATION_MAP)) {
    return { stem: state.surface };
  }

  const override = state.mutationOverrides?.[
    originalLastLetter as keyof typeof MUTATION_MAP
  ];
  const replacement =
    override ?? MUTATION_MAP[originalLastLetter as keyof typeof MUTATION_MAP];

  letters[letters.length - 1] = replacement;

  return {
    stem: letters.join(""),
    event: createEvent(
      "consonant_mutation",
      "events.consonantMutation",
      { before: originalLastLetter, after: replacement },
      context,
      originalLastLetter,
      replacement,
    ),
  };
}

export function realizeAffix(
  state: PhonologyState,
  pattern: string,
  rules: RuleId[],
  context: EventContext = {},
): { stem: string; surfaceSuffix: string; events: MorphologyEvent[] } {
  const rawArchiphoneme = stripArchiphonemeDelimiters(pattern);
  const events: MorphologyEvent[] = [];

  const harmonyResult = applyHarmony(state.surface, rawArchiphoneme, context);
  events.push(...harmonyResult.events);

  const assimilationResult = applyConsonantAssimilation(
    state.surface,
    harmonyResult.surface,
    rules,
    context,
  );
  if (assimilationResult.event) {
    events.push(assimilationResult.event);
  }

  const bufferedResult = applyBufferLetter(
    state.surface,
    assimilationResult.surface,
    rules,
    context,
  );
  if (bufferedResult.event) {
    events.push(bufferedResult.event);
  }

  const mutationResult = applyConsonantMutation(
    state,
    bufferedResult.surface,
    rules,
    context,
  );
  if (mutationResult.event) {
    events.push(mutationResult.event);
  }

  return {
    stem: mutationResult.stem,
    surfaceSuffix: bufferedResult.surface.toLocaleLowerCase("tr"),
    events,
  };
}

export function realizeSuffix(
  state: MorphologicalState,
  suffix: SuffixDefinition,
): { stem: string; surfaceSuffix: string; events: MorphologyEvent[] } {
  return realizeAffix(
    state,
    suffix.archiphoneme,
    suffix.rules,
    { morphemeId: suffix.id },
  );
}

export function buildHighlightDiff(
  beforeSurface: string,
  afterSurface: string,
): HighlightDiff {
  let prefixLength = 0;

  while (
    prefixLength < beforeSurface.length &&
    prefixLength < afterSurface.length &&
    beforeSurface[prefixLength] === afterSurface[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < beforeSurface.length - prefixLength &&
    suffixLength < afterSurface.length - prefixLength &&
    beforeSurface[beforeSurface.length - 1 - suffixLength] ===
      afterSurface[afterSurface.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  const prefix = beforeSurface.slice(0, prefixLength);
  const beforeChanged = beforeSurface.slice(
    prefixLength,
    beforeSurface.length - suffixLength,
  );
  const afterChanged = afterSurface.slice(
    prefixLength,
    afterSurface.length - suffixLength,
  );
  const suffix = suffixLength === 0 ? "" : beforeSurface.slice(beforeSurface.length - suffixLength);

  const segments: DiffSegment[] = [];
  if (prefix) {
    segments.push({ before: prefix, after: prefix, changed: false });
  }
  if (beforeChanged || afterChanged) {
    segments.push({
      before: beforeChanged,
      after: afterChanged,
      changed: true,
    });
  }
  if (suffix) {
    segments.push({ before: suffix, after: suffix, changed: false });
  }

  return {
    beforeHighlighted: `${prefix}${beforeChanged ? `[${beforeChanged}]` : ""}${suffix}`,
    afterHighlighted: `${prefix}${afterChanged ? `[${afterChanged}]` : ""}${suffix}`,
    segments,
  };
}
