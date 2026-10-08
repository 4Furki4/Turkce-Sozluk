# Word relation suggestions

The dashboard reviews saved Jev results. Import and review do not call TypeSafe.

## Import

Set `DATABASE_URL` to the intended database. The importer also reads the local development environment files without overwriting an externally supplied URL.

```bash
bun run relations:import         # validate files and word identities, without writing
bun run relations:import --write # import after validation
```

Defaults are `jev/output/all-words.ndjson` and `jev/output/all-words-status.json`. Override them with `--file` and `--status-file`. Missing words are reported and their pairs skipped; changed names or malformed evidence abort before writing. Each run/pair is imported once, and subsequent imports preserve existing review decisions.

The browser receives pages of 50 summaries. Score can be ordered highest or lowest first, with highest confidence and stable pair ID breaking ties. Inclusive score (0–3) and confidence (0–100%) ranges, sort, search, and review status are preserved in the URL; changing filters resets pagination. Defaults remain pending, scores 2–3, all confidence values, highest score first. Full saved meanings are fetched only when expanding details. Reciprocal scores are grouped under the lower/higher word ID; ranking uses the highest observed score and its confidence. Acceptance writes the selected symmetric type in both directions in one transaction. Existing conflicting types require manual editing.

## Migration and local connection

The generated migration is `0047_spicy_vampiro.sql`. Apply it through the normal migration workflow when the database has a verified ledger. For this local database, the existing ledger was empty despite a populated schema. Only this inspected migration was applied, and its hash and timestamp were recorded atomically; older migrations were not replayed. This is local setup evidence, not a production migration procedure.

The local database currently uses a temporary loopback proxy on `127.0.0.1:15432` named `codex-word-suggestions-db-proxy`. Stop it with `docker stop codex-word-suggestions-db-proxy` when no longer needed. Environment secret files were not changed.

## Verification

```bash
bun run test --runInBand src/__tests__/proxy.test.ts src/lib/__tests__/word-relation-suggestions.test.ts src/server/api/routers/__tests__/word-relation-suggestions.test.ts
bun run build
```

Set `JEV_TEST_DATABASE_URL` to a local database with the new schema to enable the PostgreSQL integration cases. They create and remove their own fixture words and reviewer. Without that variable, database cases are skipped; authorization and importer validation cases still run.

Local verification imported 260,276 pairs from 310,260 directed scores. A second import added zero rows. All 35 focused tests passed with the PostgreSQL cases enabled, and `bun run build` passed. The built app was checked at desktop width and 390px mobile width using disposable words: dismissal, restoration, conflict blocking, manual editing, two-way acceptance, reload, search, score filters, Back navigation, and 50-row pagination. The test words and reviewer were removed afterward.

The Turkish route needed a proxy guard for a second Next.js pass over next-intl's internal rewrite. Regression tests cover that pass and preserve canonical redirects for incoming aliases.

Sorting and range filters were verified with 26 focused tests (including PostgreSQL cases), a successful `bun run build`, and the built app in English and Turkish at desktop and 390px mobile widths. Browser checks covered lowest-first results, range keyboard controls, reload/Back persistence, and ascending pagination. Mobile sorting/status selectors stack to keep their labels readable. Screenshots are saved as `jev/output/suggestions-ranges-desktop.png` and `jev/output/suggestions-ranges-mobile.png`.
