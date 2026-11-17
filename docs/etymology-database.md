# Etymology database

Etymology evidence lives beside the existing dictionary data. `roots` remains the
current short display value; neither OCR nor a proposed match changes it. The
new `etymology_*` tables preserve what a source says, including competing or
rejected explanations, before an editor decides what to show to readers.

## Source model

| Table | Purpose |
| --- | --- |
| `etymology_sources` | Identify a specific book edition or other source. `document_sha256` identifies a scan without storing a machine-specific file path. |
| `etymology_abbreviations` | Decode codes within one source. `kind` separates language/dialect codes from publication codes; `language_id` is optional until a mapping has been checked. |
| `etymology_entries` | Retain the book headword, gloss, printed and PDF page references, OCR text, a corrected transcription, and its verification state. An entry can remain unmatched. |
| `etymology_matches` | Track candidate links to `words` and optionally `meanings`, their relationship, confidence, and human review. |
| `etymology_claims` | Record individual statements about an entry, including their stance, forms, raw language labels, canonical language links, scholar attribution, reference, and review state. |

An entry's `source_entry_key` must be stable within its source so re-running an
import can update the same record. It is not the headword: a book can contain
more than one entry with the same spelling. `source_locator` can record a column
or position; both printed and PDF page numbers are retained because scans can
have different offsets.

Claims use `source_form`/`source_language_id` and
`target_form`/`target_language_id` for directional relationships. A historical
or dialect comparison is `comparison`, not automatically an origin. A scholar's
explanation that the book rejects is retained with `stance = rejected`. A
claim's `sense_label` is the book's own label; it is not assumed to equal a
dictionary `meanings.id`.
Keep the exact language code or name in `source_language_label` or
`target_language_label` even when it has not been mapped to a canonical
`languages.id`.

## Hasan Eren pilot

*Source:* Hasan Eren, *Türk Dilinin Etimolojik Sözlüğü*, second edition (1999).
The scanned PDF is image-only. In this scan, printed page 1 is PDF page 31;
the A section occupies PDF pages 31–60. The preface and introduction are PDF
pages 9–29, and the abbreviation lists are PDF pages 503–508.

- `abajur` (printed page 1): a relatively direct French origin claim.
- `abazan bk. habazan` (page 1): a cross-reference entry, not an origin claim.
- `angıt` (page 13): numbered meanings, dialect forms, historical attestations,
  an onomatopoeic explanation, and competing comparisons.
- `araba` (pages 14–15): mutually incompatible and changing explanations
  attributed to scholars. Keep each statement and its stance; do not select a
  single origin language during import.
- `ayva` (page 29): two numbered meanings, forms in other languages, and both
  incoming and outgoing borrowing discussion.

The abbreviation section has separate lists for publications (printed pages
473–475) and languages/dialects (476–478). For example, `Ar` expands to
Arabic and `R` to Rumca; a publication code such as `AO` must not be entered
as a language. These expansions are specific to Eren's book and should be
reviewed before linking to `languages`.

## Import and matching sequence

1. OCR pages while preserving page and column order. Keep the original scan
   reference. Verify Turkish characters and non-Latin source forms against the
   image; the trial OCR distorted Greek forms.
2. Segment entries across columns and pages, then correct the transcription.
3. Extract typed claims and the book's sense labels. Keep citations and
   negative or uncertain statements.
4. Generate candidate dictionary matches using normalized headword, variant,
   gloss, and part of speech. A candidate is not a published link.
5. Optionally use Jev to classify each bounded candidate as same sense, word
   level, related form, or unrelated. Store the model and confidence in
   `proposed_by` and `confidence`; calibrate on manually labeled examples.
6. Require an accepted match, verified transcription, and accepted claim
   before displaying evidence in the dictionary. Changing `roots` or a public origin summary needs
   a separate editorial decision.

Validate `meaning_id` belongs to `word_id` at the application boundary when
writing a match. Never infer a source claim's correctness from match confidence:
matching and scholarly assessment are different decisions.

## Page 31 multi-pass OCR review

