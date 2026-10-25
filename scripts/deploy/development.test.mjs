import { describe, expect, test } from "bun:test";
import { runInNewContext } from "node:vm";
import { readFileSync } from "node:fs";
import { ApiError, jsonClient } from "./client.mjs";
import { developmentCompose, readinessCommand, readinessMarker } from "./compose.mjs";
import { assertWorkflowContext, latestReadinessCheck, ownership, runDevelopment, SERVICE_NAME, StaleRun } from "./development.mjs";

const sha = "a".repeat(40);
const digest = `sha256:${"b".repeat(64)}`;
const nonce = "c".repeat(64);
const config = { projectUuid: "project-id", environmentUuid: "development-id", serviceUuid: "service-id" };
const marker = readinessMarker({ digest, nonce });
const clock = 1_780_000_000_000;
const proofLine = (checkedAt, prefix = marker) => `${prefix} checkedAt=${checkedAt}`;
const service = () => ({ uuid: config.serviceUuid, name: SERVICE_NAME, description: ownership(config), environment_id: 7, server_status: true, status: "running:healthy" });

function fixture({ heads = [], metadata, details, logs = [{ logs: proofLine(clock - 10_000) }, { logs: proofLine(clock) }], onMutation } = {}) {
  const calls = [];
  let reads = 0;
  let logReads = 0;
  const github = async () => {
    calls.push({ api: "github" });
    const head = reads < heads.length ? heads[reads++] : sha;
    return head === null ? null : { object: { sha: head } };
  };
  const coolify = async (path, options = {}) => {
    const call = { api: "coolify", path, ...options };
    calls.push(call);
    if (options.method) { onMutation?.(call); return { uuid: config.serviceUuid }; }
    if (path.includes("/logs?")) {
      const result = logs[Math.min(logReads++, logs.length - 1)];
      if (result instanceof Error) throw result;
      return result;
    }
    if (path.startsWith("/api/v1/projects/")) return metadata?.() ?? { uuid: config.environmentUuid, id: 7, services: [service()] };
    return details?.() ?? service();
  };
  return { calls, github, coolify };
}
const deploy = (api, options = {}) => runDevelopment({ sha, digest, nonce, config, ...api, wait: async () => {}, maxAttempts: 2, now: () => clock, ...options });
const mutations = api => api.calls.filter(call => call.method);

