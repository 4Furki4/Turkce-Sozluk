export type WordEtymology = {
  entryKey: string;
  meaningId: number | null;
  senseLabel: string | null;
  author: string | null;
  firstPage: number;
  lastPage: number | null;
  summary: string;
  details: string[];
};

export function wordEtymologyAnchor(wordId: number | string) {
  return `koken-${wordId}`;
}
