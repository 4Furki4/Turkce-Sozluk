# Saved Turkish pronunciation audio

Word pages only read saved media. Python, EMA and the Mac cache are batch tools;
they are never needed by the deployed Next.js server. Dictionary lookup and its
existing per-word cache remain unchanged.

## Storage and migration

`pronunciation_assets` stores exact spoken text, EMA package version, Hugging Face
commit revision, CPU/seed/speed/sample-rate/pipeline settings, checksum and signal
metrics. `word_pronunciation_audio` associates a word ID and its headword snapshot
with an asset. Identical text/settings share a SHA-256 asset key. Neither case nor
diacritics are folded: `I`, `İ`, `ı`, `i`, `kar` and `kâr` have distinct identities.
Only `words.name` is passed to EMA; definitions, examples, phonetic annotations,
prefix/suffix metadata and introductions are excluded.

The additive migration is `drizzle/migrations/0048_nostalgic_jackal.sql`, generated
with `bun run db:generate`. Apply it with the normal migration workflow after
checking the target ledger. For Pi environments, follow
[the database runbook](raspberry-pi-database-migrations.md), including the baseline
gate, direct SSH tunnel and production backup. Do not use `db:push` on the Pi.

The batch reuses the app’s existing S3/R2 convention:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Dictionary database, and catalog writes when publishing |
| `S3_API_URL` | R2 S3 API endpoint |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Batch-only object credentials |
| `R2_BUCKET_NAME` | Existing media bucket |
| `NEXT_PUBLIC_R2_CUSTOM_URL` | Public HTTPS base URL serving that bucket |

Generated WAVs are uploaded as
`pronunciations/ema/<identity-hash>/<audio-checksum>.wav` with `audio/wav` and
immutable caching. ASCII hashes avoid unsafe filenames on any filesystem.
The publisher accepts an R2 account API endpoint with or without the bucket name
at the end. It removes that bucket path before the SDK supplies `Bucket`, so the
stored key and public URL do not gain an extra bucket prefix. Other API endpoint
paths are rejected before uploading.
Enable public reads on this prefix through the existing R2 custom domain. Do not
put signed, expiring URLs in the database. Verify GET/HEAD, content type and media
playback from the deployed origin after publishing. Keep bucket credentials off
the client; the browser receives only the saved audio URL. No new runtime env
variables or Mac paths are required by Next.js.

## Automatic batches and persistent review

Use the workflow command for the full dictionary. It freezes an ordered snapshot
of IDs and **exact** headwords in a local SQLite catalog, deduplicates identical
text/settings and partitions distinct recordings into batches (default 500,
maximum 1,000). The snapshot pins the cached model revision, package version and
generation settings. New or renamed database entries need a new snapshot; the
publisher also checks each current headword before associating audio.

```bash
export EMA_SETUP_DIR='/Users/muhammedfurkancengiz/Documents/Codex/2026-10-07/https-huggingface-co-canberkkkkkk-ema-lightning'
# Supply the intended DATABASE_URL securely in this shell.
bun run pronunciations:workflow init --batch-size 500
bun run pronunciations:workflow run --max-batches 1
bun run pronunciations:workflow serve --port 8768
# Open http://localhost:8768/ (English: /?locale=en)
```

`init` refuses to overwrite an existing workflow. `run` defaults to one pilot
batch. After reviewing that pilot, continue without managing entry IDs or cursors:

```bash
bun run pronunciations:workflow status
bun run pronunciations:workflow run --max-batches 5
# Explicitly generate every remaining batch:
bun run pronunciations:workflow run --all
```

The runner advances automatically only after every recording in a batch passes
WAV/checksum validation. It stops with a nonzero exit on failure; rerunning resumes
that batch and skips valid completed recordings. Each batch process loads one
EMA instance and reuses it for all its headwords. Manifests are bounded to one
batch, with per-recording atomic checkpoints. A process restart or Mac restart
does not lose the plan or decisions. Generation and review can run concurrently;
the review queue sees newly completed batches when refreshed. This is a foreground
CLI: keep the machine awake while it runs, or resume after interruption.

