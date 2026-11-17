import { hasanErenReader } from "@/data/etymology/hasan-eren-reader";
import { scanEntryBoundaries } from "./scan-entries";

export const pilotReaderEntries = scanEntryBoundaries.flatMap(({ page, line, headword, continuesBeyondBatch }) => {
  const id = `p${page}-l${line}`;
  const summary = hasanErenReader[id];
  return summary ? [{ id, headword, firstPage: page, continuesBeyondBatch, draft: false, ...summary }] : [];
});
