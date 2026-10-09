import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ciEnvironment } from "./env.mjs";

test("CI masks local environment-file keys before Next.js can load their values", () => {
  const initialDirectory = process.cwd();
  const directory = mkdtempSync(join(tmpdir(), "dictionary-ci-env-"));
  try {
    process.chdir(directory);
    writeFileSync(".env.production.local", "R2_SECRET_ACCESS_KEY=local-secret\nexport AUTH_SECRET=local-auth-secret\nDATABASE_URL=postgresql://remote/production\n");
    writeFileSync(".env.local", "UPSTASH_REDIS_REST_TOKEN=local-redis-token\n");
    const environment = ciEnvironment();
    expect(environment.R2_SECRET_ACCESS_KEY).toBe("");
    expect(environment.AUTH_SECRET).not.toBe("local-auth-secret");
    expect(environment.UPSTASH_REDIS_REST_TOKEN).toBe("ci-upstash-token");
    expect(new URL(environment.DATABASE_URL).hostname).toBe("127.0.0.1");
    expect(new URL(environment.DATABASE_URL).pathname).toBe("/turkish_dictionary_ci");
  } finally {
    process.chdir(initialDirectory);
    rmSync(directory, { recursive: true, force: true });
  }
});

test("CI does not inherit arbitrary credentials from the parent process", () => {
  const previous = process.env.CI_TEST_PARENT_SECRET;
  try {
    process.env.CI_TEST_PARENT_SECRET = "parent-secret";
    expect(ciEnvironment().CI_TEST_PARENT_SECRET).toBeUndefined();
  } finally {
    if (previous === undefined) delete process.env.CI_TEST_PARENT_SECRET;
    else process.env.CI_TEST_PARENT_SECRET = previous;
  }
});
