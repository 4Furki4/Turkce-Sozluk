import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { getBookDirectory, pilotPageCount } from "./book-catalog";

const scanFiles = ["combined-layout.json", "combined-qwen.json", "combined-scripts.json", "combined.json"];

export function getScanSourceDirectory(pilotDirectory: string, page: number) {
  return page <= pilotPageCount ? pilotDirectory : getBookDirectory(pilotDirectory);
}

export async function hasScanPage(pilotDirectory: string, page: number) {
  const target = join(getScanSourceDirectory(pilotDirectory, page), `page-${page + 30}`);
  const canRead = (file: string) => access(join(target, file), constants.R_OK).then(() => true, () => false);
  return (await canRead("page-image.png")) && (await Promise.all(scanFiles.map(canRead))).some(Boolean);
}

const scanPage = z.object({
  documentSha256: z.string(),
  pdfPage: z.number().int(),
  printedPage: z.number().int(),
  imageWidth: z.number().positive(),
  imageHeight: z.number().positive(),
  bodyLines: z.array(z.object({
    baseLineIndex: z.number().int(),
    column: z.enum(["left", "right"]),
    box: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    baseText: z.string(),
    baseScore: z.number(),
    reviewStatus: z.enum(["needs_review", "unreviewed"]),
    reviewReasons: z.array(z.string()).optional(),
    alternatives: z.array(z.object({
      candidates: z.array(z.object({ text: z.string() })),
    })),
    qwenSuggestions: z.array(z.object({
      text: z.string(),
      crop: z.tuple([z.number(), z.number(), z.number(), z.number()]),
      reviewReasons: z.array(z.string()),
    })).default([]),
  })),
});

export type ScanData = z.infer<typeof scanPage>;

export async function readOptional(path: string) {
  try {
    return await readFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function readScanPage(directory: string, page: number) {
  const target = join(directory, `page-${page + 30}`);
  let bytes: Buffer | null = null;
  for (const file of scanFiles) {
    bytes = await readOptional(join(target, file));
    if (bytes) break;
  }
  if (!bytes) return null;
  const data = scanPage.parse(JSON.parse(bytes.toString("utf8")));
  if (data.printedPage !== page || data.pdfPage !== page + 30) {
    throw new Error("OCR document page does not match the preview page");
  }
  return data;
}
