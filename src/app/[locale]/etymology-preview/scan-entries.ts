import firstPage from "@/data/etymology/hasan-eren-page-31-entry-boundaries.json";
import remainingPages from "@/data/etymology/hasan-eren-pages-02-10-entry-boundaries.json";
import type { ScanData } from "./scan-page";
import type { BookEntry } from "./book-catalog";

type Boundary = {
  page: number;
  line: number;
  headword: string;
  ocrHeadword?: string;
  continuesBeyondBatch?: boolean;
};

type EntryLine = ScanData["bodyLines"][number] & { page: number };
type ColumnEdges = Record<EntryLine["column"], number>;

export type ScanEntry = {
  id: string;
  headword: string;
  ocrHeadword: string;
  continuesBeyondBatch: boolean;
  lines: EntryLine[];
  paragraphs: string[];
};

export const scanEntryBoundaries: Boundary[] = [
  ...firstPage.entries.map(({ firstLineIndex, headword }) => ({ page: 1, line: firstLineIndex, headword })),
  ...remainingPages.entries,
];

function reflowParagraphs(entry: ScanEntry, columnEdges: Map<number, ColumnEdges>) {
  const paragraphs: string[] = [];
  let block = "";
  for (const [index, line] of entry.lines.entries()) {
    const text = (index === 0 ? line.baseText.slice(entry.ocrHeadword.length) : line.baseText).trim();
    if (!text) continue;
    if (block && (/^[<~]\s/u.test(text) || (block.length > 340 && /[.!?)]$/u.test(block)))) {
      paragraphs.push(block);
      block = "";
    }

    // A split word reaches the right edge of its own column, including across pages.
    const previous = entry.lines[index - 1];
    const previousText = previous?.baseText.trimEnd() ?? "";
    const edges = previous && columnEdges.get(previous.page);
    const canJoin = block && previous && edges &&
      edges[previous.column] - previous.box[2] <= previous.box[3] - previous.box[1];
    const pageRange = /\p{Nd}[-‐]$/u.test(previousText) && /^\p{Nd}/u.test(text);
    const compoundSurname = /\bHalasi-$/u.test(previousText) && /^Kun\b/u.test(text);
    const splitWord = /(?:^|[\s('"‘“«*])(?:\p{L}\p{M}*){2,}[-‐\u00ad]$/u.test(previousText) &&
      /^\p{Ll}/u.test(text);
    if (canJoin && (pageRange || compoundSurname)) {
      block += text;
    } else if (canJoin && splitWord) {
      block = block.slice(0, -1) + text;
    } else {
      block += (block ? " " : "") + text;
    }
  }
  if (block) paragraphs.push(block);
  return paragraphs;
}

export function groupScanEntries(pages: ScanData[]): ScanEntry[] {
  const pending = new Map(scanEntryBoundaries.map((boundary) => [`p${boundary.page}-l${boundary.line}`, boundary]));
  const entries: ScanEntry[] = [];
  const columnEdges = new Map<number, ColumnEdges>();
  let active: ScanEntry | undefined;
  for (const page of pages) {
    if (page.documentSha256 !== firstPage.documentSha256 || page.documentSha256 !== remainingPages.documentSha256) {
      throw new Error("OCR document differs from the reviewed entry boundaries");
    }
    const edges = { left: 0, right: 0 };
    columnEdges.set(page.printedPage, edges);
    for (const line of page.bodyLines) {
      edges[line.column] = Math.max(edges[line.column], line.box[2]);
      const id = `p${page.printedPage}-l${line.baseLineIndex}`;
      const start = pending.get(id);
      if (start) {
        const ocrHeadword = start.ocrHeadword ?? start.headword;
        if (line.baseText !== ocrHeadword && !line.baseText.startsWith(`${ocrHeadword} `)) {
          throw new Error(`Changed OCR at entry start ${id} (${start.headword})`);
        }
        active = {
          id, headword: start.headword, ocrHeadword,
          continuesBeyondBatch: start.continuesBeyondBatch ?? false,
          lines: [],
          paragraphs: [],
        };
        entries.push(active);
        pending.delete(id);
      }
      if (!active) throw new Error(`No entry for OCR line ${id}`);
      active.lines.push({ ...line, page: page.printedPage });
    }
  }
  if (pending.size) throw new Error(`Missing reviewed entry starts: ${[...pending.keys()].join(", ")}`);
  for (const entry of entries) entry.paragraphs = reflowParagraphs(entry, columnEdges);
  return entries;
}

export function groupBookScanEntries(pages: ScanData[], catalogEntries: BookEntry[]): ScanEntry[] {
  const columnEdges = new Map<number, ColumnEdges>();
  const lines: EntryLine[] = [];
  const positions = new Map<string, number>();
  for (const page of pages) {
    if (page.documentSha256 !== firstPage.documentSha256) {
      throw new Error("OCR document differs from the book catalog");
    }
    const edges = { left: 0, right: 0 };
    columnEdges.set(page.printedPage, edges);
    for (const line of page.bodyLines) {
      edges[line.column] = Math.max(edges[line.column], line.box[2]);
      positions.set(`p${page.printedPage}-l${line.baseLineIndex}`, lines.length);
      lines.push({ ...line, page: page.printedPage });
    }
  }
  return catalogEntries.map(({ id, lastLineId, headword, ocrHeadword, reviewed }) => {
    const start = positions.get(id);
    const end = positions.get(lastLineId);
    if (start === undefined || end === undefined || end < start) {
      throw new Error(`Missing OCR lines for book entry ${id}`);
    }
    const prefix = lines[start].baseText;
    if (!prefix.startsWith(ocrHeadword) || (!reviewed && !/^(?:$|[\s:‘'“(<])/u.test(prefix.slice(ocrHeadword.length)))) {
      throw new Error(`Changed OCR at book entry start ${id}`);
    }
    const entry: ScanEntry = {
      id, headword, ocrHeadword, continuesBeyondBatch: false,
      lines: lines.slice(start, end + 1),
      paragraphs: [],
    };
    entry.paragraphs = reflowParagraphs(entry, columnEdges);
    return entry;
  });
}
