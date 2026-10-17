import { describe, expect, test } from "bun:test";
import { credential, imageNames, ownership, previewIdentity } from "./identity.mjs";
import { DATABASE_KEYS, previewCompose, SHARED_RUNTIME_DEFAULTS } from "./compose.mjs";
import { ApiError, jsonClient } from "./client.mjs";
import { assertCurrent, runLifecycle, StaleRun } from "./lifecycle.mjs";

const sha = "a".repeat(40);
const identity = previewIdentity({ repository: "owner/dictionary", branch: "feature/search" });
const config = { projectUuid: "project", environmentUuid: "environment", serverUuid: "server", imageRepository: "furki4/turkish-dictionary-app", secret: "s".repeat(64) };
const resource = { uuid: "resource", name: identity.name, description: ownership(identity, config.environmentUuid), server_status: true };
const healthy = () => new Response("{}", { headers: { "x-preview-commit": sha, "x-robots-tag": "noindex, nofollow" } });

function scenario({ existing = false, heads = [sha], onRequest, health = healthy } = {}) {
  const calls = [];
  let guard = 0;
  let deleted = false;
  const github = async () => {
    const current = heads[Math.min(guard++, heads.length - 1)];
    return current ? { object: { sha: current } } : null;
  };
  const coolify = async (path, options = {}) => {
    calls.push({ path, ...options });
    if (onRequest) {
      const override = await onRequest(path, options);
      if (override !== undefined) return override;
    }
    if (path.endsWith("/envs")) return DATABASE_KEYS.map(key => ({ key }));
    if (path.startsWith("/api/v1/projects/")) return { uuid: config.environmentUuid, services: existing ? [resource] : [] };
    if (options.method === "DELETE") { deleted = true; return { message: "Service deletion request queued." }; }
    if (options.method === "POST") return { uuid: resource.uuid };
    if (options.method === "PATCH") return { uuid: resource.uuid };
    return deleted ? null : resource;
  };
  return { calls, run: (action = "deploy") => runLifecycle({ action, identity, sha, config, coolify, github, wait: async () => {}, fetchImpl: health }) };
}

