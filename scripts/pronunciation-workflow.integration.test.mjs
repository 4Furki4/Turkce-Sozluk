import { test, expect } from "bun:test";
import { mkdtemp, mkdir, writeFile, readFile, rm, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PronunciationWorkflowStore } from "../src/scripts/pronunciations/workflow-store.ts";
import { runWorkflow, withWorkflowLock } from "../src/scripts/pronunciations/workflow-runner.ts";
import { saveWorkflowReview, startWorkflowReviewServer } from "../src/scripts/pronunciations/workflow-review.ts";
import { pronunciationStorage, publishPronunciation } from "../src/scripts/pronunciations/publish.ts";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { applyAutomaticApprovals } from "../src/scripts/pronunciations/workflow-approval.ts";
import { publishWorkflow } from "../src/scripts/pronunciations/workflow-publish.ts";

const metadata = { model: "canberkkkkkk/ema-lightning", modelRevision: "test-revision", packageVersion: "1.0.1" };
const settings = { seed: 0, speed: 1, device: "cpu", sampleRate: 48000, pipeline: 1 };

test("R2 requests use the bucket once when existing API endpoints include its name", async () => {
  const names = ["S3_API_URL", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "NEXT_PUBLIC_R2_CUSTOM_URL"];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    Object.assign(process.env, { R2_ACCESS_KEY_ID: "test-access", R2_SECRET_ACCESS_KEY: "test-secret", R2_BUCKET_NAME: "turkce-sozluk", NEXT_PUBLIC_R2_CUSTOM_URL: "https://media.example.test/" });
    for (const endpoint of ["https://account.r2.cloudflarestorage.com", "https://account.r2.cloudflarestorage.com/turkce-sozluk/"]) {
      process.env.S3_API_URL = endpoint;
      const storage = pronunciationStorage();
      let request;
      storage.s3.config.requestHandler = { handle: async value => {
        request = value;
        return { response: { statusCode: 200, headers: { "content-length": "1", "content-type": "audio/wav" }, body: Buffer.alloc(0) } };
      } };
      await storage.s3.send(new HeadObjectCommand({ Bucket: storage.bucket, Key: "pronunciations/ema/asset/checksum.wav" }));
      expect(request.hostname).toBe("account.r2.cloudflarestorage.com");
      expect(request.path).toBe("/turkce-sozluk/pronunciations/ema/asset/checksum.wav");
      expect(storage.base).toBe("https://media.example.test");
      storage.s3.destroy();
    }
    process.env.S3_API_URL = "https://account.r2.cloudflarestorage.com/unrelated-bucket";
    expect(() => pronunciationStorage()).toThrow("R2 account endpoint");
  } finally {
    for (const name of names) previous[name] === undefined ? delete process.env[name] : process.env[name] = previous[name];
  }
});
async function fixture(extraEntries = []) {
  const dir = await mkdtemp(join(tmpdir(), "pronunciation-workflow-test-"));
  const python = join(dir, "fake-python");
  await writeFile(python, `#!/usr/bin/env bun
import {readFileSync,writeFileSync,existsSync,mkdirSync,unlinkSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';import {createHash} from 'node:crypto';
const args=process.argv.slice(2);const arg=name=>args[args.indexOf(name)+1];
if(args.includes('--describe')){console.log(${JSON.stringify(JSON.stringify(metadata))});process.exit(0)}
const output=arg('--output'),audio=arg('--audio-dir'),cache=arg('--cache');mkdirSync(output,{recursive:true});mkdirSync(audio,{recursive:true});
const jobs=JSON.parse(readFileSync(arg('--jobs')));const mp=join(output,'manifest.json');const manifest=existsSync(mp)?JSON.parse(readFileSync(mp)):{};
const fail=existsSync(join(cache,'fail-once'));if(fail)unlinkSync(join(cache,'fail-once'));
const frames=15360;const wav=Buffer.alloc(44+frames*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(frames*2,40);for(let i=0;i<frames;i++)wav.writeInt16LE(Math.round(12000*Math.sin(i/12)),44+i*2);
for(const job of jobs.slice(0,fail?1:jobs.length)){if(manifest[job.key]&&existsSync(join(audio,job.key+'.wav')))continue;writeFileSync(join(audio,job.key+'.wav'),wav);appendFileSync(join(cache,'generated.txt'),job.spokenText+'\\n');manifest[job.key]={...job,file:job.key+'.wav',duration:.32,rms:.25,peak:.4,frontendText:job.spokenText.replaceAll('â','a'),sha256:createHash('sha256').update(wav).digest('hex')};writeFileSync(mp,JSON.stringify(manifest))}
process.exit(fail?1:0);`);
  await chmod(python, 0o755);
  const cache = join(dir, "cache"); await mkdir(cache);
  const workflowDir = join(dir, "workflow");
  const store = new PronunciationWorkflowStore(workflowDir, true);
  store.initialize([{ id: 1, name: "o" }, { id: 2, name: "o" }, { id: 3, name: "I" }, { id: 4, name: "İ" }, { id: 5, name: "ı" }, { id: 6, name: "i" }, { id: 7, name: "kâr" }, { id: 8, name: "kar" }, { id: 9, name: "baş başa" }, ...extraEntries], { version: 1, ...metadata, settings, batchSize: 2, python, cache, createdAt: new Date().toISOString() });
  return { dir, cache, store, workflowDir };
}