The review queue supports **approve**, **reject**, **defer** and **reset**, plus
notes, batch/status filters, pagination and an extra-attention filter. Circumflexes,
very short words, unusual durations and a frontend losing circumflexes are flagged.
Playback starts only when clicked, and starting another recording stops the first.
Approving an identical headword covers every associated entry ID shown on the
card. Decisions and their history are stored immediately in SQLite, tied to the
audio checksum; regenerated audio with a different checksum requires a new manual
decision or a fresh check under the enabled owner acceptance policy.
Automatic validity checks never approve pronunciation quality.

### Owner acceptance policy for unflagged recordings

After the owner accepted the unflagged pilot recordings on 2026-10-08, this
workflow was switched to automatic approval for recordings **without any
extra-attention flags**. This is the owner's acceptance policy, not a model
quality score. To enable it for a workflow:

```bash
bun run pronunciations:workflow policy --auto-approve-unflagged
bun run pronunciations:workflow run --all
```

The policy immediately approves eligible existing recordings and applies to
each subsequent completed batch. Every candidate is decoded and checksum-checked
again; actual duration is used when checking audio-length flags. Circumflexes,
single-character/very-short headwords and unusually short/long audio remain pending.
The review queue's default unreviewed filter consequently shows these exceptions.
Manual approvals retain their notes. Rejected/deferred recordings are never
overridden, including after their checksum changes; they need manual resolution.
Each automatic approval has its own checksum-bound decision and audit event with
the owner-policy reason and date. An unchanged recording is not approved twice.
New recordings with different bytes are checked afresh before any policy approval.

Nine workflow integration tests passed after this addition, covering persistence,
future batches, circumflex/short-word exclusions, preservation of manual decisions,
WAV and checksum validation, actual audio-length flags, and approval history.
The full app build and 304 Jest tests also passed. The running queue was checked
on desktop and at 390px with the active policy shown and only flagged recordings
in the unreviewed list.

The policy is saved in `workflow.sqlite`, survives restarts and is displayed in
the review queue. It applies only to this workflow directory. To return to manual
approval, stop a running generation process first and run:

```bash
bun run pronunciations:workflow policy --manual
```

Existing approvals remain saved; use `review --decision rejected` or the review
page to withdraw an individual approval. Automatic approval does not upload audio
or publish catalog associations; `publish` remains an explicit separate action.

For a long run on macOS, the active full-dictionary command uses `caffeinate -i`
to prevent idle sleep while the process runs. Its output is saved to
`.pronunciation-cache/workflow/full-generation.log`. Resume after interruption
with `run --all`; the saved policy and cursor are reused.

CLI decisions use the same persistence and checksum checks:

```bash
bun run pronunciations:workflow review --word-id 135062 --decision rejected --note 'Sounds like kar; use a reviewed recording'
```

This requires that the word's recording has been generated in this workflow.
Changing a note means saving a decision again. The review server binds loopback
only; it is a local workbench, not a public admin endpoint. Its English/Turkish
copy lives in the app's locale message files.

Default durable local layout (ignored by Git):

```text
.pronunciation-cache/workflow/
  workflow.sqlite                 snapshot, progress, decisions, audit history
  audio/<identity-hash>.wav        shared recordings
  batches/00001/jobs.json          frozen jobs for this batch
  batches/00001/manifest.json      per-recording checkpoint and model metadata
  batches/00001/generation.log     worker output
  batches/00001/failures.jsonl     failures, when any
```

Back up the **whole directory**. Stop the runner and review server before copying
it; include any `workflow.sqlite-wal`/`-shm` files present. Restore to a writable
directory and pass `--dir /absolute/path` to every command. SQLite is local batch
state; the deployed app uses PostgreSQL associations and public R2 objects and
does not need this catalog or the Mac. To move generation to another machine,
reuse the pinned package/weights and preserve or deliberately update its local
Python/cache paths; model/settings changes require a new workflow directory.

