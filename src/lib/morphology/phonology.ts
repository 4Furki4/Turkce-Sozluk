import {
  type DiffSegment,
  type HighlightDiff,
  type MorphologicalState,
  type PhonologyEvent,
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
): { surface: string; events: PhonologyEvent[] } {
  const events: PhonologyEvent[] = [];
  const lastVowel = findLastVowel(stem);
  let surface = archiphoneme;

  if (surface.includes("I")) {
    const resolved = resolveFourWayHarmony(lastVowel);
    surface = surface.replaceAll("I", resolved);
    events.push({
      type: "vowel_harmony",
      message: `4 yönlü ünlü uyumu uygulandı: /I/ -> ${resolved}.`,
      before: "I",
      after: resolved,
    });
  }

  if (surface.includes("A") || surface.includes("E")) {
    const resolved = resolveTwoWayHarmony(lastVowel);
    surface = surface.replaceAll("A", resolved).replaceAll("E", resolved);
    events.push({
      type: "vowel_harmony",
      message: `2 yönlü ünlü uyumu uygulandı: /A/ -> ${resolved}.`,
      before: "A",
      after: resolved,
    });
  }

  return { surface, events };
}

function applyConsonantAssimilation(
  stem: string,
  suffixSurface: string,
  rules: RuleId[],
): { surface: string; event?: PhonologyEvent } {
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
    event: {
      type: "consonant_assimilation",
      message: `Ünsüz sertleşmesi uygulandı: ${firstLetter} -> ${replacement}.`,
      before: firstLetter,
      after: replacement,
    },
  };
}

function applyBufferLetter(
  stem: string,
  suffixSurface: string,
  rules: RuleId[],
): { surface: string; event?: PhonologyEvent } {
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
    event: {
      type: "buffer_letter",
      message: `Tampon harf eklendi: ${bufferLetter}.`,
      before: "",
      after: bufferLetter,
    },
  };
}

function shouldApplyConsonantMutation(
  state: MorphologicalState,
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

  return countSyllables(state.surface) > 1;
}

function applyConsonantMutation(
  state: MorphologicalState,
  suffixSurface: string,
  rules: RuleId[],
): { stem: string; event?: PhonologyEvent } {
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
    event: {
      type: "consonant_mutation",
      message: `Ünsüz yumuşaması uygulandı: ${originalLastLetter} -> ${replacement}.`,
      before: originalLastLetter,
      after: replacement,
    },
  };
}

export function realizeSuffix(
  state: MorphologicalState,
  suffix: SuffixDefinition,
): { stem: string; surfaceSuffix: string; events: PhonologyEvent[] } {
  const rawArchiphoneme = stripArchiphonemeDelimiters(suffix.archiphoneme);
  const events: PhonologyEvent[] = [];

  const harmonyResult = applyHarmony(state.surface, rawArchiphoneme);
  events.push(...harmonyResult.events);

  const assimilationResult = applyConsonantAssimilation(
    state.surface,
    harmonyResult.surface,
    suffix.rules,
  );
  if (assimilationResult.event) {
    events.push(assimilationResult.event);
  }

  const bufferedResult = applyBufferLetter(
    state.surface,
    assimilationResult.surface,
    suffix.rules,
  );
  if (bufferedResult.event) {
    events.push(bufferedResult.event);
  }

  const mutationResult = applyConsonantMutation(
    state,
    bufferedResult.surface,
    suffix.rules,
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

