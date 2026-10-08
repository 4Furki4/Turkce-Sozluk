#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { config as dotenv } from "dotenv";
import { asc } from "drizzle-orm";
import { words } from "@/db/schema/words";
import { PronunciationWorkflowStore } from "./pronunciations/workflow-store";
import { describeEma, runWorkflow, withWorkflowLock } from "./pronunciations/workflow-runner";
import { saveWorkflowReview, startWorkflowReviewServer } from "./pronunciations/workflow-review";
import { pronunciationStorage, publishPronunciation } from "./pronunciations/publish";
import { applyAutomaticApprovals } from "./pronunciations/workflow-approval";
import { publishWorkflow } from "./pronunciations/workflow-publish";

const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  dir: { type: "string", default: ".pronunciation-cache/workflow" }, "batch-size": { type: "string", default: "500" },
  "max-batches": { type: "string", default: "1" }, all: { type: "boolean" }, limit: { type: "string", default: "500" },
  "retry-batch": { type: "string" },
  "auto-approve-unflagged": { type: "boolean" }, manual: { type: "boolean" },
  "ema-dir": { type: "string" }, python: { type: "string" }, cache: { type: "string" }, revision: { type: "string" },
  seed: { type: "string", default: "0" }, speed: { type: "string", default: "1" },
  "word-id": { type: "string" }, key: { type: "string" }, decision: { type: "string" }, note: { type: "string", default: "" },
  port: { type: "string", default: "8768" }, "env-file": { type: "string", default: ".env.development.local" }, help: { type: "boolean" },
  concurrency: { type: "string", default: "4" },
} });
const action = positionals[0];
if (values.help || !action) {
  console.log(`Persistent pronunciation workflow (local generation/review; publication is explicit).
  init       Freeze all dictionary entry IDs/headwords and EMA settings; --batch-size 500
  run        Resume the earliest unfinished batch; --max-batches 1 (pilot default) or --all
             --retry-batch N rechecks a completed batch, regenerating missing/corrupt files
  status     Show generation progress and checksum-bound review decisions
  serve      Local review queue at http://localhost:8768; --port 8768
  review     --word-id ID or --key HASH --decision approved|rejected|deferred|unreviewed --note TEXT
  policy     --auto-approve-unflagged accepts valid unflagged recordings now and in future batches
             --manual disables future automatic approval; existing decisions are preserved
  publish    Upload only approved current recordings; --limit 500 or --all; --concurrency 4 (1–16)
  Shared: --dir .pronunciation-cache/workflow --env-file PATH
  Init: --ema-dir DIR (or EMA_SETUP_DIR), --python PATH --cache DIR --revision SHA --seed 0 --speed 1
  A failed/interrupted batch never advances. Keep the entire workflow directory for resume/backup.`);
  process.exit(0);
}
function integer(value: string, name: string, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw new Error(`${name} must be an integer ${min}–${max}`);
  return number;
}
dotenv({ path: values["env-file"], quiet: true });
let store: PronunciationWorkflowStore | undefined;
let serving = false;
try {
  if (positionals.length !== 1 || !["init", "run", "status", "serve", "review", "policy", "publish"].includes(action)) throw new Error("Unknown command; use --help");
  store = new PronunciationWorkflowStore(values.dir!, action === "init");
  if (action === "init") {
    const setup = values["ema-dir"] ?? process.env.EMA_SETUP_DIR;
    const python = values.python ?? (setup ? join(setup, "work/.venv/bin/python") : undefined);
    const cache = values.cache ?? (setup ? join(setup, "work/huggingface") : undefined);
    if (!python || !cache) throw new Error("Set --ema-dir or --python and --cache to the existing EMA environment");
    const seed = integer(values.seed!, "seed", 0);
    const speed = Number(values.speed);
    if (!Number.isFinite(speed) || speed < 0.25 || speed > 4) throw new Error("speed must be 0.25–4");
    const metadata = describeEma(resolve(python), resolve(cache), values.revision);
    const { db } = await import("@/db");
    const entries = await db.select({ id: words.id, name: words.name }).from(words).orderBy(asc(words.id));
    await withWorkflowLock(store.dir, async () => store!.initialize(entries, { version: 1, ...metadata, python: resolve(python), cache: resolve(cache), batchSize: integer(values["batch-size"]!, "batch-size", 1, 1000), settings: { seed, speed, device: "cpu", sampleRate: 48000, pipeline: 1 }, createdAt: new Date().toISOString() }));
    console.log(JSON.stringify(store.status(), null, 2));
  } else {
    store.config();
    if (action === "run") console.log(JSON.stringify(await runWorkflow(store, values.all ? Number.MAX_SAFE_INTEGER : integer(values["max-batches"]!, "max-batches"), values["retry-batch"] ? integer(values["retry-batch"], "retry-batch") : undefined), null, 2));
    if (action === "status") console.log(JSON.stringify(store.status(), null, 2));
    if (action === "policy") {
      if (Boolean(values["auto-approve-unflagged"]) === Boolean(values.manual)) throw new Error("Choose exactly one --auto-approve-unflagged or --manual");
      await withWorkflowLock(store.dir, async () => {
        store!.setReviewPolicy(values.manual ? "manual" : "approve-unflagged", values.note || "Owner accepted unflagged pronunciation quality after listening to the pilot.");
        const approved = await applyAutomaticApprovals(store!);
        console.log(JSON.stringify({ approved, ...store!.status() }, null, 2));
      });
    }
    if (action === "review") {
      if (Boolean(values.key) === Boolean(values["word-id"])) throw new Error("Specify exactly one --word-id or --key");
      const key = values.key ?? store.keyForWord(integer(values["word-id"]!, "word-id"));
      const asset = key ? store.asset(key) : null;
      if (!asset?.sha256) throw new Error("Recording not generated in this snapshot");
      await saveWorkflowReview(store, asset.key, asset.sha256, values.decision, values.note);
      console.log(`Saved ${values.decision}: ${asset.headword} (${asset.entryIds.join(", ")})`);
    }
    if (action === "serve") {
      const port = integer(values.port!, "port", 1024, 65535);
      const server = await startWorkflowReviewServer(store, port);
      serving = true;
      console.log(`Pronunciation review: http://localhost:${port}/ (saved in ${store.dir}/workflow.sqlite)`);
      const close = () => server.close(() => { store!.close(); process.exit(0); });
      process.once("SIGINT", close); process.once("SIGTERM", close);
    }
    if (action === "publish") {
      await withWorkflowLock(store.dir, async () => {
        const candidates = store!.approved(Number.MAX_SAFE_INTEGER);
        if (!candidates.length) { console.log("No approved recordings. Review generated audio first; nothing published."); return; }
        const storage = pronunciationStorage();
        const dbUrl = new URL(process.env.DATABASE_URL!);
        const target = createHash("sha256").update(JSON.stringify([dbUrl.host, dbUrl.pathname, storage.bucket, storage.base])).digest("hex");
        const { db } = await import("@/db");
        const result = await publishWorkflow(store!, {
          target, limit: values.all ? Number.MAX_SAFE_INTEGER : integer(values.limit!, "limit"),
          concurrency: integer(values.concurrency!, "concurrency", 1, 16),
          publish: (asset, path, entries, assertApproved) => publishPronunciation(db, storage, asset, path, entries, assertApproved),
          onProgress: (completed, total, failed) => console.log(`${new Date().toISOString()} Published ${completed}/${total}; failed ${failed}. Progress is saved for this target.`),
        });
        console.log(`Published ${result.completed} approved recordings; unreviewed/rejected/deferred recordings were excluded.`);
        if (result.failed) throw new Error(`${result.failed} recordings failed publication; inspect publication-failures.jsonl and rerun to resume`);
      });
    }
  }
} catch (error) { console.error((error as Error).message); process.exitCode = 1; }
finally { if (!serving) store?.close(); }
if (!serving) process.exit(process.exitCode ?? 0);