A `run.lock` stores the runner PID and prevents concurrent generation/publication.
After an ungraceful termination, confirm that process has exited before removing
a stale lock. To recheck a previously completed batch after losing/corrupting WAVs:

```bash
bun run pronunciations:workflow run --retry-batch 3 --max-batches 1
```

This makes that batch eligible again; the earliest unfinished batch still takes
precedence. Valid WAVs are reused and missing/corrupt ones regenerate. Changed
checksums invalidate prior approvals. Rejected/deferred decisions do not block
generation of later batches, but cannot be published.

## Generate individual alternatives or a small sample

Reuse the installed Python environment and cached weights:

```bash
export EMA_SETUP_DIR='/Users/muhammedfurkancengiz/Documents/Codex/2026-10-07/https-huggingface-co-canberkkkkkk-ema-lightning'
# Set DATABASE_URL to the intended development database in this shell.
bun run pronunciations:generate \
  --word merhaba --word çığ --word ışık --word gül \
  --word Iğdır --word İncil --word kâr --word hâl \
  --word su --word o --word gökkuşağı \
  --word 'baş başa' --word 'her şey' --limit 30
```

Default output is the ignored `.pronunciation-cache/` directory. Open
`review.html` locally, or serve that directory on loopback:

```bash
python3 -m http.server 8766 --bind 127.0.0.1 --directory .pronunciation-cache
# Open http://localhost:8766/review.html
```

