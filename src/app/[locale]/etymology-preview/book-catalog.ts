import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import reviewed from "@/data/etymology/hasan-eren-page-31-entry-boundaries.json";

export const bookPageCount = 472;
export const pilotPageCount = 10;
export const entryIdPattern = /^p[1-9]\d{0,2}-l\d{1,3}$/;
const printedPage = z.number().int().min(1).max(bookPageCount);
const entryId = z.string().regex(entryIdPattern);
const bookEntry = z.object({
  id: entryId,
  lastLineId: entryId,
  headword: z.string().min(1),
  ocrHeadword: z.string().min(1),
  firstPage: printedPage,
  lastPage: printedPage,
  meaning: z.string(),
  origin: z.string().min(1),
  reviewed: z.boolean().optional(),
  evidence: z.array(entryId).min(1),
}).refine((entry) => entry.id.startsWith(`p${entry.firstPage}-`)
  && entry.lastLineId.startsWith(`p${entry.lastPage}-`) && entry.lastPage >= entry.firstPage);

const bookCatalog = z.object({
  documentSha256: z.literal(reviewed.documentSha256),
  pageCount: z.literal(bookPageCount),
  pages: z.array(z.object({ page: printedPage, lineCount: z.number().int().nonnegative() })),
  entries: z.array(bookEntry),
});

export type BookEntry = z.infer<typeof bookEntry>;

export function getBookDirectory(pilotDirectory: string) {
  return join(dirname(pilotDirectory), "hasan-eren-book");
}

export async function readBookCatalog(pilotDirectory?: string) {
  if (!pilotDirectory) return null;
  try {
    const file = await readFile(join(getBookDirectory(pilotDirectory), "reader-catalog.json"), "utf8");
    return bookCatalog.parse(JSON.parse(file));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