test("automatic batches deduplicate exact headwords and resume failure without advancing", async () => {
  const f = await fixture();
  try {
    expect(f.store.status().assets.total).toBe(8);
    expect(f.store.keyForWord(1)).toBe(f.store.keyForWord(2));
    expect(new Set([3,4,5,6,7,8].map(id => f.store.keyForWord(id))).size).toBe(6);
    await writeFile(join(f.cache, "fail-once"), "1");
    await expect(runWorkflow(f.store, 4)).rejects.toThrow("Cursor has not advanced");
    expect(f.store.nextBatch().id).toBe(1);
    expect(f.store.status().assets.generated).toBe(1);
    const result = await runWorkflow(f.store, 2);
    expect(result.completedBatches).toBe(2);
    expect(f.store.nextBatch().id).toBe(3);
    f.store.startBatch(3); // Simulate process death after the durable 'running' checkpoint.
    f.store.close();
    f.store = new PronunciationWorkflowStore(f.workflowDir);
    await runWorkflow(f.store, 10);
    expect(f.store.nextBatch()).toBeNull();
    expect(f.store.status().assets.generated).toBe(8);
    const generated = (await readFile(join(f.cache, "generated.txt"), "utf8")).trim().split("\n");
    expect(generated.filter(word => word === "o")).toHaveLength(1);
    expect(generated).toHaveLength(8);
    await rm(join(f.store.dir, "audio", f.store.keyForWord(1) + ".wav"));
    await runWorkflow(f.store, 1, 1);
    expect(f.store.nextBatch()).toBeNull();
    expect((await readFile(join(f.cache, "generated.txt"), "utf8")).trim().split("\n")).toHaveLength(9);
    expect(() => f.store.initialize([{ id: 10, name: "new word" }], f.store.config())).toThrow("already initialized");
  } finally { f.store.close(); await rm(f.dir, { recursive: true, force: true }); }
});

test("review decisions and notes survive restart, distinguish rejections, and invalidate changed audio", async () => {
  const f = await fixture();
  try {
    await runWorkflow(f.store, 10);
    const approved = f.store.asset(f.store.keyForWord(1));
    await saveWorkflowReview(f.store, approved.key, approved.sha256, "approved", "Reviewed both o entries");
    const rejected = f.store.asset(f.store.keyForWord(7));
    await saveWorkflowReview(f.store, rejected.key, rejected.sha256, "rejected", "Sounds like kar");
    const deferred = f.store.asset(f.store.keyForWord(8));
    await saveWorkflowReview(f.store, deferred.key, deferred.sha256, "deferred", "Try a different seed");
    f.store.close(); f.store = new PronunciationWorkflowStore(f.workflowDir);
    expect(f.store.asset(approved.key).note).toBe("Reviewed both o entries");
    expect(f.store.approved(100).map(row => row.key)).toEqual([approved.key]);
    expect(f.store.list("rejected", true, 0).rows[0].key).toBe(rejected.key);
    expect(f.store.isApproved(approved.key, approved.sha256)).toBe(true);
    const changed = { ...JSON.parse(approved.metadata), sha256: "a".repeat(64) };
    f.store.finishBatch(1, [changed], false, 0, "Regenerated");
    expect(f.store.asset(approved.key).decision).toBe("unreviewed");
    expect(f.store.isApproved(approved.key, approved.sha256)).toBe(false);
    expect(f.store.approved(100)).toHaveLength(0);
    await expect(saveWorkflowReview(f.store, approved.key, "a".repeat(64), "approved", "")).rejects.toThrow("changed");
    expect(f.store.sqlite.query("SELECT count(*) AS count FROM review_events").get().count).toBe(3);
  } finally { f.store.close(); await rm(f.dir, { recursive: true, force: true }); }
});

