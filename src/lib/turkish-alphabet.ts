export const TURKISH_ALPHABET = [
  "a",
  "b",
  "c",
  "ç",
  "d",
  "e",
  "f",
  "g",
  "ğ",
  "h",
  "ı",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "ö",
  "p",
  "r",
  "s",
  "ş",
  "t",
  "u",
  "ü",
  "v",
  "y",
  "z",
] as const;

export type TurkishAlphabetLetter = (typeof TURKISH_ALPHABET)[number];

export function normalizeTurkishLetter(value: string): TurkishAlphabetLetter | null {
  let normalized: string;

  try {
    normalized = decodeURIComponent(value).trim().toLocaleLowerCase("tr-TR");
  } catch {
    return null;
  }

  return TURKISH_ALPHABET.includes(normalized as TurkishAlphabetLetter)
    ? (normalized as TurkishAlphabetLetter)
    : null;
}
