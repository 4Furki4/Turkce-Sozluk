import type { CSSProperties } from "react";

// Size long tokens against their card, then balance any necessary line breaks.
// Never insert hyphens or change the spelling stored in the dictionary.
export function getHeadwordProps(word: string) {
  const tokens = word.trim().split(/\s+/);
  const longest = Math.max(...tokens.map((token) => Array.from(token).length));
  if (longest < 18) return {};
  return {
    "data-long-headword": true,
    "data-single-word": tokens.length === 1,
    style: { "--headword-width": longest * 0.6 } as CSSProperties,
  };
}