test("loopback review API persists decisions, checks request origin and token, and serves WAV ranges", async () => {
  const f = await fixture(); let server;
  try {
    await runWorkflow(f.store, 1);
    server = await startWorkflowReviewServer(f.store, 0);
    const origin = `http://127.0.0.1:${server.address().port}`;
    const page = await (await fetch(origin + "/?locale=en")).text();
    expect(page).toContain("Pronunciation review queue");
    const token = /const token="([a-f0-9]+)"/.exec(page)[1];
    const data = await (await fetch(origin + "/api/assets")).json();
    expect(data.rows[0].entryIds).toEqual([1,2]);
    const row = data.rows[0];
    const body = JSON.stringify({ key: row.key, sha256: row.sha256, decision: "approved", note: "API review" });
    const denied = await fetch(origin + "/api/reviews", { method: "POST", headers: { "Content-Type": "application/json", "X-Review-Token": token, Origin: "https://unrelated.example" }, body });
    expect(denied.status).toBe(403);
    expect(f.store.approved(10)).toHaveLength(0);
    const saved = await fetch(origin + "/api/reviews", { method: "POST", headers: { "Content-Type": "application/json", "X-Review-Token": token, Origin: origin }, body });
    expect(saved.status).toBe(200);
    expect(f.store.asset(row.key).decision).toBe("approved");
    const range = await fetch(origin + "/media/" + row.key + ".wav", { headers: { Range: "bytes=0-43" } });
    expect(range.status).toBe(206);
    expect((await range.arrayBuffer()).byteLength).toBe(44);
    expect(range.headers.get("content-type")).toBe("audio/wav");
  } finally { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } f.store.close(); await rm(f.dir, { recursive: true, force: true }); }
});

test("publication rejects unapproved or altered files before touching storage or database", async () => {
  const f = await fixture();
  try {
    await runWorkflow(f.store, 1);
    const row = f.store.asset(f.store.keyForWord(1)); const asset = JSON.parse(row.metadata);
    let calls = 0;
    const storage = { base: "https://media.example", bucket: "test", s3: { send: async () => { calls++; } } };
    const db = { transaction: async () => { calls++; } };
    const path = join(f.store.dir, "audio", asset.file);
    const assertApproved = () => { if (!f.store.isApproved(asset.key, asset.sha256)) throw new Error("Not approved"); };
    await expect(publishPronunciation(db, storage, asset, path, f.store.entries(asset.key), assertApproved)).rejects.toThrow("Not approved");
    expect(calls).toBe(0);
    await saveWorkflowReview(f.store, asset.key, asset.sha256, "approved", "test");
    const bytes = await readFile(path); bytes[100] ^= 1; await writeFile(path, bytes);
    await expect(publishPronunciation(db, storage, asset, path, f.store.entries(asset.key), assertApproved)).rejects.toThrow("changed since review");
    expect(calls).toBe(0);
  } finally { f.store.close(); await rm(f.dir, { recursive: true, force: true }); }
});

test("an active generation lock prevents a second runner", async () => {
  const f = await fixture();
  try { await withWorkflowLock(f.store.dir, async () => { await expect(runWorkflow(f.store, 1)).rejects.toThrow("busy"); }); }
  finally { f.store.close(); await rm(f.dir, { recursive: true, force: true }); }
});