The page-31 OCR pilot is separate from the reviewed-entry importer. It starts
with the existing Turkish PaddleOCR JSON and the rendered page image, then
reruns six Greek-script lines with PaddleOCR's `PP-OCRv5` Greek model. The
script validates the PDF, image, and first-pass JSON hashes against
`data/etymology/hasan-eren-page-31-ocr-regions.json` so the crop coordinates
cannot silently be applied to a different scan. It groups all body lines by
left column, then right column. The six Greek outputs remain alternatives
attached to their original lines; no OCR score promotes them to verified
transcriptions.

Run this in the isolated Python environment used for PaddleOCR (with Pillow
installed). The resulting scan, raw OCR passes, crops, combined JSON, and
readable review report stay under the ignored `data/etymology/ocr-local/`
directory:

```bash
source "$HOME/.venvs/paddleocr-eren/bin/activate"
python scripts/ocr/combine-eren-page.py \
  --manifest data/etymology/hasan-eren-page-31-ocr-regions.json \
  --pdf "$HOME/Downloads/Hasan_Eren_Tu_rk_Dilinin_Etimolojik_so_z.pdf" \
  --image "$HOME/Downloads/eren-ocr/page-31.png" \
  --base-json "$HOME/Downloads/eren-ocr/output/page-31_res.json" \
  --output data/etymology/ocr-local/hasan-eren-page-31
```

Open `review.md` beside `page-image.png` to inspect every line. Each
`bodyLines[]` item in `combined.json` retains the Turkish-pass text, box and
score, and any targeted Greek-pass candidates, crop coordinates, and raw
result path. `reviewState` remains `unverified_ocr`. The six selected regions
do not cover every OCR error: Latin transliterations, scholarly citations,
punctuation, and historic Greek diacritics still need checking against the
scan before entry extraction.

### Add a local Qwen reading

With Ollama listening on `127.0.0.1:11434`, run the following from the same
Python environment. Install the vision model once with
`ollama pull qwen3-vl:8b-instruct`.

```bash
python scripts/ocr/add-qwen-suggestions.py \
  --combined data/etymology/ocr-local/hasan-eren-page-31/combined.json \
  --manifest data/etymology/hasan-eren-page-31-ocr-regions.json
```

The command reads only regions marked for review that have a PaddleOCR
alternative. The optional `qwenCrop` in the manifest narrows a region to a
word. The coordinates refer to the original page image. Without a narrower
box, Qwen receives the existing region. The command creates
`combined-qwen.json` and `qwen-review.md` beside the original output. Each
suggestion retains its crop coordinates, image hash, model digest, and raw
response. Greek marks are flagged for comparison with the scan. The cache
reuses a response for the same image, model digest, Ollama version, prompt,
and generation settings.

### Store page 31 as OCR entries

`data/etymology/hasan-eren-page-31-entry-boundaries.json` identifies the 11
headwords and their starting OCR lines. The OCR importer checks that its
boundaries cover all body lines, then stores each entry's combined text in
`etymology_entries.ocr_text`. Targeted Greek suggestions are visibly marked as
unverified within that text. New rows have `transcription_status = ocr`, no
corrected text, claims, or dictionary matches. Existing verified entries
(`abajur` and `abazan`) receive OCR text without changing their corrected
transcription, review status, or claims.

```bash
bash scripts/seed-etymology-ocr-local.sh \
  --combined data/etymology/ocr-local/hasan-eren-page-31/combined.json \
  --boundaries data/etymology/hasan-eren-page-31-entry-boundaries.json
# Add --write to apply after inspecting the dry-run summary.
```

Use `combined-qwen.json` as the `--combined` input to include the Qwen
suggestions. The preview displays them within the entry's unverified OCR text.

The helper targets only the dedicated Mac-local etymology database. It is
safe to rerun for the same OCR output. Open `/tr/etymology-preview` to inspect
the imported rows. This pilot also exposes a schema limit: `ocr_text` can show
multiple pass suggestions, but it cannot query individual model passes,
coordinates, or scores. Those remain in the ignored local `combined.json` and
raw OCR files until a dedicated OCR observation table is warranted.

### Review the first ten printed pages

Run the batch from the PaddleOCR Python environment:

