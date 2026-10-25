import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { imageNames, isOwned, ownership, previewIdentity } from "./identity.mjs";
import { DATABASE_KEYS, previewCompose } from "./compose.mjs";
import { jsonClient } from "./client.mjs";

export class StaleRun extends Error {}

export async function assertCurrent({ github, identity, sha, deleting = false }) {
  const ref = await github(`/repos/${identity.repository}/git/ref/heads/${encodeURIComponent(identity.branch)}`, { missing: true });
  if (deleting ? ref !== null : ref?.object?.sha !== sha) {
    throw new StaleRun(deleting ? "Branch exists again; cleanup skipped" : "Branch head changed or was deleted; deployment skipped");
  }
}

function validateUuid(uuid) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(uuid ?? "")) throw new Error("Missing or invalid Coolify resource UUID");
  return uuid;
}

export async function runLifecycle({ action, identity, sha, config, coolify, github, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), fetchImpl = fetch }) {
  if (!["deploy", "delete"].includes(action)) throw new Error("Unknown preview action");
  const project = validateUuid(config.projectUuid);
  const environmentUuid = validateUuid(config.environmentUuid);
  const server = validateUuid(config.serverUuid);
  const guard = () => assertCurrent({ github, identity, sha, deleting: action === "delete" });
  await guard();
  const environment = await coolify(`/api/v1/projects/${project}/${environmentUuid}`);
  if (environment?.uuid !== environmentUuid || !Array.isArray(environment.services)) throw new Error("Unexpected Coolify environment response");
  const matches = environment.services.filter(resource => resource.name === identity.name);
  if (matches.length > 1) throw new Error("Duplicate preview resources require manual inspection");
  const existing = matches[0];
  if (existing && !isOwned(existing, identity, environmentUuid)) throw new Error("Refusing to modify a resource without the exact preview ownership marker");
  if (action === "delete") {
    if (!existing) return { outcome: "absent", url: identity.url };
    const uuid = validateUuid(existing.uuid);
    // Refetch ownership immediately before a destructive operation.
    const current = await coolify(`/api/v1/services/${uuid}`, { missing: true });
    if (!current) return { outcome: "absent", url: identity.url };
    if (!isOwned(current, identity, environmentUuid)) throw new Error("Preview ownership changed; cleanup refused");
    if (current.server_status !== true) throw new Error("Preview server is unavailable; keeping metadata so runtime cleanup can be retried");
    await guard();
    const deletion = await coolify(`/api/v1/services/${uuid}?delete_configurations=true&delete_volumes=true&delete_connected_networks=true&docker_cleanup=false`, { method: "DELETE", missing: true });
    if (deletion === null) return { outcome: "absent", url: identity.url };
    if (deletion.message !== "Service deletion request queued.") {
      throw new Error("Coolify did not queue runtime cleanup; inspect the preview containers on the Pi");
    }
    // The API removes metadata before asynchronously removing containers. A
    // metadata 404 cannot prove that Docker cleanup has finished.
    return { outcome: "cleanup queued", url: identity.url };
  }
  const shared = await coolify(`/api/v1/projects/${project}/environments/${environmentUuid}/envs`);
  if (!Array.isArray(shared)) throw new Error("Unexpected Coolify shared-variable response");
  const missing = DATABASE_KEYS.filter(key => !shared.some(variable => variable.key === key));
  if (missing.length) throw new Error(`Configure development database shared variables in Coolify previews: ${missing.join(", ")}`);
  const images = imageNames(config.imageRepository, identity, sha);
  const compose = previewCompose({ identity, images, sha, secret: config.secret, sharedKeys: shared.map(variable => variable.key) });
  const payload = {
    name: identity.name, description: ownership(identity, environmentUuid),
    docker_compose_raw: Buffer.from(JSON.stringify(compose)).toString("base64"),
    urls: [{ name: "app", url: `http://${identity.hostname}:3000` }],
    instant_deploy: false, is_container_label_escape_enabled: true,
  };
  await guard();
  let uuid;
  if (existing) {
    uuid = validateUuid(existing.uuid);
    const current = await coolify(`/api/v1/services/${uuid}`);
    if (!isOwned(current, identity, environmentUuid)) throw new Error("Preview ownership changed; update refused");
    await guard();
    await coolify(`/api/v1/services/${uuid}`, { method: "PATCH", body: { ...payload, connect_to_docker_network: false } });
  } else {
    // Coolify 4.4.6 defaults this network flag to false on creation, but its
    // outer POST validator rejects the field. PATCH explicitly accepts it.
    const created = await coolify("/api/v1/services", { method: "POST", body: {
      ...payload, project_uuid: project, environment_uuid: environmentUuid, server_uuid: server,
      ...(config.destinationUuid ? { destination_uuid: validateUuid(config.destinationUuid) } : {}),
    } });
    uuid = validateUuid(created?.uuid);
  }
  await guard();
  // instant_deploy dispatches StartService even for a running service, pulling
  // the newly selected immutable images. /start alone rejects running services.
  await coolify(`/api/v1/services/${uuid}`, { method: "PATCH", body: { instant_deploy: true } });
  for (let attempt = 0; attempt < 60; attempt++) {
    await guard();
    try {
      const response = await fetchImpl(`${identity.url}/api/health`, { redirect: "error", signal: AbortSignal.timeout(8_000), cache: "no-store" });
      if (response.ok && response.headers.get("x-preview-commit") === sha && /noindex/.test(response.headers.get("x-robots-tag") ?? "")) {
        return { outcome: existing ? "updated" : "created", url: identity.url, uuid, sha };
      }
    } catch { /* The previous deployment can remain reachable during startup. */ }
    await wait(5_000);
  }
  throw new Error("Preview did not become healthy at the expected commit; inspect Coolify deployment logs");
}

