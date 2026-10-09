import { writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

// Local, isolated fixtures only: this script also generates real search-log writes.
const args = Object.fromEntries(process.argv.slice(2).map((arg) => arg.replace(/^--/, "").split("=")));
const base = new URL(args.url ?? "http://127.0.0.1:3000");
if (!["127.0.0.1", "localhost", "[::1]"].includes(base.hostname)) throw new Error("Use an isolated loopback app and database");
const users = Number(args.users ?? 1000);
const periodMs = Number(args.period ?? 5) * 1000;
const warmupSeconds = Number(args.warmup ?? 120);
const holdSeconds = Number(args.hold ?? 600);
const rampSeconds = Number(args.ramp ?? 15);
if (![users, periodMs, warmupSeconds, holdSeconds, rampSeconds].every(Number.isFinite) || users < 1 || periodMs < 100 || holdSeconds < 1 || rampSeconds < 1 || warmupSeconds < 0) throw new Error("Invalid load parameters");
const output = args.out ?? "/tmp/turkish-query-load.json";
const percentile = (values, p) => values.length ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1] : null;
const totals = { starts: 0, completed: 0, dropped: 0, errors: {}, byPath: {}, expectedLogs: 0, maxInFlight: 0 };
let inFlight = 0;

async function query(path, input, user) {
  const url = new URL(`/api/trpc/${path}`, base);
  if (input !== undefined) url.searchParams.set("input", JSON.stringify({ json: input }));
  const response = await fetch(url, {
    headers: { "user-agent": "DictionaryLocalPerformance", "x-forwarded-for": `2001:db8::${user.toString(16)}` },
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(`HTTP ${response.status} ${body.error?.json?.data?.code ?? ""}`);
  return body.result.data.json;
}
const allNames = await query("word.getAllWordNames", undefined, 65535);
if (!Array.isArray(allNames) || allNames.length < 1000) throw new Error("Seeded dictionary required");
const fixture = allNames.filter((name) => typeof name === "string" && !/[%_\\]/.test(name));
const popular = ["kitap", "gelmek", "su", "ağaç", "göz", "ev", "insan", "güzel"];
const stages = [];
let aborted = false;

async function stage(count, seconds, label) {
  const metrics = { label, users: count, seconds, starts: 0, completed: 0, dropped: 0, errors: 0, latencies: [], paths: {} };
  const start = performance.now();
  const end = start + seconds * 1000;
  const virtualUsers = Array.from({ length: count }, (_, index) => ({ id: index + 1, next: start + index * periodMs / count, busy: false, iteration: 0 }));
  const pending = new Set();
  let nextReport = start + 10_000;
  async function action(vu) {
    const slot = (vu.id + vu.iteration++) % 20;
    let path, input, expected;
    if (slot < 16) {
      path = "word.getWord";
      expected = slot % 2 ? popular[(vu.id + vu.iteration) % popular.length] : fixture[((vu.id * 7919 + vu.iteration * 31) >>> 0) % fixture.length];
      input = { name: expected, skipLogging: false };
    } else if (slot < 18) {
      path = "word.getWords";
      input = { take: 25, skip: vu.id % 4 === 0 ? 50000 : (vu.id % 100) * 25 };
    } else if (slot === 18) {
      path = "search.searchVerbRoots";
      input = { query: ["gel", "git", "bak"][vu.id % 3], limit: 8 };
    } else {
      path = "search.searchByMeaning";
      input = { query: ["insan", "kitap", "güzel"][vu.id % 3] };
    }
    const requestStart = performance.now();
    try {
      const data = await query(path, input, vu.id);
      if (!Array.isArray(data)) throw new Error("Invalid result shape");
      if (expected && data[0]?.word_data?.word_name !== expected) throw new Error("Wrong word identity");
      if (path === "search.searchByMeaning" && data.length === 0) throw new Error("Meaning search unexpectedly empty");
      if (expected) totals.expectedLogs++;
    } catch (error) {
      metrics.errors++;
      const key = `${path}: ${error.message}`;
      totals.errors[key] = (totals.errors[key] ?? 0) + 1;
    } finally {
      const elapsed = performance.now() - requestStart;
      metrics.latencies.push(elapsed);
      (metrics.paths[path] ??= []).push(elapsed);
      (totals.byPath[path] ??= []).push(elapsed);
      totals.completed++; metrics.completed++;
      inFlight--; vu.busy = false;
    }
  }
  while (performance.now() < end) {
    const now = performance.now();
    for (const vu of virtualUsers) {
      if (vu.next > now) continue;
      const due = Math.floor((now - vu.next) / periodMs) + 1;
      vu.next += due * periodMs;
      const missed = due - 1 + Number(vu.busy);
      metrics.dropped += missed; totals.dropped += missed;
      if (vu.busy) continue;
      vu.busy = true;
      metrics.starts++; totals.starts++; inFlight++;
      totals.maxInFlight = Math.max(totals.maxInFlight, inFlight);
      const request = action(vu);
      pending.add(request);
      void request.finally(() => pending.delete(request));
    }
    if (now >= nextReport) {
      console.log(JSON.stringify({ stage: label, elapsedSeconds: Math.round((now - start) / 1000), completed: metrics.completed, errors: metrics.errors, dropped: metrics.dropped, p95Ms: percentile(metrics.latencies, .95), inFlight }));
      nextReport = now + 10_000;
    }
    await delay(20);
  }
  await Promise.all(pending);
  const summarize = (values) => ({ samples: values.length, p50Ms: percentile(values, .5), p95Ms: percentile(values, .95), p99Ms: percentile(values, .99), maxMs: values.length ? values.reduce((max, value) => Math.max(max, value), 0) : null });
  const result = { ...metrics, latencies: summarize(metrics.latencies), paths: Object.fromEntries(Object.entries(metrics.paths).map(([path, values]) => [path, summarize(values)])), achievedActionsPerSecond: metrics.completed / seconds, errorRate: metrics.errors / Math.max(1, metrics.completed) };
  stages.push(result);
  console.log(JSON.stringify(result));
  if (result.errorRate > .01 || metrics.dropped > 0 || result.latencies.p95Ms > 2000) aborted = true;
}
for (const count of [1, 10, 25, 100, 250, 500, users].filter((n, i, list) => n <= users && list.indexOf(n) === i).sort((a, b) => a - b)) {
  await stage(count, rampSeconds, `ramp-${count}`);
  if (aborted) break;
}
if (!aborted && warmupSeconds) await stage(users, warmupSeconds, "warmup");
if (!aborted) await stage(users, holdSeconds, "steady");
const byPath = Object.fromEntries(Object.entries(totals.byPath).map(([path, values]) => [path, { samples: values.length, p50Ms: percentile(values, .5), p95Ms: percentile(values, .95), p99Ms: percentile(values, .99) }]));
const report = { timestamp: new Date().toISOString(), base: base.origin, users, periodMs, warmupSeconds, holdSeconds, mix: "80% word detail, 10% paginated lists, 5% verb roots, 5% meaning search; half of word traffic is long tail", profile: "loopback production build; real limiter via local REST adapter; anonymous unique fixture IP per user", aborted, totals: { ...totals, byPath }, stages };
writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ output, aborted, completed: totals.completed, errors: totals.errors, expectedLogs: totals.expectedLogs }));
if (aborted) process.exitCode = 1;
