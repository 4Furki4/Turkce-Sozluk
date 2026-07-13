# Raspberry Pi Database Access and Migrations

Use this runbook whenever Drizzle Studio or a generated Drizzle migration must
connect to the development or production PostgreSQL database running on
`furkipie`.

The databases are deliberately private Docker services. Do not publish
Postgres or PgBouncer ports on the Pi, and do not add either service to
Cloudflare Tunnel. Instead, run Drizzle locally and reach the target database
through a loopback-only SSH tunnel.

## Target map

| Target | Docker container | Default database | Local tunnel port | App health endpoint |
| --- | --- | --- | --- | --- |
| Development | `turkish-dictionary-db-development` | `turkish_dictionary_development` | `15432` | `http://127.0.0.1:3002/api/health` |
| Production | `turkish-dictionary-db-production` | `turkish_dictionary` | `15433` | `http://127.0.0.1:3000/api/health` |

The default database user is `postgres`. If `POSTGRES_USER` or `POSTGRES_DB`
was changed in the corresponding `.env.development.pi` or `.env.production.pi`
file, use those values instead. Never print, commit, or paste the database
password into this document, shell history, logs, or chat.

Use the direct `db-*` containers for Studio and migrations. The apps connect
through PgBouncer in transaction pooling mode, which is correct for runtime
traffic but is not the migration connection to depend on.

## Preconditions

Before changing a database:

1. Make the schema change in `db/schema/`.
2. Generate the migration with `bun run db:generate`.
3. Inspect the generated SQL in `drizzle/migrations/` and run the appropriate
   build and focused tests.
4. Ensure the migration is compatible with the currently running app. Use an
   expand/contract rollout for renames, drops, or new required columns.
5. Confirm both target containers are running without exposing any secrets:

```bash
ssh furkipie 'sudo -n docker inspect -f "{{.Name}} {{.State.Status}}" \
  turkish-dictionary-db-development \
  turkish-dictionary-db-production'
```

If `sudo -n` fails, authenticate on the Pi or fix the Pi user's Docker access;
do not work around it by publishing a database port.

## Migration ledger gate

Before running `db:migrate:local`, confirm that the database's Drizzle ledger
matches the schema's history. Run this read-only query inside the relevant
`db-development` or `db-production` container:

```sql
SELECT count(*) AS applied_migrations, max(created_at) AS latest_created_at
FROM drizzle.__drizzle_migrations;
```

Interpret the result before taking any write action:

- A non-empty ledger can proceed through the normal migration process after
  its entries are checked against `drizzle/migrations/meta/_journal.json`.
- An empty ledger and an empty application schema means this is a new database;
  only then can the full migration history be applied after development
  validation.
- An empty ledger while application tables exist means the schema was created
  through `db:push`, a restore, or another untracked workflow. **Stop. Do not
  run `db:migrate:local`**: it would replay the historical SQL into existing
  objects. First reconcile the schema with the intended branch and create a
  reviewed one-off baseline for the migration ledger.

Do not insert migration metadata based on table counts alone. Confirm the
schema, columns, constraints, and indexes required by the intended branch
before recording a baseline.

## Open the SSH tunnel

Run the following on the Mac. Docker container IPs may change after a recreate,
so resolve them for every session rather than copying a previous IP.

```bash
DEV_DB_IP="$(ssh furkipie "sudo -n docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' turkish-dictionary-db-development")"
PROD_DB_IP="$(ssh furkipie "sudo -n docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' turkish-dictionary-db-production")"

ssh -o ExitOnForwardFailure=yes -N \
  -L 15432:"$DEV_DB_IP":5432 \
  -L 15433:"$PROD_DB_IP":5432 \
  furkipie
```

Keep this terminal open. SSH binds these forwards to the Mac's loopback
interface by default:

- `127.0.0.1:15432` reaches development PostgreSQL.
- `127.0.0.1:15433` reaches production PostgreSQL.

Use a separate terminal for Studio or migrations. Stop the tunnel with
`Ctrl-C` when finished.

## Set a temporary local connection

The commands below assume zsh. They request the password without adding it to
shell history and pass it to the PostgreSQL client through `PGPASSWORD`; the
connection URL itself contains no password.

### Development

```bash
read -rs "PGPASSWORD?Development database password: "
printf '\n'
export PGPASSWORD
export DATABASE_URL='postgresql://postgres@127.0.0.1:15432/turkish_dictionary_development?sslmode=disable'
```

### Production

```bash
read -rs "PGPASSWORD?Production database password: "
printf '\n'
export PGPASSWORD
export DATABASE_URL='postgresql://postgres@127.0.0.1:15433/turkish_dictionary?sslmode=disable'
```

Replace the user or database name only if the relevant Pi environment file
overrides the documented defaults. `sslmode=disable` is correct because this
traffic is inside the encrypted SSH tunnel and the Pi's internal PostgreSQL
containers do not terminate TLS.

`drizzle.local.config.ts` reads `DATABASE_URL`; an environment value supplied
by the shell takes precedence over `.env.local`. Do not use `studio:live` for
the Pi: it reads `.env.production.local` and is configured for the separate
external SSL-style connection.

## Drizzle Studio

After selecting one target above, start Studio locally:

```bash
bun run studio:local -- --host 127.0.0.1 --port 4983
```

Open <http://127.0.0.1:4983>. For a simultaneous second Studio instance, use
another local UI port such as `4984`. Treat production Studio as a live data
tool: inspect by default and make only deliberate, reviewed data changes.

## Apply a generated migration

Use the same temporary `DATABASE_URL` for this command. `db:migrate:local` is
the URL-based Drizzle configuration, so it is the correct command for either
Pi target only after the migration ledger gate above has passed or the database
has been reviewed and baselined.

### Development rollout

```bash
bun run db:migrate:local
ssh furkipie 'curl -fsS http://127.0.0.1:3002/api/health'
```

Confirm the migration succeeded, the development health endpoint returns
success, and the changed flow works before considering production.

### Production rollout

Create and verify a fresh backup first. Run these commands on the Pi in a
separate SSH session:

```bash
cd ~/development/Turkce-Sozluk
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_PATH="/srv/backups/pre-restic/turkish-dictionary/postgres/production_${STAMP}.dump"

sudo -n mkdir -p /srv/backups/pre-restic/turkish-dictionary/postgres
set -o pipefail
sudo -n docker compose --env-file .env.production.pi -f docker-compose.production.yml exec -T db-production \
  sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --compress=9 --no-owner --no-privileges' \
  | sudo -n tee "$BACKUP_PATH" >/dev/null
test -s "$BACKUP_PATH"
```

Do not proceed if the backup fails or is empty. Then, back on the Mac with the
production tunnel and connection variables active:

```bash
bun run db:migrate:local
ssh furkipie 'curl -fsS http://127.0.0.1:3000/api/health'
```

If the production migration or health check fails, stop and use the backup and
[rollback runbook](raspberry-pi-rollback.md); do not improvise a destructive
schema reversal on the live database.

## Cleanup

When the session is finished, close the tunnel terminal and clear the
short-lived local credentials:

```bash
unset DATABASE_URL PGPASSWORD
```

## Rules that must not be bypassed

- Never run `bun run db:push`, `bun run db:push:prod`, or an unreviewed SQL
  command against either Pi database.
- Never expose port `5432` on the Pi or through a public tunnel.
- Never reuse an old container IP; resolve it before starting a tunnel.
- Always test the generated migration on the Pi development database before
  production.
- Always take and verify a fresh production dump before applying production
  migration SQL.
