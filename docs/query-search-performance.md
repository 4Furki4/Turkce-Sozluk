# Query and search performance

Implementation and local verification, 9 October 2026. This is development evidence; it does not establish Raspberry Pi or production capacity. The original baseline remains in the BMad spec sources and the initial `/tmp/turkish-query-*.json` reports.

## Delivered changes

- Full word lookup materializes name candidates before definition-quality checks and child enrichment. Indexed meaning, example and root access avoids scanning the full dictionary. Word selection, casing, variants, pointer definitions and nested JSON are preserved.
- Metadata and page rendering share a request read and session context. Normal browser metadata streaming is restored. Search logs and eligible signed-in history run through Next `after`; metadata and cache fills do not log searches. SQL statements have a 2-second deadline and lock waits have a 1-second deadline. Failed writes are contained and reported without exposing search terms or user IDs; callbacks are best effort, with no automatic retries or crash-durable delivery guarantee.
- Public word results coalesce concurrent fills, expire after 45 seconds, and have a 1,024-entry limit. Word clients reuse them for at most 15 seconds. Public search/filter/version/name metadata uses a separate 256-entry, 30-second cache with the normal 30-second client window. Successful dictionary-related mutations clear both caches; external writes and other processes are covered by expiry. Exact sanitized names identify word entries, and transaction/database handles bypass shared cache data. Private reads, session checks and rate limiting remain outside these caches.
- Word lists select the requested page before indexed first-child enrichment. Numbered pagination and filters remain intact; ID ordering stabilizes previously unspecified ties. Relation ordering matches the index comparators in both directions; relation-name filtering finds indexed name candidates on either side before enrichment, retaining literal wildcard escaping and cursor semantics.
- Verb-root search narrows ordinary contains candidates; wildcard and backslash queries retain the original SQL path. Game queries sample the same word/meaning rows before fetching display fields, retaining existing join-weighted randomness and subsequent deduplication. Dashboard search counts use one aggregate instead of five repeated reads (7 SQL statements overall, previously 11).
- Autocomplete bulk delivery encodes and compresses each cached list once. `/api/autocomplete-words` delegates its read through the existing tRPC caller and middleware; the original tRPC endpoint remains available. IndexedDB queues batches of 500 writes in the same atomic data/version transaction, retaining Turkish deduplication and rollback on failure. The client retains version checking and retry/error behavior. Online cached dictionary-read HTTP responses bypass service-worker caching; offline IndexedDB snapshots remain separate.
- Local suggestions use an 80 ms typing pause, with obsolete results ignored and hidden. Meaning search keeps its 300 ms debounce. Meilisearch uses optional validated host/key configuration and a 2-second HTTP abort deadline, retaining the existing empty-result fallback on failure.
- Generated migrations `0049` and `0050` add six final indexes. Both were inspected and applied only to the verified local migration ledger. The second migration corrects the new date index's null ordering to preserve existing newest-first behavior.

## Resolver measurements

PostgreSQL 17.9 on the local workstation, 99,438 words and 120,999 meanings. Original numbers are five-repeat medians; after numbers use 100 samples. These exclude authentication, rate limiting, HTTP, rendering and logging. Shared application caches are bypassed by using a read-only transaction handle. Differences in sampling and warmed indexes mean these are descriptive comparisons, not production percentiles.

| Read | Original median ms | After p50 ms | After p95 ms |
| --- | ---: | ---: | ---: |
| Word: kitap | 139.13 | 1.56 | 2.55 |
| Word: gelmek | 132.86 | 2.23 | 3.89 |
| Word: su | 133.58 | 2.06 | 2.53 |
| First word page | 91.59 | 0.69 | 0.90 |
| Offset 50,000 | 144.25 | 27.96 | 30.11 |
| Searched word page | 39.12 | 0.82 | 1.70 |
| Newest word page | 85.68 | 0.63 | 0.89 |
| Relation ranking, descending | 170.12 | 3.85 | 5.78 |
| Relation ranking, ascending | 163.70 | 3.80 | 4.88 |
| Relation-name search | 70.95 | 3.95 | 5.25 |
| Verb roots | 44.05 | 17.43 | 19.83 |
| Dashboard | 9.06 | 4.86 | 6.27 |
| Flashcards | 41.93 | 25.45 | 28.88 |
| Matching game | 31.13 | 25.19 | 28.55 |

Complete word outputs for kitap, gelmek, su and a missing word matched the original SQL. First/deep/searched/newest list outputs matched. Root outputs matched for ordinary, Turkish, wildcard and backslash inputs. Relation-filtered descending membership/order matched the captured original query; PostgreSQL fixtures cover both sort directions, filters, ties, cursor pages and literal wildcard queries. Game tests verify sampled meaning/word identity; random draws are not expected to be identical.

