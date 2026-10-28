import { execFileSync, spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import postgres from "postgres";

export function verifyLedger(rows, entries, hash) {
  if (!rows.length) throw new Error("Empty migration ledger: baseline must be reviewed manually");
  if (rows.length > entries.length) throw new Error("Database is ahead of this release");
  rows.forEach((row, index) => {
    if (Number(row.created_at) !== entries[index].when || row.hash !== hash(entries[index].tag)) {
      throw new Error(`Migration ledger mismatch at position ${index}`);
    }
  });
  return entries.slice(rows.length);
}

export async function main(env = process.env) {
  const production = env.GITHUB_REF === "refs/heads/main";
  const target = production ? "production" : "development";
  if (env.GITHUB_EVENT_NAME !== "push" || !["refs/heads/main", "refs/heads/develop"].includes(env.GITHUB_REF) || env.GITHUB_REPOSITORY?.toLowerCase() !== "4furki4/turkce-sozluk") throw new Error("Release requires a source repository branch push");
  if (!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || "") || !/^sha256:[a-f0-9]{64}$/.test(env.PUBLISHED_IMAGE_DIGEST || "")) throw new Error("Invalid release identity");
  const host = env.PI_SSH_HOST;
  if (!/^[a-zA-Z0-9_.@-]+$/.test(host || "") || host.startsWith("-")) throw new Error("Invalid SSH destination");
  const sshArgs = ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", "ConnectTimeout=15"];
  const ssh = command => execFileSync("ssh", [...sshArgs, host, command], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 300000 });
  const current = () => {
    const result = execFileSync("git", ["ls-remote", "origin", env.GITHUB_REF], { encoding: "utf8" }).split(/\s/)[0];
    if (result !== env.GITHUB_SHA) throw new Error("Branch head changed: refusing stale release");
  };
  current();
  const container = `turkish-dictionary-db-${target}`;
  // Capture credentials privately; never print docker inspect or subprocess errors.
  const metadata = JSON.parse(ssh(`sudo -n docker inspect ${container}`))[0];
  const values = Object.fromEntries(metadata.Config.Env.map(value => { const i = value.indexOf("="); return [value.slice(0, i), value.slice(i + 1)]; }));
  const ip = Object.values(metadata.NetworkSettings.Networks).map(n => n.IPAddress).find(Boolean);
  if (values.POSTGRES_DB !== (production ? "turkish_dictionary" : "turkish_dictionary_development")) throw new Error("Unexpected database identity");
  if (!/^[0-9.]+$/.test(ip || "") || !values.POSTGRES_PASSWORD) throw new Error("Unusable database metadata");
  const url = new URL("postgresql://127.0.0.1:15439");
  url.username = values.POSTGRES_USER || "postgres";
  url.password = values.POSTGRES_PASSWORD;
  url.pathname = values.POSTGRES_DB;
  url.searchParams.set("sslmode", "disable");
  const tunnel = spawn("ssh", [...sshArgs, "-o", "ExitOnForwardFailure=yes", "-o", "ServerAliveInterval=15", "-N", "-L", `127.0.0.1:15439:${ip}:5432`, host], { stdio: "ignore" });
  let tunnelFailed = false;
  tunnel.on("error", () => { tunnelFailed = true; });
  tunnel.on("exit", () => { tunnelFailed = true; });
  const sql = postgres(url.toString(), { max: 1, connect_timeout: 2, ssl: false, onnotice: () => {} });
  try {
    let connected = false;
    for (let i = 0; i < 30; i++) {
      if (tunnelFailed) throw new Error("SSH tunnel failed");
      try { await sql`SELECT 1`; connected = true; break; } catch { await delay(500); }
    }
    if (!connected) throw new Error("Database tunnel unavailable");
    await sql`SELECT pg_advisory_lock(7192170055)`;
    const entries = JSON.parse(readFileSync("drizzle/migrations/meta/_journal.json", "utf8")).entries;
    const hash = tag => createHash("sha256").update(readFileSync(`drizzle/migrations/${tag}.sql`)).digest("hex");
    const ledger = () => sql`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at, id`;
    const pending = verifyLedger(await ledger(), entries, hash);
    console.log(`${target}: ${pending.length} pending migrations`);
    current();
    if (production && pending.length) {
      const developmentLedger = ssh(`sudo -n docker exec turkish-dictionary-db-development sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT hash || chr(124) || created_at FROM drizzle.__drizzle_migrations ORDER BY created_at,id"'`);
      const developmentRows = developmentLedger.trim().split("\n").map(line => {
        const [hash, created_at] = line.split("|");
        return { hash, created_at };
      });
      if (verifyLedger(developmentRows, entries, hash).length) throw new Error("Production migrations must be applied to development first");
      console.log("Development migration history verified; creating production backup");
      ssh(`set -eu; set -o pipefail; backup=/srv/backups/pre-restic/turkish-dictionary/postgres/production_ci_${env.GITHUB_SHA}_$(date -u +%Y%m%dT%H%M%SZ).dump; sudo -n mkdir -p /srv/backups/pre-restic/turkish-dictionary/postgres; sudo -n docker exec ${container} sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-privileges' | sudo -n tee "$backup" >/dev/null; sudo -n test -s "$backup"; sudo -n cat "$backup" | sudo -n docker exec -i ${container} pg_restore --list >/dev/null`);
      console.log("Production backup created and archive verified");
    }
    if (pending.length) {
      console.log(`Applying ${target} migrations`);
      const result = spawnSync("bun", ["run", "db:migrate:local"], { env: { ...env, DATABASE_URL: url.toString() }, stdio: "pipe" });
      if (result.status !== 0) throw new Error("Migration failed; inspect privately, application deployment stopped");
    }
    if (verifyLedger(await ledger(), entries, hash).length) throw new Error("Migration ledger incomplete");
    ssh(`curl -fsS http://127.0.0.1:${production ? 3000 : 3002}/api/health >/dev/null`);
    if (production) {
      current();
      const image = `furki4/turkish-dictionary-app@${env.PUBLISHED_IMAGE_DIGEST}`;
      console.log("Deploying production image");
      ssh(`set -eu; cd ~/development/Turkce-Sozluk; sudo -n docker pull ${image} >/dev/null; sudo -n env APP_IMAGE=${image} docker compose --env-file .env.production.pi -f docker-compose.production.yml up -d --no-deps app-production >/dev/null`);
      let healthy = false;
      for (let i = 0; i < 60; i++) {
        try {
          const actual = ssh("sudo -n docker inspect turkish-dictionary-app-production --format '{{.Config.Image}}'").trim();
          const health = JSON.parse(ssh("curl -fsS http://127.0.0.1:3000/api/health"));
          if (actual === image && health.status === "ok" && health.checks?.database === "ok") { healthy = true; break; }
        } catch { /* Startup interval. */ }
        await delay(5000);
      }
      if (!healthy) throw new Error("Production did not become healthy; inspect release and use rollback runbook");
      console.log(`Production deployed and healthy: ${env.PUBLISHED_IMAGE_DIGEST}`);
    }
  } finally {
    await sql.end({ timeout: 5 });
    tunnel.kill("SIGTERM");
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error("Pi release failed. Check private host state and migration ledger before retrying; credentials and database errors are suppressed."); process.exitCode = 1; });
}
