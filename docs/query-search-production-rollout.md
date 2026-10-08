# Query/search database rollout

Follow [the Pi database migration runbook](raspberry-pi-database-migrations.md)
for credentials, loopback SSH tunnels and backups. Use a clean checkout of the
merged performance change; preserve the Pi checkout's local Compose overrides.

## Readiness audit — 9 October 2026

The read-only audit reached both PostgreSQL containers through loopback SSH
tunnels and checked every ledger hash against the local migration journal.
Production has 49 matching entries through `0048_nostalgic_jackal`, with no
conflicting or unknown entries. Development has the same latest migration plus
one earlier historical entry at timestamp `1790641088949`; its known hashes
match. Both health endpoints returned success.

The pending migrations are:

- `0049_nebulous_viper`: creates six query indexes.
- `0050_typical_sunspot`: changes the new date index to `DESC NULLS FIRST`,
  matching the existing newest-first query ordering.

The referenced tables and columns exist in both databases. None of these six
index names existed at the audit. The changes preserve the current application
tables and data. Recheck the ledger and schema immediately before execution.

## Execution order

1. Select the development tunnel/connection from the migration runbook and run
   `bun run db:migrate:local`. Verify all six indexes are valid, the two new
   ledger entries match the generated SQL, and development health and a known
   dictionary lookup succeed.
2. Create a fresh production custom-format dump using the runbook. Verify it is
   non-empty and validate the complete archive with `pg_restore --file=/dev/null`;
   keep the dump private and record its path and checksum.
3. Select the production tunnel/connection and run `bun run db:migrate:local`.
   Use session-scoped lock/statement deadlines for the index builds; the generated
   migrations use ordinary transactional `CREATE INDEX`, so concurrent writes
   may briefly wait. If a deadline fails, stop and inspect the rolled-back result.
4. Verify production health, a known dictionary lookup, the migration ledger and
   the six valid index definitions. Close the tunnel and clear temporary credentials.

The expected indexes are `examples_meaning_id_idx`, `meanings_word_id_id_idx`,
`roots_word_id_idx`, `word_relation_suggestions_ascending_rank_idx`,
`words_name_id_idx` and `words_created_at_name_id_idx`. The final date index must
use `created_at DESC NULLS FIRST`.

If migration or health verification fails, follow the existing rollback runbook.
