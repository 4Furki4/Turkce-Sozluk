import { writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const base = new URL(process.env.PERF_APP_URL ?? "http://127.0.0.1:3000");
if (!["127.0.0.1", "localhost"].includes(base.hostname)) throw new Error("Isolated loopback app required");
const reports = [];
for (const [count, spacing] of [[20, 0], [1000, 10]]) {
  const started = performance.now();
  const pending = [];
  const times = [];
  let errors = 0;
  let names = 0;
  let decodedBytes = 0;
  for (let index = 0; index < count; index++) {
    const due = started + index * spacing;
    if (due > performance.now()) await delay(due - performance.now());
    pending.push((async () => {
      const begin = performance.now();
      try {
        const response = await fetch(new URL("/api/autocomplete-words", base), {
          headers: { "accept-encoding": "gzip", "user-agent": "DictionaryLocalPerformance", "x-forwarded-for": `2001:db8:1::${index.toString(16)}` },
          signal: AbortSignal.timeout(15_000),
        });
        const text = await response.text();
        if (!response.ok || response.headers.get("content-encoding") !== "gzip") throw new Error("Bulk download failed");
        decodedBytes = text.length;
        if (index === 0 || index === count - 1) {
          const data = JSON.parse(text);
          if (!Array.isArray(data) || !data.includes("kitap") || !data.includes("göz")) throw new Error("Invalid word list");
          names = data.length;
        }
      } catch { errors++; }
      finally { times.push(performance.now() - begin); }
    })());
  }
  await Promise.all(pending);
  times.sort((a, b) => a - b);
  const report = { count, arrivalSpacingMs: spacing, elapsedMs: performance.now() - started, p50Ms: times[Math.ceil(count * .5) - 1], p95Ms: times[Math.ceil(count * .95) - 1], p99Ms: times[Math.ceil(count * .99) - 1], errors, names, decodedCharacters: decodedBytes };
  reports.push(report);
  console.log(JSON.stringify(report));
}
writeFileSync(process.env.PERF_AUTOCOMPLETE_OUTPUT ?? "/tmp/turkish-autocomplete-load.json", JSON.stringify({ profile: "20 simultaneous downloads, then 1000 arrivals at 100/sec; loopback compression/decompression included; no IndexedDB commit", reports }, null, 2));