describe("preview identity and isolation", () => {
  test("stable labels remain distinct when readable slugs collide", () => {
    expect(identity.url).toEndWith(".furkan-cengiz.com");
    const inputs = ["feature/a-b", "feature/a/b", "Feature/a/b", "özellik/arama", "🔥", "f/" + "x".repeat(240)];
    const values = inputs.map(branch => previewIdentity({ repository: "owner/dictionary", branch }));
    expect(new Set(values.map(value => value.hostname)).size).toBe(inputs.length);
    for (const value of values) {
      const label = value.hostname.split(".")[0];
      expect(label.length).toBeLessThanOrEqual(63);
      expect(label).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(previewIdentity({ repository: "owner/dictionary", branch: value.branch }).hostname).toBe(value.hostname);
    }
  });
  test("repository and exact branch identity scope credentials and ownership", () => {
    const other = previewIdentity({ repository: "other/dictionary", branch: identity.branch });
    expect(other.hostname).not.toBe(identity.hostname);
    expect(credential(config.secret, identity, "postgres")).not.toBe(credential(config.secret, other, "postgres"));
    expect(credential(config.secret, identity, "postgres")).not.toBe(credential(config.secret, identity, "auth"));
  });
  test("protected branches, malformed domains, image references and weak secrets fail closed", () => {
    for (const branch of ["", "main", "develop", "MAIN", "x\napp"]) {
      expect(() => previewIdentity({ repository: "owner/dictionary", branch })).toThrow();
    }
    for (const domain of ["localhost", "a..com", "-bad.example.com", "example.com:80", "https://example.com"]) {
      expect(() => previewIdentity({ repository: "owner/dictionary", branch: identity.branch, domain })).toThrow();
    }
    expect(() => imageNames("repo:latest", identity, sha)).toThrow();
    expect(() => imageNames(config.imageRepository, identity, "short")).toThrow();
    expect(() => credential("short", identity, "auth")).toThrow();
  });
  test("generated Compose uses only the private shared database network and editable runtime references", () => {
    const compose = previewCompose({ identity, images: imageNames(config.imageRepository, identity, sha), sha, secret: config.secret,
      sharedKeys: [...Object.keys(SHARED_RUNTIME_DEFAULTS), "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] });
    expect(compose.services.database).toBeUndefined();
    expect(compose.networks).toEqual({ development: { external: true, name: "dictionary-preview-development" } });
    expect(compose.services.app.networks).toEqual(["development"]);
    expect(compose.services.integrations.networks).toBeUndefined();
    for (const service of Object.values(compose.services)) expect(service.ports).toBeUndefined();
    for (const key of [...DATABASE_KEYS, ...Object.keys(SHARED_RUNTIME_DEFAULTS)]) {
      expect(compose.services.app.environment[key]).toBe(`\${${key}:-{{environment.${key}}}}`);
    }
    expect(compose.services.app.environment.BETTER_AUTH_URL).toBe(identity.url);
    expect(compose.services.app.environment.AUTH_SECRET).toStartWith("${AUTH_SECRET:-");
    expect(compose.services.app.environment.BETTER_AUTH_SECRET).toBe("${AUTH_SECRET}");
    expect(compose.services.app.environment.UPSTASH_REDIS_REST_URL).toBe("${UPSTASH_REDIS_REST_URL:-{{environment.UPSTASH_REDIS_REST_URL}}}");
    expect(compose.services.app.environment.UPSTASH_REDIS_REST_TOKEN).toBe("${UPSTASH_REDIS_REST_TOKEN:-{{environment.UPSTASH_REDIS_REST_TOKEN}}}");
    expect(compose.services.integrations.environment.PREVIEW_UPSTASH_TOKEN).toBe(compose.services.app.environment.UPSTASH_REDIS_REST_TOKEN);
    expect(JSON.stringify(compose)).not.toContain("preview-db-");
    expect(Object.keys(compose.services.app.labels).some(key => key.endsWith("X-Robots-Tag"))).toBe(true);
  });
  test("unconfigured integrations use safe editable defaults rather than unresolved shared references", () => {
    const compose = previewCompose({ identity, images: imageNames(config.imageRepository, identity, sha), sha, secret: config.secret });
    expect(compose.services.app.environment.RESEND_API_KEY).toBe("${RESEND_API_KEY:-}");
    expect(compose.services.app.environment.MEILI_HOST).toBe("${MEILI_HOST:-}");
    expect(compose.services.app.environment.RECAPTCHA_SECRET_KEY).toBe("${RECAPTCHA_SECRET_KEY:-preview-disabled}");
    expect(compose.services.app.environment.UPSTASH_REDIS_REST_URL).toBe("${UPSTASH_REDIS_REST_URL:-http://integrations:8179}");
    expect(compose.services.app.environment.UPSTASH_REDIS_REST_TOKEN).not.toContain("{{environment.");
  });
});

describe("branch lifecycle", () => {
  test("missing shared database configuration fails before any mutation", async () => {
    const s = scenario({ onRequest: path => path.endsWith("/envs") ? [] : undefined });
    await expect(s.run()).rejects.toThrow("Configure development database shared variables");
    expect(s.calls.some(call => call.method)).toBe(false);
  });
  test("malformed shared-variable metadata fails before any mutation", async () => {
    const s = scenario({ onRequest: path => path.endsWith("/envs") ? {} : undefined });
    await expect(s.run()).rejects.toThrow("shared-variable response");
    expect(s.calls.some(call => call.method)).toBe(false);
  });
  test("creates one owned Compose resource with explicit HTTP upstream and starts it only after a head recheck", async () => {
    const s = scenario();
    expect((await s.run()).outcome).toBe("created");
    const create = s.calls.find(call => call.method === "POST");
    expect(create.body.environment_uuid).toBe(config.environmentUuid);
    expect(create.body.instant_deploy).toBe(false);
    expect(create.body).not.toHaveProperty("connect_to_docker_network");
    expect(create.body.urls).toEqual([{ name: "app", url: `http://${identity.hostname}:3000` }]);
    const compose = JSON.parse(Buffer.from(create.body.docker_compose_raw, "base64").toString());
    expect(compose.services.app.image).toEndWith(sha);
    expect(s.calls.at(-1).body).toEqual({ instant_deploy: true });
  });
  test("updates the same UUID while preserving the hostname", async () => {
    const s = scenario({ existing: true });
    const result = await s.run();
    expect(result.outcome).toBe("updated");
    expect(result.url).toBe(identity.url);
    expect(s.calls.some(call => call.method === "POST")).toBe(false);
    expect(s.calls.filter(call => call.method === "PATCH").every(call => call.path === "/api/v1/services/resource")).toBe(true);
    expect(s.calls.find(call => call.method === "PATCH").body.connect_to_docker_network).toBe(false);
  });
  test("a stale or deleted push performs no mutation", async () => {
    for (const heads of [["b".repeat(40)], [null], [sha, "b".repeat(40)]]) {
      const s = scenario({ heads });
      await expect(s.run()).rejects.toBeInstanceOf(StaleRun);
      expect(s.calls.some(call => call.method)).toBe(false);
    }
  });
  test("a deleted branch during preparation cannot start a newly created resource", async () => {
    const s = scenario({ heads: [sha, sha, null] });
    await expect(s.run()).rejects.toBeInstanceOf(StaleRun);
    expect(s.calls.some(call => call.method === "POST")).toBe(true);
    expect(s.calls.some(call => call.body?.instant_deploy === true)).toBe(false);
  });
  test("foreign or duplicate resources cannot be updated or deleted", async () => {
    for (const services of [[{ ...resource, description: "someone else's app" }], [resource, resource]]) {
      const s = scenario({ heads: [null], onRequest: path => path.startsWith("/api/v1/projects/") ? { uuid: config.environmentUuid, services } : undefined });
      await expect(s.run("delete")).rejects.toThrow();
      expect(s.calls.some(call => call.method)).toBe(false);
    }
  });
  test("a resource moved out of the expected environment is never selected", async () => {
    const s = scenario({ onRequest: path => path.startsWith("/api/v1/projects/") ? { uuid: "foreign", services: [resource] } : undefined });
    await expect(s.run()).rejects.toThrow("environment response");
    expect(s.calls.some(call => call.method)).toBe(false);
  });
  test("delete is idempotent for missing resources", async () => {
    const s = scenario({ heads: [null] });
    expect((await s.run("delete")).outcome).toBe("absent");
    expect(s.calls.some(call => call.method)).toBe(false);
  });
  test("branch recreation before cleanup prevents deletion", async () => {
    for (const heads of [[sha], [null, sha]]) {
      const s = scenario({ existing: true, heads });
      await expect(s.run("delete")).rejects.toBeInstanceOf(StaleRun);
      expect(s.calls.some(call => call.method === "DELETE")).toBe(false);
    }
  });
  test("owned cleanup requests scoped volumes/networks and disables global Docker cleanup", async () => {
    const s = scenario({ existing: true, heads: [null] });
    expect((await s.run("delete")).outcome).toBe("cleanup queued");
    const call = s.calls.find(call => call.method === "DELETE");
    expect(call.path).toContain("delete_volumes=true");
    expect(call.path).toContain("docker_cleanup=false");
    expect(s.calls.some(call => call.path.endsWith("/envs"))).toBe(false);
  });
  test("ownership changes immediately before cleanup refuse deletion", async () => {
    const s = scenario({ existing: true, heads: [null], onRequest: path => path === "/api/v1/services/resource" ? { ...resource, description: "changed" } : undefined });
    await expect(s.run("delete")).rejects.toThrow("ownership changed");
    expect(s.calls.some(call => call.method)).toBe(false);
  });
  test("an unreachable preview server retains metadata for retryable runtime cleanup", async () => {
    const s = scenario({ existing: true, heads: [null], onRequest: path => path === "/api/v1/services/resource" ? { ...resource, server_status: false } : undefined });
    await expect(s.run("delete")).rejects.toThrow("keeping metadata");
    expect(s.calls.some(call => call.method === "DELETE")).toBe(false);
  });
  test("metadata-only deletion responses never report runtime cleanup as queued", async () => {
    const s = scenario({ existing: true, heads: [null], onRequest: (_path, options) => options.method === "DELETE" ? { message: "Server is not reachable. The service will be removed from Coolify only; Docker resources may remain." } : undefined });
    await expect(s.run("delete")).rejects.toThrow("did not queue runtime cleanup");
  });
  test("old revision or missing noindex never counts as a healthy deployment", async () => {
    for (const headers of [{ "x-preview-commit": "b".repeat(40), "x-robots-tag": "noindex" }, { "x-preview-commit": sha }]) {
      const s = scenario({ health: async () => new Response("{}", { headers }) });
      await expect(s.run()).rejects.toThrow("expected commit");
    }
  });
  test("unavailable API fails without attempting later lifecycle actions", async () => {
    const s = scenario({ onRequest: () => { throw new Error("Coolify unavailable"); } });
    await expect(s.run()).rejects.toThrow("Coolify unavailable");
    expect(s.calls.some(call => call.method)).toBe(false);
  });
});

describe("safe API handling", () => {
  test("branches with slashes stay in a GitHub ref path", async () => {
    let received;
    await assertCurrent({ identity, sha, github: async path => { received = path; return { object: { sha } }; } });
    expect(received).toEndWith("feature%2Fsearch");
  });
  test("HTTP errors never echo a response body containing credentials", async () => {
    const client = jsonClient({ baseUrl: "https://coolify.example.com", token: "private-token", service: "Coolify", fetchImpl: async () => new Response("SECRET_IN_BODY", { status: 422 }) });
    try { await client("/api/v1/services"); throw new Error("expected error"); }
    catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).not.toContain("SECRET_IN_BODY");
      expect(error.message).not.toContain("private-token");
    }
  });
  test("requests reject redirects and constrain credentials to an HTTPS origin", async () => {
    for (const baseUrl of ["http://coolify.example.com", "https://token@coolify.example.com", "https://coolify.example.com/path"]) {
      expect(() => jsonClient({ baseUrl, token: "token", service: "Coolify" })).toThrow();
    }
    let options;
    const client = jsonClient({ baseUrl: "https://coolify.example.com", token: "token", service: "Coolify", fetchImpl: async (_url, opts) => { options = opts; return new Response("{}"); } });
    await client("/api/v1/services");
    expect(options.redirect).toBe("error");
  });
  test("only explicit 404 reads can be treated as absent", async () => {
    const client = jsonClient({ baseUrl: "https://coolify.example.com", token: "token", service: "Coolify", fetchImpl: async () => new Response("{}", { status: 404 }) });
    await expect(client("/api/v1/services/missing", { missing: true })).resolves.toBeNull();
    await expect(client("/api/v1/services/missing")).rejects.toBeInstanceOf(ApiError);
  });
});
