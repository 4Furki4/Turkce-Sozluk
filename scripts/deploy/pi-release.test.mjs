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
