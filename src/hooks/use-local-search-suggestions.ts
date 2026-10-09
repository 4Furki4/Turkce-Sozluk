"use client";

import { useEffect, useState } from "react";
import { searchAutocompleteOffline, searchByPattern } from "@/src/lib/offline-db";

const EMPTY: string[] = [];

/** Local lookups need only a brief typing pause; obsolete results never reach the menu. */
export function useLocalSearchSuggestions(input: string, enabled: boolean) {
  const [state, setState] = useState({ input: "", results: EMPTY, loading: false });
  useEffect(() => {
    if (!enabled || input.length < 2) {
      setState({ input, results: EMPTY, loading: false });
      return;
    }
    let active = true;
    setState({ input, results: EMPTY, loading: true });
    const timer = setTimeout(async () => {
      try {
        const results = input.includes("_")
          ? (await searchByPattern(input)).map((word) => word.word_name)
          : await searchAutocompleteOffline(input);
        if (active) setState({ input, results, loading: false });
      } catch {
        if (active) {
          setState({ input, results: EMPTY, loading: false });
          console.warn("[autocomplete] Local lookup unavailable");
        }
      }
    }, 80);
    return () => { active = false; clearTimeout(timer); };
  }, [input, enabled]);

  const current = enabled && state.input === input;
  return { recommendations: current ? state.results : EMPTY, isLoading: current && state.loading };
}
