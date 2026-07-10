export type WordIndexability = "indexable" | "pointer" | "empty";

type MeaningLike = {
  meaning?: string | null;
};

type RelatedWordLike = {
  related_word_name?: string | null;
};

type RelatedPhraseLike = {
  related_phrase?: string | null;
};

export type IndexableWordData = {
  meanings?: readonly MeaningLike[] | null;
  relatedWords?: readonly RelatedWordLike[] | null;
  relatedPhrases?: readonly RelatedPhraseLike[] | null;
};

export const NAVIGATION_MEANING_LIKE_PATTERN = "bakınız:%";

const NAVIGATION_MEANING_PATTERN = /^bakınız\s*:\s*(.+)$/iu;

export function isSubstantiveMeaning(meaning: string | null | undefined): boolean {
  const normalizedMeaning = meaning?.trim();
  return Boolean(normalizedMeaning && !NAVIGATION_MEANING_PATTERN.test(normalizedMeaning));
}

export function getSubstantiveMeanings<T extends MeaningLike>(
  meanings: readonly T[] | null | undefined,
): T[] {
  return (meanings ?? []).filter((meaning) => isSubstantiveMeaning(meaning.meaning));
}

export function classifyWordIndexability(
  wordData: IndexableWordData | null | undefined,
): WordIndexability {
  if (!wordData) {
    return "empty";
  }

  if (getSubstantiveMeanings(wordData.meanings).length > 0) {
    return "indexable";
  }

  const hasNavigationMeaning = (wordData.meanings ?? []).some((meaning) =>
    NAVIGATION_MEANING_PATTERN.test(meaning.meaning?.trim() ?? ""),
  );
  const hasRelatedEntry = Boolean(
    wordData.relatedWords?.length || wordData.relatedPhrases?.length,
  );

  return hasNavigationMeaning || hasRelatedEntry ? "pointer" : "empty";
}

export function getPointerTargetNames(wordData: IndexableWordData): string[] {
  const names = new Set<string>();

  for (const relatedWord of wordData.relatedWords ?? []) {
    const name = relatedWord.related_word_name?.trim();
    if (name) {
      names.add(name);
    }
  }

  for (const relatedPhrase of wordData.relatedPhrases ?? []) {
    const name = relatedPhrase.related_phrase?.trim();
    if (name) {
      names.add(name);
    }
  }

  for (const meaning of wordData.meanings ?? []) {
    const match = meaning.meaning?.trim().match(NAVIGATION_MEANING_PATTERN);
    const name = match?.[1]?.trim();
    if (name) {
      names.add(name);
    }
  }

  return [...names];
}
