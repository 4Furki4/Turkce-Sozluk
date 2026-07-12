import { notFound } from "next/navigation";

import {
  normalizeTurkishLetter,
  type TurkishAlphabetLetter,
} from "@/src/lib/turkish-alphabet";

export function getValidLetterOrNotFound(letter: string): TurkishAlphabetLetter {
  const normalizedLetter = normalizeTurkishLetter(letter);

  if (!normalizedLetter) {
    notFound();
  }

  return normalizedLetter;
}
