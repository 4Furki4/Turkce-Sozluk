import { test, expect } from "bun:test";
import { verifyLedger } from "./pi-release.mjs";
const entries = [{ when: 100, tag: "0000" }, { when: 200, tag: "0001" }];
const hash = tag => `hash-${tag}`;
const first = { created_at: "100", hash: "hash-0000" };
test("only the unapplied migration suffix is returned", () => {
  expect(verifyLedger([first], entries, hash)).toEqual([entries[1]]);
  expect(verifyLedger([first, { created_at: 200, hash: "hash-0001" }], entries, hash)).toEqual([]);
});
test("an empty database ledger never replays historical migrations", () => {
  expect(() => verifyLedger([], entries, hash)).toThrow("baseline");
});
test("drifted hashes, missing history and future migrations stop the release", () => {
  expect(() => verifyLedger([{ ...first, hash: "changed" }], entries, hash)).toThrow("mismatch");
  expect(() => verifyLedger([{ created_at: 200, hash: "hash-0001" }], entries, hash)).toThrow("mismatch");
  expect(() => verifyLedger([first, first, first], entries, hash)).toThrow("ahead");
});

test("non-push events, foreign repositories and invalid releases cannot access SSH", async () => {
  const { main } = await import("./pi-release.mjs");
  const env = { GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/heads/main", GITHUB_REPOSITORY: "4Furki4/Turkce-Sozluk", GITHUB_SHA: "a".repeat(40), PUBLISHED_IMAGE_DIGEST: `sha256:${"b".repeat(64)}`, PI_SSH_HOST: "ci@furkipie" };
  for (const override of [{ GITHUB_EVENT_NAME: "pull_request" }, { GITHUB_EVENT_NAME: "workflow_dispatch" }, { GITHUB_REPOSITORY: "fork/repo" }, { GITHUB_REF: "refs/heads/feature" }, { GITHUB_SHA: "short" }, { PUBLISHED_IMAGE_DIGEST: "latest" }, { PI_SSH_HOST: "-oProxyCommand=bad" }]) {
    await expect(main({ ...env, ...override })).rejects.toThrow();
  }
});

test("manual connectivity checks require the source repo and explicit database target", async () => {
  const { assertContext } = await import("./pi-release.mjs");
  const env = { GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_REF: "refs/heads/feature", GITHUB_REPOSITORY: "4Furki4/Turkce-Sozluk", GITHUB_SHA: "a".repeat(40), PI_CHECK_TARGET: "production" };
  expect(() => assertContext(env, true)).not.toThrow();
  expect(() => assertContext({ ...env, PI_CHECK_TARGET: "development" }, true)).not.toThrow();
  for (const override of [{ GITHUB_EVENT_NAME: "push" }, { GITHUB_EVENT_NAME: "pull_request" }, { GITHUB_REPOSITORY: "fork/repo" }, { PI_CHECK_TARGET: "" }, { PI_CHECK_TARGET: "other" }]) {
    expect(() => assertContext({ ...env, ...override }, true)).toThrow();
  }
  expect(() => assertContext(env)).toThrow();
});

test("only the exact archived development history is accepted without changing pending migrations", async () => {
  const { DEVELOPMENT_HISTORY } = await import("./pi-release.mjs");
  const legacy = { created_at: String(DEVELOPMENT_HISTORY[0].when), hash: DEVELOPMENT_HISTORY[0].hash };
  expect(legacy.hash).toBe("38cfd247d6a5154335c23a09ae9dcb4dda033493c7df2d321b65563fa3a5e7b3");
  expect(verifyLedger([first, legacy], entries, hash, DEVELOPMENT_HISTORY)).toEqual([entries[1]]);
  expect(() => verifyLedger([first, legacy], entries, hash)).toThrow();
  expect(() => verifyLedger([first, { ...legacy, hash: "modified" }], entries, hash, DEVELOPMENT_HISTORY)).toThrow();
  expect(() => verifyLedger([first, { ...legacy, created_at: "999" }], entries, hash, DEVELOPMENT_HISTORY)).toThrow();
  expect(() => verifyLedger([first, legacy, legacy], entries, hash, DEVELOPMENT_HISTORY)).toThrow("Duplicate");
});

test("archive verification drains large streams and preserves verification failure under pipefail", async () => {
  const { ARCHIVE_VERIFY_COMMAND } = await import("./pi-release.mjs");
  const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { spawnSync } = await import("node:child_process");
  const directory = mkdtempSync(join(tmpdir(), "archive-verification-"));
  try {
    // Model pg_restore --list finishing after the header of a much larger dump.
    writeFileSync(join(directory, "pg_restore"), '#!/bin/sh\nhead -c 32 >/dev/null\nexit "$VERIFY_EXIT"\n', { mode: 0o700 });
    const run = (command, status) => spawnSync("bash", ["-c", 'set -o pipefail; head -c 8388608 /dev/zero | sh -c "$VERIFY_COMMAND"'], {
      env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, VERIFY_COMMAND: command, VERIFY_EXIT: String(status) },
    }).status;
    expect(run("pg_restore --list >/dev/null", 0)).toBe(141);
    expect(run(ARCHIVE_VERIFY_COMMAND, 0)).toBe(0);
    expect(run(ARCHIVE_VERIFY_COMMAND, 42)).toBe(42);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
