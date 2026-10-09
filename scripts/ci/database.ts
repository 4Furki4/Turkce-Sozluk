import { spawnSync } from "node:child_process";
import postgres from "postgres";
import { ciEnvironment } from "./env.mjs";

// The target is fixed here, never taken from .env or DATABASE_URL in the shell.
const target = new URL(ciEnvironment().DATABASE_URL);
if (target.hostname !== "127.0.0.1" || target.pathname !== "/turkish_dictionary_ci" || target.port !== "54329") {
  throw new Error("CI setup only supports the disposable loopback database");
}
const client = postgres(target.toString(), { max: 1, connect_timeout: 5 });
try {
  await client`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
  // Legacy auth migrations cannot bootstrap a fresh DB. Use today's schema for
  // these smoke tests; this is deliberately not a migration-history check.
  const setup = spawnSync("bunx", ["--no-install", "drizzle-kit", "push", "--config", "scripts/ci/drizzle.config.ts", "--force"], {
    stdio: "inherit", env: ciEnvironment(),
  });
  if (setup.error) throw setup.error;
  if (setup.status !== 0) throw new Error("Disposable CI schema setup failed");
  const [word] = await client`
    INSERT INTO words (name, variant) SELECT 'kitap', 0
    WHERE NOT EXISTS (SELECT 1 FROM words WHERE name = 'kitap' AND variant = 0)
    RETURNING id
  `;
  if (word) {
    await client`INSERT INTO meanings (word_id, meaning, "order")
      VALUES (${word.id}, 'Okumak için yazılmış veya basılmış yaprakların bir araya getirilmiş biçimi.', 1)`;
  }
  console.log("CI database schema prepared and fixture word seeded.");
} finally {
  await client.end({ timeout: 5 });
}