describe("development deployment boundary", () => {
  test("permits only canonical repository develop push context", () => {
    const valid = { GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/heads/develop", GITHUB_REPOSITORY: "4Furki4/Turkce-Sozluk" };
    expect(() => assertWorkflowContext(valid)).not.toThrow();
    for (const invalid of [
      { GITHUB_EVENT_NAME: "pull_request" }, { GITHUB_EVENT_NAME: "workflow_dispatch" },
      { GITHUB_REF: "refs/heads/main" }, { GITHUB_REPOSITORY: "another/Turkce-Sozluk" },
    ]) expect(() => assertWorkflowContext({ ...valid, ...invalid })).toThrow("requires a push");
  });

  test("deploys only digest-bound Compose and starts after a second head guard", async () => {
    const api = fixture();
    expect(await deploy(api)).toMatchObject({ outcome: "healthy", digest });
    const writes = mutations(api);
    expect(writes).toHaveLength(2);
    const payload = writes[0].body;
    expect(Object.keys(payload).sort()).toEqual(["connect_to_docker_network", "docker_compose_raw", "instant_deploy", "is_container_label_escape_enabled"]);
    expect(payload.instant_deploy).toBe(false);
    expect(writes[1].body).toEqual({ instant_deploy: true });
    const compose = JSON.parse(Buffer.from(payload.docker_compose_raw, "base64"));
    expect(compose.services.app.image).toBe(`furki4/turkish-dictionary-app@${digest}`);
    expect(Object.keys(compose.services.app.environment)).not.toContain("DATABASE_URL");
    expect(Object.keys(compose.services.app.environment)).not.toContain("GOOGLE_CLIENT_SECRET");
    expect(api.calls.some(call => /\/envs/.test(call.path ?? ""))).toBe(false);
    for (const write of writes) expect(api.calls[api.calls.indexOf(write) - 1].api).toBe("github");
  });

  test("does not mutate when the queued release is already stale or branch deleted", async () => {
    for (const head of ["d".repeat(40), null]) {
      const api = fixture({ heads: [head] });
      await expect(deploy(api)).rejects.toBeInstanceOf(StaleRun);
      expect(mutations(api)).toHaveLength(0);
    }
  });

  test("a deleted branch API response skips deployment and other API failures propagate", async () => {
    const api = fixture();
    await expect(deploy({ ...api, github: async () => { throw new ApiError("GitHub", 404); } })).rejects.toBeInstanceOf(StaleRun);
    await expect(deploy({ ...api, github: async () => { throw new ApiError("GitHub", 403); } })).rejects.toThrow("HTTP 403");
    expect(mutations(api)).toHaveLength(0);
  });

  test("rechecks head immediately before updating configuration", async () => {
    const api = fixture({ heads: [sha, "d".repeat(40)] });
    await expect(deploy(api)).rejects.toBeInstanceOf(StaleRun);
    expect(mutations(api)).toHaveLength(0);
  });

  test("does not start a saved release when develop advances after its Compose update", async () => {
    const api = fixture({ heads: [sha, sha, "d".repeat(40)] });
    await expect(deploy(api)).rejects.toBeInstanceOf(StaleRun);
    expect(mutations(api)).toHaveLength(1);
    expect(mutations(api)[0].body.instant_deploy).toBe(false);
  });

  test("rechecks ownership before start", async () => {
    let reads = 0;
    const api = fixture({ details: () => ({ ...service(), description: ++reads === 1 ? ownership(config) : "foreign" }) });
    await expect(deploy(api)).rejects.toThrow("ownership changed");
    expect(mutations(api)).toHaveLength(1);
  });

  test("rejects absent, duplicate, foreign and malformed environment metadata", async () => {
    for (const metadata of [
      {}, { uuid: "foreign", id: 7, services: [service()] },
      { uuid: config.environmentUuid, id: "7", services: [service()] },
      { uuid: config.environmentUuid, id: 7, services: null },
      { uuid: config.environmentUuid, id: 7, services: [] },
      { uuid: config.environmentUuid, id: 7, services: [service(), service()] },
      { uuid: config.environmentUuid, id: 7, services: [{ ...service(), environment_id: 8 }] },
      { uuid: config.environmentUuid, id: 7, services: [{ ...service(), description: "foreign" }] },
    ]) {
      const api = fixture({ metadata: () => metadata });
      await expect(deploy(api)).rejects.toThrow();
      expect(mutations(api)).toHaveLength(0);
    }
  });

  test("rejects detail records outside the owned service and unavailable server", async () => {
    for (const changes of [{ uuid: "foreign" }, { environment_id: 8 }, { name: "production" }, { description: "foreign" }, { server_status: false }]) {
      const api = fixture({ details: () => ({ ...service(), ...changes }) });
      await expect(deploy(api)).rejects.toThrow();
      expect(mutations(api)).toHaveLength(0);
    }
  });

  test("rejects tag, short digest, malformed SHA, nonce or UUID before API access", async () => {
    for (const options of [{ digest: "development" }, { digest: "sha256:abc" }, { sha: "short" }, { nonce: "old" }, { config: { ...config, serviceUuid: "../production" } }]) {
      const api = fixture();
      await expect(deploy(api, options)).rejects.toThrow();
      expect(api.calls).toHaveLength(0);
    }
  });

  test("cached healthy metadata and earlier nonce evidence cannot complete a deployment", async () => {
    const old = readinessMarker({ digest, nonce: "d".repeat(64) });
    const api = fixture({ logs: [{ logs: old }] });
    await expect(deploy(api)).rejects.toThrow("fresh application and database readiness");
    expect(mutations(api)).toHaveLength(2);
  });

  test("wrong digest and embedded marker text cannot complete a deployment", async () => {
    for (const logs of [readinessMarker({ digest: `sha256:${"e".repeat(64)}`, nonce }), `error: ${marker}`, `${marker} unrelated suffix`]) {
      await expect(deploy(fixture({ logs: [{ logs }] }))).rejects.toThrow("fresh application and database readiness");
    }
  });

  test("allows transient missing/restarting container, then verifies exact fresh marker", async () => {
    const api = fixture({ logs: [new ApiError("Coolify", 404), { logs: proofLine(clock - 10_000) }, { logs: `App started\n${proofLine(clock)}\n` }] });
    expect((await deploy(api, { maxAttempts: 3 })).outcome).toBe("healthy");
    expect(api.calls.filter(call => call.path?.includes("/logs?")).every(call => call.path.endsWith("lines=100&show_timestamps=false"))).toBe(true);
  });

  test("a newer develop head after dispatch cannot turn failed readiness into a successful skip", async () => {
    const api = fixture({ heads: [sha, sha, sha, "e".repeat(40)], logs: [{ logs: "unhealthy candidate" }] });
    await expect(deploy(api)).rejects.toThrow("readiness evidence");
    expect(mutations(api)).toHaveLength(2);
    expect(api.calls.filter(call => call.api === "github")).toHaveLength(3);
  });

  test("freshness parser rejects stale, far-future, malformed or wrong-identity evidence", () => {
    const options = { digest, nonce, now: clock };
    for (const line of [proofLine(clock - 30_001), proofLine(clock + 5_001), `${marker} checkedAt=abc`, proofLine(clock) + " suffix", proofLine(clock, readinessMarker({ digest, nonce: "d".repeat(64) }))]) {
      expect(latestReadinessCheck(line, options)).toBeUndefined();
    }
    expect(latestReadinessCheck(`${proofLine(clock - 20_000)}\n${proofLine(clock - 1_000)}`, options)).toBe(clock - 1_000);
    expect(latestReadinessCheck(proofLine(clock + 5_000), options)).toBe(clock + 5_000);
  });

  test("two historical lines in one tail or repeated same probe cannot complete readiness", async () => {
    const pair = `${proofLine(clock - 10_000)}\n${proofLine(clock)}`;
    await expect(deploy(fixture({ logs: [{ logs: pair }] }))).rejects.toThrow("readiness evidence");
    await expect(deploy(fixture({ logs: [{ logs: proofLine(clock) }] }))).rejects.toThrow("readiness evidence");
  });

  test("probes less than eight seconds apart do not complete readiness", async () => {
    const api = fixture({ logs: [{ logs: proofLine(clock - 7_999) }, { logs: proofLine(clock) }] });
    await expect(deploy(api)).rejects.toThrow("readiness evidence");
  });

  test("container unavailability clears earlier health observations", async () => {
    const logs = [{ logs: proofLine(clock - 20_000) }, new ApiError("Coolify", 400), { logs: proofLine(clock - 10_000) }, { logs: proofLine(clock) }];
    await expect(deploy(fixture({ logs }), { maxAttempts: 3 })).rejects.toThrow("readiness evidence");
    expect((await deploy(fixture({ logs }), { maxAttempts: 4 })).outcome).toBe("healthy");
  });

  test("log bursts between distinct fresh probes do not lose the observed baseline", async () => {
    const burst = Array.from({ length: 100 }, (_, index) => `unrelated app log ${index}`).join("\n");
    const api = fixture({ logs: [{ logs: proofLine(clock - 10_000) }, { logs: burst }, { logs: proofLine(clock) }] });
    expect((await deploy(api, { maxAttempts: 3 })).outcome).toBe("healthy");
  });

  test("expired baseline resets and requires two subsequent fresh probes", async () => {
    let now = clock;
    const api = fixture({ logs: [{ logs: proofLine(clock) }, { logs: proofLine(clock + 31_000) }, { logs: proofLine(clock + 41_000) }] });
    let waits = 0;
    const result = await deploy(api, { maxAttempts: 3, now: () => now, wait: async () => { now += ++waits === 1 ? 31_000 : 10_000; } });
    expect(result.outcome).toBe("healthy");
    expect(waits).toBe(2);
  });

  test("restart without fresh evidence times out and missing log permission fails clearly", async () => {
    await expect(deploy(fixture({ logs: [new ApiError("Coolify", 400)] }))).rejects.toThrow("readiness evidence");
    await expect(deploy(fixture({ logs: [new ApiError("Coolify", 403)] }))).rejects.toThrow("HTTP 403");
    await expect(deploy(fixture({ logs: [{ logs: null }] }))).rejects.toThrow("Unexpected Coolify logs");
  });
});

describe("runtime configuration and health proof", () => {
  test("retains hardening, private data network and loopback-only binding", () => {
    const compose = developmentCompose({ digest, nonce });
    const app = compose.services.app;
    expect(app).toMatchObject({ init: true, cap_drop: ["ALL"], security_opt: ["no-new-privileges:true"], tmpfs: ["/tmp"], mem_limit: "768m", cpus: 1, ports: ["127.0.0.1:3002:3000"] });
    expect(app.logging.options).toEqual({ "max-size": "10m", "max-file": "3" });
    expect(compose.networks.development).toEqual({ name: "turkce-sozluk_default", external: true });
    expect(Object.keys(compose.services)).toEqual(["app"]);
    expect(developmentCompose({ digest, nonce, publishPort: false }).services.app.ports).toBeUndefined();
    expect(app.environment.BETTER_AUTH_URL).toBe("https://development.turkce-sozluk.com");
  });

  function probe({ body = { status: "ok", checks: { app: "ok", database: "ok" } }, env = {}, responseOk = true } = {}) {
    const files = new Set();
    const lines = [];
    const exits = [];
    let requests = 0;
    const sandbox = {
      require: () => ({
        openSync: path => { if (files.has(path)) throw Object.assign(new Error("exists"), { code: "EEXIST" }); files.add(path); return 1; },
        closeSync: () => {}, appendFileSync: (path, line) => lines.push({ path, line }), unlinkSync: path => files.delete(path),
      }),
      process: { env: { COOLIFY_DEPLOY_NONCE: nonce, COOLIFY_DEPLOY_DIGEST: digest, ...env }, exit: code => exits.push(code) },
      Date: { now: () => clock }, AbortSignal, fetch: async () => { requests++; return { ok: responseOk, json: async () => body }; },
    };
    return { files, lines, exits, requests: () => requests, run: () => runInNewContext(readinessCommand({ digest, nonce }), sandbox) };
  }

  test("every successful health check emits timestamped evidence with a real newline", async () => {
    const proof = probe();
    await proof.run();
    await proof.run();
    expect(proof.lines).toEqual([
      { path: "/proc/1/fd/1", line: `${proofLine(clock)}\n` },
      { path: "/proc/1/fd/1", line: `${proofLine(clock)}\n` },
    ]);
    expect(proof.lines[0].line.charCodeAt(proof.lines[0].line.length - 1)).toBe(10);
    expect(proof.lines[0].line.endsWith("\\n")).toBe(false);
    expect(proof.lines[0].line.split("\n")).toEqual([proofLine(clock), ""]);
    expect(proof.requests()).toBe(2);
    expect(proof.exits).toEqual([]);
  });

  test("DB failures, malformed health bodies and non-200 response never emit evidence", async () => {
    for (const options of [{ body: { status: "error", checks: { app: "ok", database: "error" }, error: "private-db-secret" } }, { body: {} }, { responseOk: false }]) {
      const proof = probe(options);
      await proof.run();
      expect(proof.lines).toHaveLength(0);
      expect(proof.exits).toEqual([1]);
    }
  });

  test("health checker validates its own nonce and digest before requesting health", async () => {
    for (const env of [{ COOLIFY_DEPLOY_NONCE: "old" }, { COOLIFY_DEPLOY_DIGEST: "old" }]) {
      const proof = probe({ env });
      await proof.run();
      expect(proof.requests()).toBe(0);
      expect(proof.lines).toHaveLength(0);
      expect(proof.exits).toEqual([1]);
    }
  });
});

describe("API error redaction and workflow release gate", () => {
  test("never exposes response body, network errors or invalid JSON details", async () => {
    const secret = "private-credential";
    for (const fetchImpl of [
      async () => new Response(secret, { status: 422 }),
      async () => { throw new Error(secret); },
      async () => new Response(secret, { status: 200 }),
    ]) {
      const client = jsonClient({ baseUrl: "https://coolify.example", token: secret, service: "Coolify", fetchImpl });
      try { await client("/api/v1/services/x"); throw new Error("Expected failure"); }
      catch (error) { expect(error.message).not.toContain(secret); }
    }
  });

  test("rejects unsafe API origins and disables redirect following", async () => {
    for (const baseUrl of ["http://coolify.example", "https://u:p@coolify.example", "https://coolify.example/path", "https://coolify.example/?secret=1"]) {
      expect(() => jsonClient({ baseUrl, token: "token", service: "Coolify" })).toThrow();
    }
    let request;
    const client = jsonClient({ baseUrl: "https://coolify.example", token: "token", service: "Coolify", fetchImpl: async (url, options) => { request = { url, ...options }; return Response.json({ uuid: "x" }); } });
    await client("/api/v1/services/x");
    expect(request.redirect).toBe("error");
    expect(request.headers.authorization).toBe("Bearer token");
    await expect(client("//foreign.example")).rejects.toThrow("absolute");
  });

  test("existing all-check CI gate and image publication precede develop-only delivery", () => {
    const workflow = readFileSync(new URL("../../.github/workflows/test.yml", import.meta.url), "utf8");
    expect(workflow).toContain("needs: ci_passed");
    expect(workflow).toContain("id: published");
    expect(workflow).toContain("PUBLISHED_IMAGE_DIGEST: ${{ steps.published.outputs.digest }}");
    const deployment = workflow.slice(workflow.indexOf("      - name: Deploy development through Coolify"));
    for (const condition of ["github.event_name == 'push'", "github.ref == 'refs/heads/develop'", "github.repository == '4Furki4/Turkce-Sozluk'", "steps.published.outcome == 'success'"]) expect(deployment).toContain(condition);
  });
});