test("approved publication reuses immutable objects, associates duplicate entries, and rechecks withdrawn approvals", async () => {
  const f = await fixture();
  try {
    await runWorkflow(f.store, 1);
    const row = f.store.asset(f.store.keyForWord(1)); const asset = JSON.parse(row.metadata);
    await saveWorkflowReview(f.store, asset.key, asset.sha256, "approved", "fixture approval");
    let object, puts = 0, withdraw = false;
    const storage = { base: "https://media.example", bucket: "test", s3: { send: async command => {
      if (command.constructor.name === "PutObjectCommand") { puts++; object = command.input; return {}; }
      if (withdraw) f.store.review(asset.key, asset.sha256, "rejected", "Withdrawn during upload check");
      if (!object) throw { $metadata: { httpStatusCode: 404 } };
      return { Metadata: object.Metadata, ContentLength: object.Body.length };
    } } };
    const writes = [];
    const tx = { query: { words: { findFirst: async () => ({ name: "o" }) } }, insert: () => ({ values: value => ({ onConflictDoUpdate: async () => { writes.push(value); } }) }) };
    const db = { transaction: async action => action(tx) };
    const assertApproved = () => { if (!f.store.isApproved(asset.key, asset.sha256)) throw new Error("Approval withdrawn"); };
    const publish = () => publishPronunciation(db, storage, asset, join(f.store.dir, "audio", asset.file), f.store.entries(asset.key), assertApproved);
    await publish();
    expect(puts).toBe(1);
    expect(writes.filter(value => value.wordId).map(value => value.wordId)).toEqual([1, 2]);
    expect(object.ContentType).toBe("audio/wav");
    expect(object.Key).toContain(asset.sha256);
    f.store.recordPublished(asset.key, asset.sha256, "fixture-target");
    expect(f.store.published(asset.key, asset.sha256, "fixture-target")).toBe(true);
    expect(f.store.published(asset.key, asset.sha256, "another-target")).toBe(false);
    await publish(); expect(puts).toBe(1);
    const before = writes.length;
    withdraw = true;
    await expect(publish()).rejects.toThrow("Approval withdrawn");
    expect(writes).toHaveLength(before);
  } finally { f.store.close(); await rm(f.dir, { recursive: true, force: true }); }
});

test("owner policy persists and approves only unflagged recordings across future batches", async () => {
  const f = await fixture([{ id: 10, name: "merhaba" }]);
  try {
    expect(f.store.reviewPolicy().mode).toBe("manual");
    await runWorkflow(f.store, 1);
    expect(f.store.approved(100)).toHaveLength(0);
    f.store.setReviewPolicy("approve-unflagged", "Owner accepted the pilot");
    f.store.close(); f.store = new PronunciationWorkflowStore(f.workflowDir);
    expect(f.store.reviewPolicy().mode).toBe("approve-unflagged");
    await runWorkflow(f.store, 10);
    expect(f.store.approved(100).map(row => row.headword)).toEqual(["kar", "baş başa", "merhaba"]);
    for (const id of [1,3,4,5,6,7]) expect(f.store.asset(f.store.keyForWord(id)).decision).toBe("unreviewed");
    expect(f.store.asset(f.store.keyForWord(10)).note).toContain("Automatic approval under owner policy");
    const events = f.store.sqlite.query("SELECT count(*) AS count FROM review_events").get().count;
    expect(await applyAutomaticApprovals(f.store)).toBe(0);
    expect(f.store.sqlite.query("SELECT count(*) AS count FROM review_events").get().count).toBe(events);
    const rejected = f.store.asset(f.store.keyForWord(8));
    await saveWorkflowReview(f.store, rejected.key, rejected.sha256, "rejected", "Owner correction");
    const deferred = f.store.asset(f.store.keyForWord(9));
    await saveWorkflowReview(f.store, deferred.key, deferred.sha256, "deferred", "Needs another take");
    await runWorkflow(f.store, 1, 4);
    expect(f.store.asset(rejected.key).decision).toBe("rejected");
    expect(f.store.asset(deferred.key).decision).toBe("deferred");
    expect(f.store.approved(100).map(row => row.headword)).toEqual(["merhaba"]);
    f.store.setReviewPolicy("manual", "Owner disabled automatic approval");
    expect(await applyAutomaticApprovals(f.store)).toBe(0);
    expect(f.store.asset(f.store.keyForWord(10)).decision).toBe("approved");
  } finally { f.store.close(); await rm(f.dir, { recursive: true, force: true }); }
});

test("automatic approval revalidates actual WAVs and never inherits old checksum approvals", async () => {
  const { createHash } = await import("node:crypto");
  const f = await fixture();
  try {
    await runWorkflow(f.store, 10);
    f.store.setReviewPolicy("approve-unflagged", "Owner policy");
    const row = f.store.asset(f.store.keyForWord(8)); const asset = JSON.parse(row.metadata);
    const path = join(f.store.dir, "audio", asset.file);
    const bytes = await readFile(path); bytes[100] ^= 1; await writeFile(path, bytes);
    await expect(applyAutomaticApprovals(f.store)).rejects.toThrow("changed before automatic approval");
    expect(f.store.approved(100)).toHaveLength(0);
    const changed = { ...asset, sha256: createHash("sha256").update(bytes).digest("hex") };
    f.store.finishBatch(4, [changed], false, 0, "Updated recording");
    expect(await applyAutomaticApprovals(f.store)).toBe(2);
    expect(f.store.isApproved(asset.key, asset.sha256)).toBe(false);
    expect(f.store.isApproved(changed.key, changed.sha256)).toBe(true);
    await saveWorkflowReview(f.store, changed.key, changed.sha256, "rejected", "Owner correction");
    bytes[102] ^= 1; await writeFile(path, bytes);
    const regenerated = { ...changed, sha256: createHash("sha256").update(bytes).digest("hex") };
    f.store.finishBatch(4, [regenerated], false, 0, "New checksum");
    expect(await applyAutomaticApprovals(f.store)).toBe(0);
    expect(f.store.asset(regenerated.key).decision).toBe("unreviewed");
  } finally { f.store.close(); await rm(f.dir, { recursive: true, force: true }); }
});