export async function main(environment = process.env) {
  const identity = previewIdentity({ repository: environment.GITHUB_REPOSITORY, branch: environment.PREVIEW_BRANCH,
    project: environment.PREVIEW_PROJECT || "dictionary", domain: environment.PREVIEW_BASE_DOMAIN || "furkan-cengiz.com" });
  if (environment.PREVIEW_ACTION === "identity") {
    const images = imageNames(environment.PREVIEW_IMAGE_REPOSITORY || "furki4/turkish-dictionary-app", identity, environment.PREVIEW_SHA);
    if (environment.GITHUB_OUTPUT) appendFileSync(environment.GITHUB_OUTPUT, `identity=${identity.hash}\nurl=${identity.url}\napp_image=${images.app}\n`);
    console.log(identity.url);
    return;
  }
  const coolify = jsonClient({ baseUrl: environment.COOLIFY_URL, token: environment.COOLIFY_TOKEN, service: "Coolify" });
  const github = jsonClient({ baseUrl: "https://api.github.com", token: environment.GITHUB_TOKEN, service: "GitHub", headers: { "x-github-api-version": "2022-11-28" } });
  try {
    const result = await runLifecycle({ action: environment.PREVIEW_ACTION, identity, sha: environment.PREVIEW_SHA, coolify, github,
      config: { projectUuid: environment.COOLIFY_PROJECT_UUID, environmentUuid: environment.COOLIFY_ENVIRONMENT_UUID,
        serverUuid: environment.COOLIFY_SERVER_UUID, destinationUuid: environment.COOLIFY_DESTINATION_UUID,
        imageRepository: environment.PREVIEW_IMAGE_REPOSITORY || "furki4/turkish-dictionary-app", secret: environment.PREVIEW_SECRET } });
    console.log(`Preview ${result.outcome}: ${result.url}`);
    if (environment.GITHUB_STEP_SUMMARY) appendFileSync(environment.GITHUB_STEP_SUMMARY, `Preview ${result.outcome}: [Open branch preview](${result.url})\n`);
  } catch (error) {
    if (error instanceof StaleRun) { console.log(error.message); return; }
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