```bash
python scripts/ocr/prepare-eren-batch.py \
  --pdf "$HOME/Downloads/Hasan_Eren_Tu_rk_Dilinin_Etimolojik_so_z.pdf" \
  --output data/etymology/ocr-local/hasan-eren-pages-01-10 \
  --pilot data/etymology/ocr-local/hasan-eren-page-31 --qwen
```

Printed pages 1–10 are PDF pages 31–40. The batch uses Poppler and local
PaddleOCR. For flagged lines in the new pages, the local Qwen model reads the
line crop. The page 31 pilot already has narrower crops and can be reused via
`--pilot`. Use `--first` and `--last` with PDF page numbers for a smaller
batch. The flag filter includes detected Greek text, suspect glyphs, and
PaddleOCR confidence below 92%. Check unflagged lines too, since a high
confidence score can accompany a wrong reading.

The local preview launcher reads this batch directory by default. Open
`/tr/etymology-preview?scan=1` and choose a page. The preview groups the 816
OCR lines into 52 entries using the reviewed page 31 boundaries and
`data/etymology/hasan-eren-pages-02-10-entry-boundaries.json`. Read the
complete available entry across columns or use the links to see its other
page scans. Open OCR details to see individual lines and Qwen suggestions.
The last entry, `altmış`, continues beyond the ten-page batch. The grouped
preview reads the generated page files and their boundaries on demand.

### Expand the Hasan Eren reader

Printed pages 11–472 correspond to PDF pages 41–502. Keep their generated
files in `hasan-eren-book` beside the ten-page pilot. The OCR command skips
pages with the requested output already present. With `--greek`, the
targeted Greek readings are stored alongside the Turkish OCR lines.

```bash
ocr_root=data/etymology/ocr-local
pdf="$HOME/Downloads/Hasan_Eren_Tu_rk_Dilinin_Etimolojik_so_z.pdf"

python scripts/ocr/prepare-eren-batch.py --pdf "$pdf" \
  --output "$ocr_root/hasan-eren-book" --first 41 --last 502 --greek

python scripts/ocr/catalog-eren-book.py --pilot "$ocr_root/hasan-eren-pages-01-10" \
  --book "$ocr_root/hasan-eren-book" --watch

python scripts/ocr/audit-eren-book.py --pdf "$pdf" \
  --pilot "$ocr_root/hasan-eren-pages-01-10" --book "$ocr_root/hasan-eren-book"
```

The catalog command uses the local `qwen3-vl:4b-instruct` Ollama model for
draft summaries. It can run while OCR is in progress and saves completed
entries with their source line IDs. Reviewed summaries and layout fixes are
in `data/etymology/hasan-eren-book-revisions.json`. Open `/tr/etimoloji` to
read the local catalog and follow each entry back to the scanned page. The
audit checks the page files, the Greek readings, and whether every OCR line
in the dictionary section belongs to a source entry.

## Mac-local pilot importer

The first reviewed fixture is `data/etymology/hasan-eren-pilot.json`.
It contains two entries from printed page 1 (`abajur` and `abazan`) and the
source-specific `Fr` abbreviation. The importer verifies the PDF's SHA-256
against the fixture, then uses `(source_id, source_entry_key)` to update an
existing entry on repeat runs. It replaces only candidate claims; it refuses
to replace claims that have been reviewed. It does not create dictionary
words, matches, or roots.

```bash
bun run seed:etymology --file data/etymology/hasan-eren-pilot.json \
  --pdf /absolute/path/to/Hasan_Eren_Tu_rk_Dilinin_Etimolojik_so_z.pdf
```

This command is a dry run. To write, supply `DATABASE_URL` in the shell and add
`--write`. The pilot importer accepts only a loopback PostgreSQL URL whose
database name is `turkish_dictionary_etymology`; it never falls back to
`.env.local`. Keep credentials out of command history and source control.

The dedicated Mac-local pilot container is named
`turkish-dictionary-etymology-local`, bound to `127.0.0.1:15435`, with database
`turkish_dictionary_etymology`. Its schema was created using
`bun run db:push:local` on an empty database because the repository's old
migration history fails when replayed from scratch. The separate Mac Docker
database named `turkish-dictionary-db-1` was left unchanged: it has dictionary
tables but an empty Drizzle migration ledger, so applying migrations there
would be unsafe without a baseline.