test("automatic approval keeps unusual actual audio lengths for review even with stale signal metadata", async () => {
  const { createHash } = await import("node:crypto");
  const f = await fixture();
  try {
    await runWorkflow(f.store, 10);
    const row = f.store.asset(f.store.keyForWord(8)); const asset = JSON.parse(row.metadata);
    const path = join(f.store.dir, "audio", asset.file);
    const bytes = (await readFile(path)).subarray(0, 44 + 4800 * 2); // Valid non-silent 0.1s WAV.
    bytes.writeUInt32LE(bytes.length - 8, 4); bytes.writeUInt32LE(bytes.length - 44, 40);
    await writeFile(path, bytes);
    f.store.finishBatch(4, [{ ...asset, sha256: createHash("sha256").update(bytes).digest("hex") }], false, 0, "Stale signal metadata fixture");
    f.store.setReviewPolicy("approve-unflagged", "Owner policy");
    expect(await applyAutomaticApprovals(f.store)).toBe(1);
    expect(f.store.asset(asset.key).decision).toBe("unreviewed");
    expect(JSON.parse(f.store.asset(asset.key).flags)).toContain("shortAudio");
    expect(f.store.approved(10).map(row => row.headword)).toEqual(["baş başa"]);
  } finally { f.store.close(); await rm(f.dir, { recursive: true, force: true }); }
});

test("parallel publication bounds active uploads, checkpoints successes, and resumes failed recordings", async () => {
  const f = await fixture([{ id: 10, name: "merhaba" }, { id: 11, name: "gökkuşağı" }]);
  try {
    await runWorkflow(f.store, 10);
    f.store.setReviewPolicy("approve-unflagged", "Owner accepted pilot");
    await applyAutomaticApprovals(f.store);
    let active = 0, maxActive = 0, fail = true;
    const calls = [];
    const publish = async (asset, path, entries, assertApproved) => {
      assertApproved();
      active++; maxActive = Math.max(maxActive, active); calls.push(asset.spokenText);
      try {
        await new Promise(resolve => setTimeout(resolve, 10));
        if (asset.spokenText === "merhaba" && fail) throw new Error("Temporary upload failure");
        assertApproved();
      } finally { active--; }
    };
    const options = { target: "development", limit: 100, concurrency: 2, publish };
    expect(await publishWorkflow(f.store, options)).toEqual({ completed: 3, failed: 1, total: 4 });
    expect(maxActive).toBe(2);
    expect(calls.sort()).toEqual(["baş başa", "gökkuşağı", "kar", "merhaba"].sort());
    expect(await readFile(join(f.store.dir, "publication-failures.jsonl"), "utf8")).toContain("Temporary upload failure");
    f.store.close(); f.store = new PronunciationWorkflowStore(f.workflowDir);
    fail = false; calls.length = 0;
    expect(await publishWorkflow(f.store, options)).toEqual({ completed: 1, failed: 0, total: 1 });
    expect(calls).toEqual(["merhaba"]);
    expect(await publishWorkflow(f.store, options)).toEqual({ completed: 0, failed: 0, total: 0 });
    expect(await publishWorkflow(f.store, { ...options, target: "production" })).toEqual({ completed: 4, failed: 0, total: 4 });
    const row = f.store.asset(f.store.keyForWord(10));
    await saveWorkflowReview(f.store, row.key, row.sha256, "rejected", "Owner withdrew approval");
    calls.length = 0;
    expect(await publishWorkflow(f.store, { ...options, target: "another-target" })).toEqual({ completed: 3, failed: 0, total: 3 });
    expect(calls).not.toContain("merhaba");
  } finally { f.store.close(); await rm(f.dir, { recursive: true, force: true }); }
});