Broad uncached SQL autocomplete remains about 38 ms, all-name materialization about 46 ms, and all-time popularity about 18 ms on this fixture. Existing main-box autocomplete uses IndexedDB. Sparse recent analytics do not represent a large production log history. The six indexes occupy approximately 23.74 MiB on the local data. Word/meaning writes pay their maintenance cost; search-log writes do not touch those new indexes. Production index build locks and write overhead require development/Pi validation before rollout.

## Runtime profile

Tests used an unthrottled macOS arm64 desktop browser; a precise host CPU/RAM inventory was unavailable through the execution sandbox. The production build runs on loopback with an isolated cloned database and local Meilisearch containing 120,999 meanings. A loopback REST adapter executes the real Upstash limiter's Lua in disposable Valkey and adds 50 ms response delay. No bot bypass is used; anonymous virtual users have distinct fixture IPs. A 61-request limiter test allowed 60 and denied one. This adapter models a declared dependency delay, not actual Upstash, Cloudflare or Pi performance.

The mixed workload has 80% word detail, 10% word lists (including deep offsets), 5% verb roots and 5% meaning search. Half of word traffic uses long-tail names; the other half uses eight popular words. Each user starts one action every five seconds. The ramp is 1/10/25/100/250/500/1,000 users, followed by a 2-minute warmup and 10-minute steady hold. Reports count dropped starts and denied/failed responses separately; neither is successful capacity.

Thirty real browser form submissions during the 1,000-user run showed the requested heading and first definition with p50 83.2 ms and p95 96.5 ms, on a six-word warm corpus without browser throttling. Back navigation preserved the correct word; English navigation preserved content and eventually streamed the expected `noindex, follow` metadata. A separate empty-browser first visit painted the word and first definition in 338 ms (one sample), before background autocomplete sync started. These measure local rendering and transport, not a mobile network or production browser SLO.

Bulk autocomplete tests included gzip decoding: 20 simultaneous cold downloads had p95 501 ms; 1,000 arrivals paced at 100/sec had p95 59 ms and zero failures. Each delivered 99,438 names. The original 20-request tRPC serialization experiment took about 1,060 ms per response. Bulk download remains independent of word rendering. IndexedDB commit time is recorded separately from transfer.

Stalled local Meilisearch returned the existing empty fallback in about 2,014 ms, with sanitized timeout telemetry. Deferred search-log accounting, final steady-state results, final browser autocomplete timing and validation totals are attached in the evidence files and completion notes below.

## Completion evidence

- **CAP-1 / CAP-4:** Complete-output comparisons and PostgreSQL regression fixtures passed. Resolver plans, index sizes and measurements are in `resolver-after.json`; cursor, filter, child-order, casing and variant tests are included in the test suite.
- **CAP-2:** Thirty browser submissions showed the correct heading and first definition at p50 83.2 ms / p95 96.5 ms during load. Back and English routes preserved content. Keyboard ArrowDown/ArrowDown/Enter selected the displayed second suggestion and navigated to its complete word record.
- **CAP-3:** Ten local-prefix typing probes improved from approximately 310 ms to p50 92.6 ms / p95 97.7 ms during the final verification run, with identical suggestion lists. A fresh-browser sample reached autocomplete-ready at 2,866 ms after batched writes, versus 7,128 ms with sequential writes; these are individual observations with differing asset/cache warmth, not cold-start percentiles. The latter sample painted the word/definition at 150 ms, independently of sync. Meilisearch healthy results and bounded failure were exercised. Worst-case pattern/accent scans remain a gap.
- **CAP-5 / CAP-6:** Secondary query evidence and the 84-read inventory are attached. Cache tests cover concurrent fill coalescing, failure retry, size limits, invalidation races, expiry and word identity. Private data is not cached. Other-process invalidation relies on the stated expiry; installed worker upgrades still require device verification.
- **CAP-7:** Across the main run, all 119,739 successful load-test word requests produced their expected events. Another 34 browser events account exactly for the persisted delta of 119,773; no deferred-write failures, deadlocks, temporary-file growth or residual database work were observed at the final snapshot. With analytics inserts blocked by a local table lock, a warm word response completed in 57 ms with zero new logs at response time; exactly one log persisted after releasing the lock. Real application middleware allowed 60 requests and returned HTTP 429 for the 61st fixture-IP request. Connected-socket/pool-wait deadlines and crash durability remain unproven.
- **CAP-8:** The 1,000-user, 600-second steady hold completed 119,999 actions at 200/sec, with zero failures and dropped starts: p50 57.1 ms, p95 76.1 ms, p99 89.1 ms. Word API p95 was 60.1 ms. The entire ramp/warmup/hold completed 149,654 actions, with maximum 61 in flight. After the final client/metadata-cache changes, a further 60-second 1,000-user check and a short browser-verification run also passed. Those shorter checks are recorded separately from the full hold.