Each row shows the entry ID, unchanged headword, audio and signal metrics. Listen
for the intended word, stress, vowel length, circumflex distinctions, initial and
final sounds, unwanted extra speech and repetition. Non-silence is not a linguistic
quality verdict. The model is [EMA Lightning](https://github.com/canberk7/ema-lightning).

Useful options:

```bash
bun run pronunciations:generate --help
bun run pronunciations:generate --word-id 164711 --limit 1
bun run pronunciations:generate --limit 100 --after-id 164711
bun run pronunciations:generate --word kâr --speed 0.9 --seed 1 --output /tmp/ema-alternative
```

Use repeatable `--word` or `--word-id`. Word matching is exact, including Turkish
case and circumflexes; duplicate dictionary entries with the same headword are
all selected and share one audio asset. `--limit` counts entries, not assets.
The default limit is 20. Use the persistent workflow above for automatic full
dictionary progression. Preserve the output directory between experiments. Each review
page contains the latest selected batch; `manifest.json` retains all assets.

`--ema-dir` overrides `EMA_SETUP_DIR`; alternatively pass both `--python` and
`--cache`. The default revision is the cached `refs/main` commit. Both checkpoint
files are pinned to it in offline mode before constructing EMA. No model or
Python dependency is downloaded. One EMA instance is reused for the batch and
is not loaded at all when every recording is already complete.

Generation checkpoints each completed recording atomically. Completed WAVs are
decoded and checksum-checked before skipping. Missing/corrupt files regenerate.
Failures are appended to `failures.jsonl`, successful jobs remain checkpointed,
and a partial failure exits nonzero. Rerun the same selection to retry. A
`batch.lock` prevents simultaneous writers; after an interrupted process has
exited, remove its stale lock and rerun. Generation uses mono PCM16 at 48 kHz and
rejects invalid duration or near-silent audio. Python/EMA changes and settings
produce distinct identities; increment the pipeline version for preprocessing
changes. Use a new seed/speed/revision to regenerate a pronunciation, inspect its
new review page, then publish the chosen version.

## Publish approved workflow output

Publishing is explicit, independent of generation, and uploads only saved approvals
for the current checksum. The default workflow publishes at most 500 assets; repeat
it to publish the next approved set. Unreviewed, rejected and deferred recordings
are excluded. Publication history skips completed assets for the same database and
media target. The command validates local WAVs again before touching storage.

```bash
bun run pronunciations:workflow publish --limit 500
# Publish every currently approved recording; rerun the same command to resume.
bun run pronunciations:workflow publish --all --concurrency 8
```

Both the workflow publisher and legacy sample publisher require R2 variables and
a migrated target database. The sample command's `--publish`/`--publish-only` also
requires `--review-workflow DIR` and will only upload assets approved there with a
matching current checksum; it cannot bypass the review gate. An existing object with a
matching SHA metadata and length is reused. Upload finishes before transactional
catalog writes; interrupted uploads can leave harmless unreferenced objects and
reruns complete associations. A concurrent headword rename aborts the association
transaction. Cached recordings can be recovered from the saved public URL after
loss of local output; failures to retrieve them stop the batch with an error.

Publication runs at most four recordings concurrently by default; choose 1–16
with `--concurrency`. Successful recordings are checkpointed individually for
each database/media target. Failures are saved to `publication-failures.jsonl`;
other selected recordings continue, and the command exits unsuccessfully if any
failed. Resolve the failure and rerun to retry only unpublished recordings.

`--env-file` supplies dotenv defaults (default `.env.development.local`). Shell
variables take priority. Bun also loads standard `.env` files before the script;
for another target use `bun --env-file=/absolute/path/to/target.env run
pronunciations:generate --env-file /absolute/path/to/target.env ...` and explicitly
set `DATABASE_URL` in the shell. Never paste credentials into command arguments
or tracked files. Normal pages do not upload or synthesize anything.

## Pi development trial (2026-10-08)

Migrations `0047_spicy_vampiro` and `0048_nostalgic_jackal` were applied through a
verified loopback SSH tunnel to `turkish_dictionary_development`. The existing
ledger was retained, including an older migration outside this checkout's history;
no ledger entries were rewritten. A fresh local custom-format development backup
was saved and its restore table of contents validated before migrating. The Pi
development health endpoint remained healthy afterward.

With owner approval, nine previously approved WAVs were uploaded to the existing
R2 bucket: merhaba, çığ, ışık, gül, Iğdır, İncil, gökkuşağı, baş başa and her şey.
They have ten development entry associations because çığ has two entries.
Every public media GET returned `audio/wav` with the expected SHA-256. The built
local app read those saved HTTPS URLs from the Pi development database. Unpublished
kâr and o returned no generated pronunciation. At the end of this initial trial,
other recordings remained local and production had not been changed.

The test build and server used temporary connection overrides rather than editing
environment secrets. The local helper and evidence are in the ignored
`.pronunciation-cache/pi-development/` directory. While its loopback tunnel on
port 15434 is running, reproduce the test build and server with:

```bash
bun .pronunciation-cache/pi-development/run.ts run build
bun .pronunciation-cache/pi-development/run.ts run start --hostname 127.0.0.1
```

The helper verifies the current database and container address through SSH before
launching. Plain `bun run build` continues to use the existing environment files.
Browser checks confirmed click and keyboard playback, Turkish/English AI labels,
44-pixel controls, and no horizontal overflow at 390 and 320 pixels. These were
browser viewport checks, not physical-phone tests. The production build and ten
Bun workflow integration tests passed, including the bucket-endpoint regression.

## Full dictionary release (2026-10-08)

Generation completed all 196 batches: 97,567 distinct recordings for the frozen
99,438 entries. Every WAV was independently decoded and checked against its saved
SHA-256. The owner policy approved 95,862 recordings; 1,704 await manual review
and one is rejected. These review decisions are preserved during publication.

With owner authorization to prepare both environments, production's empty ledger
was reconciled against migration 0041. The audit checked every table, column,
type, default, constraint, index and enum, recognizing only three harmless legacy
primary-key/sequence names. A fresh 45.8 MB production dump was checksum-verified
on the Pi and Mac, restored into an isolated local PostgreSQL instance, and tested
through migrations 0042–0048. The verified baseline and those pending migrations
were then applied to production. Its 49 ledger entries match the repository
hashes/timestamps; the resulting schema matches the migrated restore. Both Pi
health endpoints passed and all 99,438 production headwords match the frozen IDs
and exact text. The nine test recordings are also linked in production.

Full publication uses the approved recordings only, with 16 concurrent workers
and a separate checkpoint for each database. R2 objects are shared between targets:
the second publication reuses matching objects and adds its own catalog links.
No regeneration is required for deployment. Run the same command with each
verified, tunneled database connection to resume:

```bash
bun run pronunciations:workflow publish --all --concurrency 16
```

Release validation passed the full build, 304 Jest tests (10 existing skips),
11 Bun integration tests (93 assertions), and the Docker lockfile preflight.
The new integration case checks bounded parallel uploads, durable successes,
failure retries, target isolation, and rejection exclusion after restart.
Local backup/audit evidence is in `.pronunciation-cache/pi-production/`;
publication logs and failure records remain in the workflow directory.

## Correct a pronunciation

The headword button labels synthetic audio as “AI-generated · EMA” / “Yapay zekâ
sesi · EMA”. “Suggest a correction” opens the existing pronunciation contribution
flow. A signed-in contributor records/uploads via UploadThing; an admin reviews
and approves the request using the existing protected moderation workflow.
The most recently approved community recording takes priority over generated
audio and is labelled “Reviewed recording”. Unapproved requests cannot replace
the saved audio. Generated audio remains available in the catalog for rollback.
No synthetic user account or automatic request approval is introduced.

Playback starts only on activation, with a 44px button, accessible name and live
status. Loading, missing audio, offline state, playback errors and retry are
localized. Changing words unmounts/stops the previous recording. A shared event
coordinates headword and existing community players so they do not overlap.

## Verification on 2026-10-07

- Reused EMA Lightning 1.0.1 and cached revision
  `7a6ba1ad216bb2f1da9863f80ac8770a6a807632` on CPU; generated 13 recordings for
  15 dictionary entries from the repository’s existing dictionary dump.
- Sample: `merhaba`, `çığ`, `ışık`, `gül`, `Iğdır`, `İncil`, `kâr`, `hâl`, `su`,
  `o`, `gökkuşağı`, `baş başa`, `her şey`. All PCM16 mono 48 kHz, durations
  0.32–0.76s, RMS 0.0278–0.0849. Reruns skipped completed recordings, including
  both duplicate `çığ` and `o` entries.
- `bun run build` passed. The full Jest run passed 55 suites and 301 tests, with
  10 pre-existing skipped tests. New tests cover case/diacritic isolation,
  settings/revision changes, click-only playback, cancellation and errors.
- The new additive SQL applied to a temporary local restored schema with its
  foreign keys. Replaying the repository’s full old migration history on a fresh
  database failed in an existing Better Auth migration (`accounts.id` missing).
  Do not interpret this as successful full-history migration validation.
- Browser playback in the production build reached the playing state at 1440px
  and 390px; the sample review page also played a saved WAV without media errors. Turkish and
  English controls, both layouts, 320px containment, 44px targets, keyboard
  activation, a failed media URL, navigation and the correction modal were
  checked in the running app. There was no horizontal overflow at the tested widths.
- Actual CLI publication against a loopback S3 test server uploaded two objects
  for three entries; a repeat issued HEAD checks without another PUT. Catalog
  association, duplicate reuse, exact headword guards, reviewed-recording priority,
  retrieval after loss of local cache, and per-job failure logging were verified.
- Runtime playback uses generated sample files and a temporary local database;
  no production/Pi database or R2 publication was changed. Real deployment and
  physical mobile-device playback require verification after publishing.

The local review batch is ready for human pronunciation assessment before any
full-dictionary generation.

## Workflow verification on 2026-10-08

- Froze the temporary local dictionary copy: 99,438 entries, 97,567 exact
  distinct recording identities, 196 batches at size 500. No live database
  snapshot, production/Pi write or R2 publication was performed.
- Generated the first 500 headwords with the existing EMA environment/cache in
  45.8 seconds. Independently decoded and checksum-checked every WAV: PCM16 mono
  48 kHz, durations 0.28–4.52 seconds, RMS 0.0126–0.1237, 62,045,680 bytes total.
  The pilot contains words and phrases including Turkish characters and
  circumflexes; 22 recordings are flagged for extra attention. The previous
  representative sample also covers short/single-character headwords and Turkish
  case distinctions. Initially all 500 pilot decisions were unreviewed; the owner's
  subsequent policy approved the 478 unflagged recordings and left 22 pending.
- Rechecked batch 1 using `--retry-batch 1`: all 500 completed recordings were
  reused in 0.5 seconds, and the cursor remained at batch 2. Failures, interrupted
  process state, missing-file regeneration, exact duplicate reuse and active
  runner locks also passed the automated fixture checks.
- Six Bun integration tests passed (47 assertions), including actual SQLite
  restart persistence, HTTP origin/token checks and byte ranges, changed-checksum
  approval invalidation, no storage access for unapproved/altered audio, duplicate
  associations, immutable-object reuse and withdrawn-approval checks. Storage/DB
  publication uses test doubles in these new checks. The original loopback S3
  verification above covers real catalog associations.
- The full Jest run passed 56 suites and 304 tests (10 existing skips).
  `bun run build` and `git diff --check` passed. Focused ESLint could not run:
  the repository's ESLint 8/Next config throws a circular-JSON configuration
  error; an npm fallback retry produced the same error.
- Running review queue checked in Turkish and English at 1440, 390 and 320px:
  no horizontal overflow, matching filter heights, 44px action targets,
  click-only successful playback, stopping the previous player, keyboard refresh,
  extra-attention filtering and rapid status-filter changes. A deferred decision
  and note survived a server restart; that UI test was reset to unreviewed.
  These are browser viewport checks, not physical-phone tests.
- `publish` with zero approvals performed no publication. The sample CLI rejects
  publication without a persistent approval catalog. Human pronunciation quality
  review and real deployed media playback remain necessary before publishing.

The active review queue is `http://localhost:8768/`. Restart it with
`bun run pronunciations:workflow serve` after ending the local server session.
The next generation run starts at batch 2 automatically. Local pilot metrics are
saved alongside the workflow in `pilot-verification.json`.

## Improving words that fail listening review

The first listening review flagged `o` (IDs 170107 and 170111) and `kâr` (135062).
The two `o` entries share one recording, so one reviewed replacement can fix both.
Try a small seed comparison before changing global settings. The local audition
page is `.pronunciation-cache/improvements/index.html` (served at
`http://localhost:8766/improvements/`), with six exact-headword alternatives for
`o`: seeds 1–4 at speed 1.0, and seed 0 at speeds 0.85 and 0.7. The slower settings
affect synthesis duration; they are not a browser playback-rate adjustment.

Inspection of the installed EMA 1.0.1 frontend and cached weights found that
`kâr` becomes `kar`, and `hâl` becomes `hal`, inside EMA. The checkpoint vocabulary
has no `â`, `î` or `û` tokens. Generating `kâr` and `kar` at seed 0/speed 1.0
produced byte-identical WAVs. Keeping separate catalog identities still protects
dictionary data, but cannot force the model to pronounce unsupported distinctions.
See [EMA's frontend](https://github.com/canberk7/ema-lightning/blob/main/src/ema_lightning/frontend.py).

The audition includes two explicitly experimental `kâr` respellings (`kyâr` and
`kyââr`) alongside the originals and a snow-word control. These may introduce a
`y` sound or extra syllable and must not be accepted automatically. The audition
JSON records both the dictionary headword and the actual synthesis/frontend
inputs; these experiments do not change entries, manifests or published assets.
If seed/speed changes or an approximation do not pass native-speaker review, use
the existing reviewed human-recording workflow. Globally slowing the dictionary
or adding circumflex tokens without trained weights cannot restore the missing
phonetic distinction. Flag circumflex-bearing and single-character headwords for
listening review before publishing a large batch.
