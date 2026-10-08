import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import type { GeneratedAsset, PronunciationWorkflowStore } from "./workflow-store";

type Publication = (asset: GeneratedAsset, path: string, entries: { id: number; name: string }[], assertApproved: () => void) => Promise<void>;

export async function publishWorkflow(store: PronunciationWorkflowStore, options: {
  target: string; limit: number; concurrency: number; publish: Publication;
  onProgress?: (completed: number, total: number, failed: number) => void;
}) {
  if (!Number.isSafeInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 16) throw new Error("Publication concurrency must be 1–16");
  const pending = store.approved(Number.MAX_SAFE_INTEGER)
    .filter(row => !store.published(row.key, row.sha256!, options.target)).slice(0, options.limit);
  let cursor = 0, completed = 0, failed = 0;
  options.onProgress?.(completed, pending.length, failed);
  const workers = await Promise.allSettled(Array.from({ length: Math.min(options.concurrency, pending.length) }, async () => {
    while (cursor < pending.length) {
      const row = pending[cursor++];
      try {
        const asset = JSON.parse(row.metadata!) as GeneratedAsset;
        const assertApproved = () => {
          if (!store.isApproved(asset.key, asset.sha256)) throw new Error(`Approval withdrawn or recording changed: ${asset.spokenText}`);
        };
        assertApproved();
        await options.publish(asset, join(store.dir, "audio", `${asset.key}.wav`), store.entries(asset.key), assertApproved);
        assertApproved();
        store.recordPublished(asset.key, asset.sha256, options.target);
        completed++;
      } catch (error) {
        failed++;
        await appendFile(join(store.dir, "publication-failures.jsonl"), JSON.stringify({
          target: options.target, key: row.key, sha256: row.sha256, spokenText: row.headword,
          failedAt: new Date().toISOString(), error: error instanceof Error ? error.message : "Publication failed",
        }) + "\n");
      }
      if ((completed + failed) % 500 === 0 || completed + failed === pending.length) options.onProgress?.(completed, pending.length, failed);
    }
  }));
  const interrupted = workers.find(result => result.status === "rejected");
  if (interrupted?.status === "rejected") throw interrupted.reason;
  return { completed, failed, total: pending.length };
}
