import { mkdir, open, readFile, writeFile, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { inspectPronunciationWav } from "@/src/lib/pronunciation-wav";
import { pronunciationKey } from "@/src/lib/pronunciation-identity";
import { PronunciationWorkflowStore, type GeneratedAsset, type WorkflowConfig } from "./workflow-store";
import { applyAutomaticApprovals } from "./workflow-approval";

export async function withWorkflowLock<T>(dir: string, action: () => Promise<T>): Promise<T> {
  const path = join(dir, "run.lock");
  const lock = await open(path, "wx").catch(() => { throw new Error(`Workflow is busy: ${path}. Remove a stale lock only after its process has exited.`); });
  await lock.writeFile(String(process.pid));
  try { return await action(); } finally { await lock.close(); await unlink(path); }
}

export function describeEma(python: string, cache: string, revision?: string) {
  const result = spawnSync(python, [resolve("scripts/ema-pronunciation.py"), "--cache", cache, "--describe", ...(revision ? ["--revision", revision] : [])], { encoding: "utf8", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || "Cannot inspect EMA environment");
  return JSON.parse(result.stdout) as Pick<WorkflowConfig, "model" | "modelRevision" | "packageVersion">;
}

export async function runWorkflow(store: PronunciationWorkflowStore, maximumBatches: number, retryBatch?: number) {
  return withWorkflowLock(store.dir, async () => {
    const config = store.config();
    const current = describeEma(config.python, config.cache, config.modelRevision);
    if (current.packageVersion !== config.packageVersion || current.model !== config.model) throw new Error("EMA environment changed; use a new workflow directory");
    if (retryBatch !== undefined) store.retryBatch(retryBatch);
    const approvedExisting = await applyAutomaticApprovals(store);
    if (approvedExisting) console.log(`Approved ${approvedExisting} existing unflagged recordings under the saved owner policy.`);
    let stopped = false;
    let child: ReturnType<typeof spawn> | undefined;
    const interrupt = () => { stopped = true; child?.kill("SIGTERM"); };
    process.on("SIGINT", interrupt);
    process.on("SIGTERM", interrupt);
    const started = performance.now();
    let completed = 0;
    try {
      while (!stopped && completed < maximumBatches) {
        const batch = store.nextBatch();
        if (!batch) break;
        const assets = store.batchAssets(batch.id);
        const batchDir = join(store.dir, "batches", String(batch.id).padStart(5, "0"));
        const audioDir = join(store.dir, "audio");
        await mkdir(batchDir, { recursive: true });
        await mkdir(audioDir, { recursive: true });
        const jobs = assets.map(asset => ({ spokenText: asset.headword, model: config.model, modelRevision: config.modelRevision, packageVersion: config.packageVersion, settings: config.settings, key: asset.key }));
        await writeFile(join(batchDir, "jobs.json"), JSON.stringify(jobs, null, 2));
        store.startBatch(batch.id);
        const time = performance.now();
        const log = await open(join(batchDir, "generation.log"), "a");
        let code: number | null = null;
        let failure: string | null = null;
        console.log(`Batch ${batch.id}: ${jobs.length} distinct headwords; progress saved in ${batchDir}`);
        try {
          child = spawn(config.python, [resolve("scripts/ema-pronunciation.py"), "--cache", config.cache, "--revision", config.modelRevision, "--jobs", join(batchDir, "jobs.json"), "--output", batchDir, "--audio-dir", audioDir], { stdio: ["ignore", log.fd, log.fd], env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
          code = await new Promise<number | null>((accept, reject) => { child!.once("error", reject); child!.once("exit", accept); });
          if (code !== 0) failure = stopped ? "Interrupted; rerun resumes this batch" : "Generation failed; see generation.log and failures.jsonl";
        } catch (error) { failure = (error as Error).message; }
        finally { child = undefined; await log.close(); }
        let manifest: Record<string, GeneratedAsset> = {};
        try { manifest = JSON.parse(await readFile(join(batchDir, "manifest.json"), "utf8")); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") failure = (error as Error).message; }
        const valid: GeneratedAsset[] = [];
        for (const job of jobs) {
          const asset = manifest[job.key];
          if (!asset) continue;
          try {
            if (pronunciationKey(asset) !== job.key) throw new Error("Checkpoint identity changed");
            const signal = inspectPronunciationWav(await readFile(join(audioDir, `${job.key}.wav`)));
            if (signal.sha256 !== asset.sha256) throw new Error("Checkpoint checksum changed");
            valid.push({ ...asset, duration: signal.duration, rms: signal.rms, peak: signal.peak });
          } catch (error) { failure = `${job.spokenText}: ${(error as Error).message}`; }
        }
        if (valid.length !== jobs.length) failure ??= "Some recordings are missing";
        const elapsed = (performance.now() - time) / 1000;
        store.finishBatch(batch.id, valid, code === 0 && !failure, elapsed, failure);
        if (failure) throw new Error(`Batch ${batch.id}: ${failure}. Cursor has not advanced.`);
        const approved = await applyAutomaticApprovals(store, batch.id);
        completed++;
        console.log(`Batch ${batch.id} complete in ${elapsed.toFixed(1)}s. Next batch: ${store.nextBatch()?.id ?? "none"}. Automatically approved: ${approved}; other recordings keep their review decisions.`);
      }
      return { completedBatches: completed, elapsedSeconds: (performance.now() - started) / 1000, ...store.status() };
    } finally { process.off("SIGINT", interrupt); process.off("SIGTERM", interrupt); }
  });
}