Validation passed `bun run build` and 61 Jest suites / 327 tests, including real PostgreSQL fixtures and IndexedDB batch rollback. Diff whitespace checks passed. Production/Pi capacity, authenticated large-history load, individual auth-stage attribution, actual Upstash outage paths and production index-write/build costs remain outside this evidence.

## Reproduce safely

Use a separate local database for HTTP testing because normal word requests write analytics. Supply runtime overrides through the launching process; do not edit secrets or point these scripts at production.

```sh
# Pure, uncached read benchmark and inventory; requires a migrated loopback DB.
bun --conditions=react-server scripts/performance/queries.ts

# Start the disposable local limiter REST adapter against local Valkey first.
bun scripts/performance/upstash-bridge.mjs

# Point a built loopback app at an isolated DB, the adapter and local Meilisearch.
bun scripts/performance/load.mjs --users=1000 --warmup=120 --hold=600 --ramp=15
bun scripts/performance/autocomplete.mjs

# Real database fixtures are opt-in and roll back or remove their own data.
# Set QUERY_TEST_DATABASE_URL and JEV_TEST_DATABASE_URL to an isolated local DB.
bun run test -- --runInBand
bun run build
```

Artifacts are in `docs/query-performance-evidence/`. The read inventory has 84 procedures; the after benchmark covers 12 distinct procedures across 21 cases, with additional HTTP meaning-search and original baseline coverage. Inventory-only paths remain unmeasured; they must not be called optimized merely because the common paths are faster.

## Rate-limit UX follow-up

Fast browsing was amplified by duplicate list/count reads, full server navigations for filters already loaded by client queries, and background prefetch of visible word links (including their search-layout queries). Word lists now fetch each SSR query once, hydrate that result, update filter URLs through Next's supported History API, and load word details on selection. Five rapid alphabet changes produced five API batches, no word-detail prefetches, and no duplicate word-list RSC requests in the built browser.

The short-burst allowance is now 120 procedure calls per 10 seconds per user/visitor, up from 60. Anonymous visitors use Cloudflare's connecting IP or the first forwarded IP. Genuine exhaustion remains a 429; a local real-SDK/Lua check allowed 120 consecutive reads and rejected the 121st. The existing Upstash backend and failure policy remain in place.

Browser query/mutation throttling shares one existing Sonner toast. Server-rendered word-list throttling is explicit state, so the list shell survives rather than entering the page error screen. Errors carry the limiter's millisecond retry deadline; the localized toast counts down to it, disables retry while waiting, and stays visible until six seconds after the deadline. Query retries do not automatically repeat a 429, and failed mutations are never automatically replayed. Other server errors still propagate normally.

Validation: production build and 340 Jest tests passed (14 opt-in database fixture tests skipped). Built desktop English and mobile Turkish checks exercised actual 429 responses with the isolated loopback limiter adapter, single-toast behavior, filter history, and successful recovery. These are local behavior checks, not new Pi capacity measurements or a production rollout.

## Remaining validation and priorities

- Pi database/resolver plans, realistic network/mobile browser profiles, authenticated mixed load and populated private/admin histories remain unproven. Production has not been changed.
- Deep numbered pagination still scans the skipped index entries. Broad two-letter SQL autocomplete, all-time popularity on a large log history, and global random game sampling remain measurable costs.
- Leading-underscore scans and combinatorial accent expansions retain their existing membership logic. Rapid input no longer installs obsolete results, but those underlying scans still need dedicated worst-case execution/cancellation work.
- `after` tracks callbacks through the framework lifecycle. SQL execution/lock deadlines do not bound a stalled connected socket or time waiting for the shared connection pool. There is no durable queue. Treat those failure/resource bounds as an explicit gap before promising durable or outage-proof analytics.
- Normal worker rules are tested from source and offline storage regressions pass; installed service-worker upgrade behavior and offline network-failure journeys need a separate device pass.
- The owned synthetic load-test database, local preview and disposable limiter/search containers were removed after verification. The original local database and its generated migrations remain.
- No Pi migrations, deployment, commit, push or pull request was performed. Rollout follows `docs/raspberry-pi-database-migrations.md` after development hardware validation and the required backup/ledger checks.
