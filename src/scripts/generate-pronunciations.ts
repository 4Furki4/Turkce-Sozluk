#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile, open, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { and, asc, gt, inArray } from "drizzle-orm";
import { config } from "dotenv";
import { pronunciationKey, type PronunciationIdentity } from "@/src/lib/pronunciation-identity";
import { words } from "@/db/schema/words";
import { pronunciationAssets } from "@/db/schema/pronunciation_assets";
import { PronunciationWorkflowStore } from "./pronunciations/workflow-store";
import { pronunciationStorage, publishPronunciation } from "./pronunciations/publish";

type Asset = PronunciationIdentity & { key: string; file: string; sha256: string; duration: number; rms: number; peak: number };
const { values } = parseArgs({ options: {
  word: { type: "string", multiple: true }, "word-id": { type: "string", multiple: true },
  limit: { type: "string" }, "after-id": { type: "string", default: "0" },
  "ema-dir": { type: "string" }, python: { type: "string" }, cache: { type: "string" }, revision: { type: "string" },
  output: { type: "string", default: ".pronunciation-cache" }, speed: { type: "string", default: "1" },
  seed: { type: "string", default: "0" }, publish: { type: "boolean" }, "publish-only": { type: "boolean" },
  "review-workflow": { type: "string" },
  "env-file": { type: "string", default: ".env.development.local" }, help: { type: "boolean" },
} });
if (values.help) {
  console.log(`Generate dictionary headwords with cached EMA; writes a local review.html by default.
  --word TEXT (repeatable, exact case/diacritics) | --word-id ID (repeatable)
  --limit N --after-id ID       Select an ordered batch (default: 20)
  --ema-dir DIR                Existing setup containing work/.venv and work/huggingface
  --python PATH --cache DIR    Alternative environment/cache paths
  --revision SHA --seed N --speed N --output DIR --env-file PATH
  --publish / --publish-only  Publish only saved approvals; requires --review-workflow DIR
  Full batches and reviews: bun run pronunciations:workflow --help
  DATABASE_URL from the shell takes precedence. No generation runs in page requests.`);
  process.exit(0);
}
if ((values.publish || values["publish-only"]) && !values["review-workflow"]) {
  console.error("Publication requires persistent approvals: use pronunciations:workflow publish or --review-workflow DIR");
  process.exit(1);
}
config({ path: values["env-file"], quiet: true });
// Bun/Next may already have loaded .env.local. Explicit shell overrides are never changed.
function integer(value: string, name: string, minimum = 0) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum) throw new Error(`${name} must be an integer >= ${minimum}`);
  return number;
}
const limit = integer(values.limit ?? "20", "limit", 1);
const afterId = integer(values["after-id"]!, "after-id");
const ids = values["word-id"]?.map(id => integer(id, "word-id", 1));
if (values.word && ids) throw new Error("Select by --word or --word-id, not both");
const seed = integer(values.seed!, "seed");
const speed = Number(values.speed);
if (!Number.isFinite(speed) || speed < 0.25 || speed > 4) throw new Error("speed must be 0.25–4");
const output = resolve(values.output!);
await mkdir(output, { recursive: true });
// Prevent two processes from overwriting the same checkpoint.
const lockPath = join(output, "batch.lock");
const lock = await open(lockPath, "wx").catch(() => { throw new Error(`Another batch owns ${lockPath}. Remove a stale lock only after that process has exited.`); });
await lock.writeFile(String(process.pid));

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
async function main() {
  const { db } = await import("@/db");
  const selected = await db.select({ id: words.id, name: words.name }).from(words)
    .where(and(gt(words.id, afterId), ids ? inArray(words.id, ids) : values.word ? inArray(words.name, values.word) : undefined))
    .orderBy(asc(words.id)).limit(limit);
  if (!selected.length) throw new Error("No matching dictionary entries");
  const missing = ids ? ids.filter(id => !selected.some(word => word.id === id)) : values.word?.filter(name => !selected.some(word => word.name === name));
  if (missing?.length) throw new Error(`Requested entries missing or excluded by limit/after-id: ${missing.join(", ")}`);
  let manifest: Record<string, Asset> = {};
  try { manifest = JSON.parse(await readFile(join(output, "manifest.json"), "utf8")); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  let jobs: (PronunciationIdentity & { key: string })[];
  let workerFailed = false;
  if (values["publish-only"]) {
    // Require an unambiguous saved identity; changing settings must generate a new batch first.
    jobs = selected.map(word => {
      const matches = Object.values(manifest).filter(asset => asset.spokenText === word.name && asset.settings.seed === seed && asset.settings.speed === speed && (!values.revision || asset.modelRevision === values.revision));
      if (matches.length !== 1) throw new Error(`Expected one reviewed asset for ${word.name}; use a separate output directory per model/settings batch`);
      return matches[0];
    });
    jobs = [...new Map(jobs.map(job => [job.key, job])).values()];
  } else {
    const setup = values["ema-dir"] ?? process.env.EMA_SETUP_DIR;
    const python = values.python ?? (setup ? join(setup, "work/.venv/bin/python") : undefined);
    const cache = values.cache ?? (setup ? join(setup, "work/huggingface") : undefined);
    if (!python || !cache) throw new Error("Set --ema-dir or both --python and --cache to reuse an installed EMA environment");
    const worker = resolve("scripts/ema-pronunciation.py");
    const args = [worker, "--cache", resolve(cache), ...(values.revision ? ["--revision", values.revision] : [])];
    const description = spawnSync(python, [...args, "--describe"], { encoding: "utf8" });
    if (description.status !== 0) throw new Error(description.stderr || description.error?.message || "Cannot inspect EMA cache");
    const metadata = JSON.parse(description.stdout) as Pick<PronunciationIdentity, "model" | "modelRevision" | "packageVersion">;
    const identities = selected.map(word => ({ spokenText: word.name, ...metadata, settings: { seed, speed, device: "cpu", sampleRate: 48000, pipeline: 1 } }));
    jobs = [...new Map(identities.map(identity => [pronunciationKey(identity), { ...identity, key: pronunciationKey(identity) }])).values()];
    // Recover completed durable assets when the local cache was moved or lost.
    const durable = await db.select().from(pronunciationAssets).where(inArray(pronunciationAssets.key, jobs.map(job => job.key)));
    for (const asset of durable) {
      if (manifest[asset.key]) continue;
      const response = await fetch(asset.audioUrl, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`Cannot recover saved recording for ${asset.spokenText}: HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256) throw new Error(`Saved audio checksum mismatch for ${asset.spokenText}`);
      await writeFile(join(output, `${asset.key}.wav`), bytes);
      manifest[asset.key] = { ...asset, file: `${asset.key}.wav`, peak: 0 };
    }
    await writeFile(join(output, "manifest.json"), JSON.stringify(manifest, null, 2));
    const jobsPath = join(output, "jobs.json");
    await writeFile(jobsPath, JSON.stringify(jobs, null, 2));
    const generated = spawnSync(python, [...args, "--jobs", jobsPath, "--output", output], { stdio: "inherit" });
    if (generated.error) throw generated.error;
    workerFailed = generated.status !== 0;
    manifest = JSON.parse(await readFile(join(output, "manifest.json"), "utf8").catch(error => {
      if (error.code === "ENOENT") return "{}";
      throw error;
    }));
  }
  const rows = selected.map(word => {
    const job = jobs.find(job => job.spokenText === word.name)!;
    const asset = manifest[job.key];
    return `<tr><td>${word.id}</td><td lang="tr">${escapeHtml(word.name)}</td><td>${asset ? `<audio controls preload="none" src="${job.key}.wav"></audio>` : "FAILED — see failures.jsonl"}</td><td>${asset ? `${asset.duration.toFixed(2)}s · RMS ${asset.rms.toFixed(4)}` : ""}</td></tr>`;
  }).join("\n");
  await writeFile(join(output, "review.html"), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>EMA pronunciation review</title><style>body{font:16px system-ui;margin:24px;background:#fafafa;color:#222}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:12px;border-bottom:1px solid #ddd}audio{max-width:100%}@media(max-width:600px){tr,td{display:block}th{display:none}}</style><h1>Pronunciation review</h1><p>AI-generated with EMA. Listen for the correct word, vowels, stress, truncation, repeats and unwanted speech. Signal checks do not certify pronunciation quality.</p><p>Publish only after review. To correct a recording, use the app’s pronunciation contribution and admin approval workflow; approved human recordings take priority.</p><table><thead><tr><th>Entry ID</th><th>Spoken headword</th><th>Recording</th><th>Signal checks</th></tr></thead><tbody>${rows}</tbody></table><script>document.addEventListener('play',e=>{document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>`);
  console.log(`Review: ${join(output, "review.html")} (${selected.length} entries, ${jobs.length} unique recordings)`);
  if (values.publish || values["publish-only"]) {
    const reviews = new PronunciationWorkflowStore(values["review-workflow"]!);
    let storage: ReturnType<typeof pronunciationStorage> | undefined;
    let published = 0;
    try {
    for (const job of jobs) {
      const asset = manifest[job.key];
      if (!asset || !reviews.isApproved(job.key, asset.sha256)) continue;
      storage ??= pronunciationStorage();
      const assertApproved = () => { if (!reviews.isApproved(job.key, asset.sha256)) throw new Error(`Approval withdrawn or recording changed: ${asset.spokenText}`); };
      await publishPronunciation(db, storage, asset, join(output, `${job.key}.wav`), selected.filter(word => word.name === asset.spokenText), assertApproved);
      published++;
      console.log(`Published ${asset.spokenText}`);
    }
    } finally { reviews.close(); }
    console.log(`Published ${published} approved recordings; other decisions were excluded.`);
  }
  if (workerFailed) throw new Error("Some recordings failed. Successful files are checkpointed; rerun to retry failures.");
}
try { await main(); } catch (error) { console.error((error as Error).message); process.exitCode = 1; }
finally { await lock.close(); await unlink(lockPath); }
// The app DB client is shared; this standalone CLI should terminate after all writes finish.
process.exit(process.exitCode ?? 0);
