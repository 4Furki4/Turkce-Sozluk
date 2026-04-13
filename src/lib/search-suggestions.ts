type NamedSuggestion = {
  name: string;
};

export function normalizeDictionaryQuery(query: string): string {
  return query.trim().toLocaleLowerCase("tr");
}

export function getDictionarySuggestionRank(
  name: string,
  query: string,
): number {
  const normalizedName = normalizeDictionaryQuery(name);
  const normalizedQuery = normalizeDictionaryQuery(query);

  if (!normalizedQuery) {
    return 2;
  }

  if (normalizedName === normalizedQuery) {
    return 0;
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    return 1;
  }

  return 2;
}

export function sortDictionarySuggestions<T extends NamedSuggestion>(
  suggestions: T[],
  query: string,
): T[] {
  return [...suggestions].sort((left, right) => {
    const rankDiff =
      getDictionarySuggestionRank(left.name, query) -
      getDictionarySuggestionRank(right.name, query);

    if (rankDiff !== 0) {
      return rankDiff;
    }

    return left.name.localeCompare(right.name, "tr", {
      sensitivity: "base",
    });
  });
}