The next pilot entries (`angıt`, `araba`, `ayva`) span more complex commentary.
They need corrected full transcriptions before they can be imported as
`verified`; the first two entries establish the import and rerun path.

### Adding another reviewed batch

Create a new JSON file using `data/etymology/hasan-eren-pilot.json` as the
shape. Keep the same source metadata and PDF SHA-256 for another batch from
this edition, but include only the new entries in that file. For another
book, use its own source metadata and PDF hash. Each entry needs a stable
`sourceEntryKey`, headword, printed and PDF page, column/position locator,
checked transcription, and one or more typed claims. Represent a disputed
explanation as its own claim with the appropriate stance rather than merging
it into the preferred explanation. Preserve the book's abbreviation labels;
do not guess a `languages.id`.

Run a dry run before writing to the dedicated Mac-local database:

```bash
bun run seed:etymology:local --file data/etymology/next-batch.json \
  --pdf /absolute/path/to/source.pdf
bun run seed:etymology:local --file data/etymology/next-batch.json \
  --pdf /absolute/path/to/source.pdf --write
```

The helper reads the pilot container's password without printing or storing
it in the repository. Refresh `/tr/etymology-preview` to see the imported
rows. The importer updates entries by source key on repeat runs, and stops if
an existing entry contains a reviewed claim that it would replace.

## Read-only preview

With the app connected to the pilot database, open
`/tr/etymology-preview` or `/en/etymology-preview`. The page reads current
source entries on each request, supports headword and source filters, and
expands an entry to show its transcription, claims, review states, and match
count. The review page is available with the dedicated Mac database or the
loopback development tunnel. The scan view also requires the OCR files in
`ETYMOLOGY_OCR_DIR`. The review page has `noindex` metadata.

To reopen the Mac-local preview after a restart, run
`bun run etymology:preview:local`. The script gets the dedicated container's
password without printing it or editing `.env` files, builds the standalone
app, and serves the page on `localhost:3001`. Stop it with `Ctrl-C`.

The dictionary card pilot uses the same local database. After loading the
dictionary records for `ağır`, `vişne`, and both senses of `ağız`, run
`bun src/scripts/seed-word-etymology-pilot.ts` with that database's
`DATABASE_URL`. The script checks the word and meaning IDs before saving the
four reviewed links. It preserves existing reviews on repeat runs. Open the
words through `/tr/arama` to see their Köken sections.

## Development catalog import

Use the development-only SSH tunnel in
[Raspberry Pi database migrations](raspberry-pi-database-migrations.md).
With the 472-page catalog and its scans on disk, set `ETYMOLOGY_OCR_DIR` to
the first-ten-page directory, then dry-run the import and inspect the counts.

```bash
bun src/scripts/import-hasan-eren-catalog.ts
bun src/scripts/import-hasan-eren-catalog.ts --write
bun src/scripts/seed-word-etymology-pilot.ts
```

The bulk import records raw OCR and source ranges, along with reviewed and
draft summaries. Repeating it preserves existing reviews. The final command
adds the four reviewed dictionary links and their structured claims. The
development reader displays reviewed summaries on the deployed site and
includes drafts when accessed from an app using the loopback tunnel.

The Coolify development service reads the scan files from the Pi directory
`/srv/turkish-dictionary/etymology-ocr`, mounted read-only. Store the
`hasan-eren-pages-01-10` and `hasan-eren-book` directories there, preserving
the page images, combined OCR files, and `reader-catalog.json`. Add these
files over private SSH. Keep the scans outside Git and the container image.
On the Access-protected development site, **Kitapta göster** appears when
the entry's page image and OCR data are present. The OCR records list remains
available from the local pilot or development tunnel.

Development had already applied the identical etymology SQL under the pilot
migration timestamp. For migration `0056_hasan_eren_etymology`, the existing
ledger row was reconciled after verifying its SQL hash, the other ledger
entries, the table definitions, and the enums. Fresh environments use the
normal migration sequence.
