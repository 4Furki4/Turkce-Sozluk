import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { inspectPronunciationWav } from "@/src/lib/pronunciation-wav";
import { pronunciationKey } from "@/src/lib/pronunciation-identity";
import { pronunciationReviewFlags } from "@/src/lib/pronunciation-review";
import { PronunciationWorkflowStore, type GeneratedAsset } from "./workflow-store";

// This is an explicit owner acceptance policy, not a pronunciation quality score.
export async function applyAutomaticApprovals(store: PronunciationWorkflowStore, batch?: number) {
  if (store.reviewPolicy().mode !== "approve-unflagged") return 0;
  let approved = 0;
  for (const row of store.automaticApprovalCandidates(batch)) {
    const asset = JSON.parse(row.metadata!) as GeneratedAsset;
    const signal = inspectPronunciationWav(await readFile(join(store.dir, "audio", `${row.key}.wav`)));
    if (pronunciationKey(asset) !== row.key || signal.sha256 !== row.sha256 || signal.sha256 !== asset.sha256) throw new Error(`Recording changed before automatic approval: ${row.headword}`);
    const flags = pronunciationReviewFlags(row.headword, signal.duration, asset.frontendText);
    if (flags.length) {
      store.sqlite.query("UPDATE assets SET flags=? WHERE key=? AND sha256=?").run(JSON.stringify(flags), row.key, signal.sha256);
      continue;
    }
    if (store.autoApprove(row.key, signal.sha256)) approved++;
  }
  return approved;
}
