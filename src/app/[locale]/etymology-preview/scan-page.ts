import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

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
  const bytes = await readOptional(join(target, "combined-layout.json"))
    ?? await readOptional(join(target, "combined-qwen.json"))
    ?? await readOptional(join(target, "combined-scripts.json"))
    ?? await readOptional(join(target, "combined.json"));
  if (!bytes) return null;
  const data = scanPage.parse(JSON.parse(bytes.toString("utf8")));
  if (data.printedPage !== page || data.pdfPage !== page + 30) {
    throw new Error("OCR document page does not match the preview page");
  }
  return data;
}
