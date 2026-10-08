import { mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { pronunciationKey, type PronunciationIdentity } from "@/src/lib/pronunciation-identity";
import { isApprovedRecording, pronunciationReviewFlags, type ReviewDecision } from "@/src/lib/pronunciation-review";

// Bun-only batch tooling; the application never imports this module.
type Statement = { get(...args: unknown[]): any; all(...args: unknown[]): any[]; run(...args: unknown[]): unknown };
type Sqlite = { exec(sql: string): void; query(sql: string): Statement; transaction<T extends (...args: any[]) => any>(fn: T): T; close(): void };
const { Database } = require("bun:sqlite") as { Database: new (path: string, options: { create: boolean; strict: boolean }) => Sqlite };
export type GeneratedAsset = PronunciationIdentity & { key: string; file: string; sha256: string; duration: number; rms: number; peak: number; frontendText?: string };
export type WorkflowConfig = Omit<PronunciationIdentity, "spokenText"> & { version: 1; batchSize: number; python: string; cache: string; createdAt: string; snapshotHash: string };
export type WorkflowAsset = { key: string; headword: string; ordinal: number; batch: number; metadata: string | null; sha256: string | null; flags: string; decision: ReviewDecision; note: string; entryIds: number[] };
export type ReviewPolicy = { mode: "manual" | "approve-unflagged"; updatedAt: string | null; reason: string };

export class PronunciationWorkflowStore {
  readonly dir: string;
  readonly sqlite: Sqlite;
  constructor(directory: string, create = false) {
    this.dir = resolve(directory);
    const path = join(this.dir, "workflow.sqlite");
    if (!create && !existsSync(path)) throw new Error("Workflow not initialized; run pronunciations:workflow init first");
    mkdirSync(this.dir, { recursive: true });
    this.sqlite = new Database(path, { create, strict: true });
    this.sqlite.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS batches (id INTEGER PRIMARY KEY, state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, elapsed REAL, error TEXT);
      CREATE TABLE IF NOT EXISTS assets (key TEXT PRIMARY KEY, headword TEXT NOT NULL, ordinal INTEGER NOT NULL UNIQUE, batch INTEGER NOT NULL REFERENCES batches(id), metadata TEXT, sha256 TEXT, flags TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS entries (word_id INTEGER PRIMARY KEY, headword TEXT NOT NULL, asset_key TEXT NOT NULL REFERENCES assets(key));
      CREATE INDEX IF NOT EXISTS entries_asset ON entries(asset_key);
      CREATE INDEX IF NOT EXISTS assets_batch ON assets(batch, ordinal);
      CREATE TABLE IF NOT EXISTS reviews (asset_key TEXT NOT NULL REFERENCES assets(key), sha256 TEXT NOT NULL, decision TEXT NOT NULL CHECK(decision IN ('approved','rejected','deferred','unreviewed')), note TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(asset_key,sha256));
      CREATE TABLE IF NOT EXISTS review_events (id INTEGER PRIMARY KEY, asset_key TEXT NOT NULL, sha256 TEXT NOT NULL, decision TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS publications (asset_key TEXT NOT NULL, sha256 TEXT NOT NULL, target TEXT NOT NULL, published_at TEXT NOT NULL, PRIMARY KEY(asset_key,sha256,target));`);
  }
  close() { this.sqlite.close(); }
  reviewPolicy(): ReviewPolicy {
    const row = this.sqlite.query("SELECT value FROM meta WHERE key='reviewPolicy'").get();
    return row ? JSON.parse(row.value) : { mode: "manual", updatedAt: null, reason: "" };
  }
  setReviewPolicy(mode: ReviewPolicy["mode"], reason: string) {
    const policy: ReviewPolicy = { mode, updatedAt: new Date().toISOString(), reason };
    this.sqlite.query("INSERT INTO meta VALUES ('reviewPolicy',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(policy));
  }
  automaticApprovalCandidates(batch?: number): WorkflowAsset[] {
    return this.sqlite.query(`SELECT a.*,COALESCE(r.decision,'unreviewed') AS decision,COALESCE(r.note,'') AS note
      FROM assets a LEFT JOIN reviews r ON r.asset_key=a.key AND r.sha256=a.sha256
      WHERE a.metadata IS NOT NULL AND a.flags='[]' AND COALESCE(r.decision,'unreviewed')='unreviewed'
      AND (?=0 OR a.batch=?) AND NOT EXISTS (SELECT 1 FROM reviews blocked WHERE blocked.asset_key=a.key AND blocked.decision IN ('rejected','deferred'))
      ORDER BY a.ordinal`).all(batch ?? 0, batch ?? 0);
  }
  autoApprove(key: string, checksum: string) {
    return this.sqlite.transaction(() => {
      const policy = this.reviewPolicy();
      if (policy.mode !== "approve-unflagged") return false;
      const asset = this.sqlite.query("SELECT sha256,flags,metadata FROM assets WHERE key=?").get(key);
      if (!asset?.metadata || asset.sha256 !== checksum || asset.flags !== "[]" || this.decision(key, checksum) !== "unreviewed") return false;
      if (this.sqlite.query("SELECT 1 FROM reviews WHERE asset_key=? AND decision IN ('rejected','deferred') LIMIT 1").get(key)) return false;
      this.review(key, checksum, "approved", `Automatic approval under owner policy (${policy.updatedAt}): no extra-attention flags. ${policy.reason}`);
      return true;
    })();
  }
  config(): WorkflowConfig {
    const row = this.sqlite.query("SELECT value FROM meta WHERE key='config'").get();
    if (!row) throw new Error("Workflow snapshot is incomplete; initialize it first");
    const config = JSON.parse(row.value);
    if (config.version !== 1) throw new Error("Unsupported workflow version");
    return config;
  }
  initialize(entries: { id: number; name: string }[], config: Omit<WorkflowConfig, "snapshotHash">) {
    if (!entries.length) throw new Error("Dictionary snapshot is empty");
    if (this.sqlite.query("SELECT key FROM meta LIMIT 1").get()) throw new Error("Workflow already initialized; use run to resume or choose a new --dir");
    const snapshotHash = createHash("sha256").update(JSON.stringify(entries)).digest("hex");
    this.sqlite.transaction(() => {
      this.sqlite.query("INSERT INTO meta VALUES ('config',?)").run(JSON.stringify({ ...config, snapshotHash }));
      const unique = new Map<string, number>();
      const asset = this.sqlite.query("INSERT INTO assets(key,headword,ordinal,batch,flags) VALUES (?,?,?,?,?)");
      const entry = this.sqlite.query("INSERT INTO entries VALUES (?,?,?)");
      for (const word of entries) {
        const key = pronunciationKey({ spokenText: word.name, ...config });
        if (!unique.has(key)) {
          const ordinal = unique.size;
          const batch = Math.floor(ordinal / config.batchSize) + 1;
          this.sqlite.query("INSERT OR IGNORE INTO batches(id) VALUES (?)").run(batch);
          asset.run(key, word.name, ordinal, batch, JSON.stringify(pronunciationReviewFlags(word.name)));
          unique.set(key, ordinal);
        }
        entry.run(word.id, word.name, key);
      }
    })();
  }
  nextBatch(): { id: number; state: string } | null {
    return this.sqlite.query("SELECT id,state FROM batches WHERE state!='complete' ORDER BY id LIMIT 1").get();
  }
  batchAssets(batch: number): WorkflowAsset[] {
    return this.sqlite.query("SELECT a.*,COALESCE(r.decision,'unreviewed') AS decision,COALESCE(r.note,'') AS note FROM assets a LEFT JOIN reviews r ON r.asset_key=a.key AND r.sha256=a.sha256 WHERE batch=? ORDER BY ordinal").all(batch);
  }
  startBatch(batch: number) {
    this.sqlite.query("UPDATE batches SET state='running',attempts=attempts+1,error=NULL WHERE id=?").run(batch);
  }
  retryBatch(batch: number) {
    if (!this.sqlite.query("SELECT id FROM batches WHERE id=?").get(batch)) throw new Error("Unknown batch");
    this.sqlite.query("UPDATE batches SET state='pending',error=NULL WHERE id=?").run(batch);
  }
  finishBatch(batch: number, assets: GeneratedAsset[], success: boolean, elapsed: number, error: string | null) {
    this.sqlite.transaction(() => {
      for (const asset of assets) {
        const current = this.sqlite.query("SELECT headword FROM assets WHERE key=? AND batch=?").get(asset.key, batch);
        if (!current || current.headword !== asset.spokenText || pronunciationKey(asset) !== asset.key) throw new Error("Generated identity differs from frozen snapshot");
        this.sqlite.query("UPDATE assets SET metadata=?,sha256=?,flags=? WHERE key=?").run(JSON.stringify(asset), asset.sha256, JSON.stringify(pronunciationReviewFlags(asset.spokenText, asset.duration, asset.frontendText)), asset.key);
      }
      const counts = this.sqlite.query("SELECT count(*) AS total,count(metadata) AS generated FROM assets WHERE batch=?").get(batch);
      if (success && counts.total !== assets.length) throw new Error("Cannot advance a batch with missing recordings");
      this.sqlite.query("UPDATE batches SET state=?,elapsed=?,error=? WHERE id=?").run(success ? "complete" : "failed", elapsed, error, batch);
    })();
  }
  asset(key: string): WorkflowAsset | null {
    const row = this.sqlite.query("SELECT a.*,COALESCE(r.decision,'unreviewed') AS decision,COALESCE(r.note,'') AS note FROM assets a LEFT JOIN reviews r ON r.asset_key=a.key AND r.sha256=a.sha256 WHERE a.key=?").get(key);
    return row ? { ...row, entryIds: this.entries(key).map(word => word.id) } : null;
  }
  entries(key: string): { id: number; name: string }[] {
    return this.sqlite.query("SELECT word_id AS id,headword AS name FROM entries WHERE asset_key=? ORDER BY word_id").all(key);
  }
  keyForWord(id: number): string | undefined { return this.sqlite.query("SELECT asset_key FROM entries WHERE word_id=?").get(id)?.asset_key; }
  decision(key: string, checksum: string): ReviewDecision {
    return this.sqlite.query("SELECT decision FROM reviews WHERE asset_key=? AND sha256=?").get(key, checksum)?.decision ?? "unreviewed";
  }
  isApproved(key: string, checksum: string) {
    const row = this.sqlite.query("SELECT a.sha256,r.sha256 AS reviewedChecksum,r.decision FROM assets a LEFT JOIN reviews r ON r.asset_key=a.key AND r.sha256=a.sha256 WHERE a.key=?").get(key);
    return row?.sha256 === checksum && isApprovedRecording(row?.decision, row?.reviewedChecksum, checksum);
  }
  review(key: string, checksum: string, decision: ReviewDecision, note: string) {
    this.sqlite.transaction(() => {
      const asset = this.sqlite.query("SELECT sha256 FROM assets WHERE key=?").get(key);
      if (!asset?.sha256 || asset.sha256 !== checksum) throw new Error("Recording changed or is not generated; reload before reviewing");
      const date = new Date().toISOString();
      this.sqlite.query("INSERT INTO reviews VALUES (?,?,?,?,?) ON CONFLICT(asset_key,sha256) DO UPDATE SET decision=excluded.decision,note=excluded.note,updated_at=excluded.updated_at").run(key, checksum, decision, note, date);
      this.sqlite.query("INSERT INTO review_events(asset_key,sha256,decision,note,created_at) VALUES (?,?,?,?,?)").run(key, checksum, decision, note, date);
    })();
  }
  list(decision: string, attention: boolean, offset: number, limit = 30, batch?: number) {
    const where = "a.metadata IS NOT NULL AND (?='all' OR COALESCE(r.decision,'unreviewed')=?) AND (?=0 OR a.flags!='[]') AND (?=0 OR a.batch=?)";
    const args = [decision, decision, attention ? 1 : 0, batch ?? 0, batch ?? 0];
    const from = "FROM assets a LEFT JOIN reviews r ON r.asset_key=a.key AND r.sha256=a.sha256";
    const total = this.sqlite.query(`SELECT count(*) AS count ${from} WHERE ${where}`).get(...args).count;
    const rows = this.sqlite.query(`SELECT a.*,COALESCE(r.decision,'unreviewed') AS decision,COALESCE(r.note,'') AS note ${from} WHERE ${where} ORDER BY a.ordinal LIMIT ? OFFSET ?`).all(...args, limit, offset).map(row => ({ ...row, entryIds: this.entries(row.key).map(word => word.id) }));
    return { total, rows };
  }
  approved(limit: number) { return this.list("approved", false, 0, limit).rows as WorkflowAsset[]; }
  published(key: string, checksum: string, target: string) { return Boolean(this.sqlite.query("SELECT 1 FROM publications WHERE asset_key=? AND sha256=? AND target=?").get(key, checksum, target)); }
  recordPublished(key: string, checksum: string, target: string) { this.sqlite.query("INSERT OR REPLACE INTO publications VALUES (?,?,?,?)").run(key, checksum, target, new Date().toISOString()); }
  status() {
    return {
      entries: this.sqlite.query("SELECT count(*) AS count FROM entries").get().count,
      assets: this.sqlite.query("SELECT count(*) AS total,count(metadata) AS generated,sum(flags!='[]') AS attention FROM assets").get(),
      batches: this.sqlite.query("SELECT state,count(*) AS count FROM batches GROUP BY state").all(),
      reviews: this.sqlite.query("SELECT COALESCE(r.decision,'unreviewed') AS decision,count(*) AS count FROM assets a LEFT JOIN reviews r ON r.asset_key=a.key AND r.sha256=a.sha256 WHERE a.metadata IS NOT NULL GROUP BY COALESCE(r.decision,'unreviewed')").all(),
      nextBatch: this.nextBatch()?.id ?? null,
      reviewPolicy: this.reviewPolicy(),
    };
  }
}
