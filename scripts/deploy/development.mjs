import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { ApiError, jsonClient } from "./client.mjs";
import { DEVELOPMENT_URL, developmentCompose, readinessMarker, validateDigest } from "./compose.mjs";

export { developmentCompose } from "./compose.mjs";
export const REPOSITORY = "4furki4/turkce-sozluk";
export const SERVICE_NAME = "dictionary-development";
export class StaleRun extends Error {}

export function ownership({ projectUuid, environmentUuid }) {
  return JSON.stringify({ managedBy: "dictionary-development-v1", repository: REPOSITORY, branch: "develop", projectUuid, environmentUuid });
}

function validateUuid(uuid) {
  if (typeof uuid !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(uuid)) throw new Error("Missing or invalid Coolify resource UUID");
  return uuid;
}

export function assertWorkflowContext(environment) {
  if (environment.GITHUB_EVENT_NAME !== "push" || environment.GITHUB_REF !== "refs/heads/develop" || environment.GITHUB_REPOSITORY?.toLowerCase() !== REPOSITORY) {
    throw new Error("Development deployment requires a push to the source repository develop branch");
  }
}

export async function assertCurrent({ github, sha }) {
  let ref;
  try { ref = await github(`/repos/${REPOSITORY}/git/ref/heads/develop`); }
  catch (error) {
    if (error instanceof ApiError && error.status === 404) throw new StaleRun("Develop branch was deleted; older deployment skipped");
    throw error;
  }
  if (ref?.object?.sha !== sha) throw new StaleRun("Develop head changed; older deployment skipped");
}

async function assertOwned({ coolify, config }) {
  // Membership is checked through the exact project/environment endpoint because
  // service details expose a numeric environment_id rather than project UUIDs.
  const environment = await coolify(`/api/v1/projects/${config.projectUuid}/${config.environmentUuid}`);
  if (environment?.uuid !== config.environmentUuid || !Number.isInteger(environment.id) || !Array.isArray(environment.services)) {
    throw new Error("Unexpected Coolify development environment metadata");
  }
  const matches = environment.services.filter(resource => resource && (resource.uuid === config.serviceUuid || resource.name === SERVICE_NAME));
  const owned = resource => resource?.uuid === config.serviceUuid && resource.name === SERVICE_NAME && resource.description === ownership(config) && resource.environment_id === environment.id;
  if (matches.length !== 1 || !owned(matches[0])) throw new Error("Refusing to modify a service outside the owned development environment");
  const current = await coolify(`/api/v1/services/${config.serviceUuid}`);
  if (!owned(current)) throw new Error("Development service ownership changed; deployment refused");
  if (current.server_status !== true) throw new Error("Development server is unavailable");
}

const MAX_PROOF_AGE_MS = 30_000;
const MAX_CLOCK_SKEW_MS = 5_000;
const MIN_PROBE_SEPARATION_MS = 8_000;

function freshChecks(checks, now) {
  return [...checks].filter(checkedAt => Number.isSafeInteger(checkedAt) && checkedAt >= now - MAX_PROOF_AGE_MS && checkedAt <= now + MAX_CLOCK_SKEW_MS).sort((a, b) => a - b);
}

export function readinessChecks(logs, { digest, nonce, now = Date.now() }) {
  const prefix = `${readinessMarker({ digest, nonce })} checkedAt=`;
  if (typeof logs !== "string" || !Number.isSafeInteger(now)) return [];
  const timestamps = logs.split(/\r?\n/).flatMap(line => {
    line = line.trim();
    if (!line.startsWith(prefix)) return [];
    const timestamp = line.slice(prefix.length);
    return /^\d{13}$/.test(timestamp) ? [Number(timestamp)] : [];
  });
  return freshChecks(new Set(timestamps), now);
}

export function latestReadinessCheck(logs, options) {
  return readinessChecks(logs, options).at(-1);
}

export async function runDevelopment({ sha, digest, config, coolify, github, nonce = randomBytes(32).toString("hex"), wait = ms => new Promise(resolve => setTimeout(resolve, ms)), maxAttempts = 60, now = Date.now }) {
  if (typeof sha !== "string" || !/^[a-f0-9]{40}$/.test(sha)) throw new Error("A full GitHub commit SHA is required");
  validateDigest(digest);
  readinessMarker({ digest, nonce });
  for (const key of ["projectUuid", "environmentUuid", "serviceUuid"]) validateUuid(config[key]);
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 120) throw new Error("Invalid deployment readiness timeout");
  const guard = () => assertCurrent({ github, sha });
  await guard();
  await assertOwned({ coolify, config });
  const compose = developmentCompose({ digest, nonce });
  await guard();
  await coolify(`/api/v1/services/${config.serviceUuid}`, { method: "PATCH", body: {
    docker_compose_raw: Buffer.from(JSON.stringify(compose)).toString("base64"),
    connect_to_docker_network: false, is_container_label_escape_enabled: true,
    instant_deploy: false,
  } });
  await assertOwned({ coolify, config });
  await guard();
  // StartService is dispatched for running services only via instant_deploy.
  await coolify(`/api/v1/services/${config.serviceUuid}`, { method: "PATCH", body: { instant_deploy: true } });
  // After dispatch this run owns the outcome of its deployment. A newer develop
  // head must not turn an already-started unhealthy release into a successful skip.
  let baseline;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let response;
    try {
      response = await coolify(`/api/v1/services/${config.serviceUuid}/logs?sub_service_name=app&lines=100&show_timestamps=false`);
    } catch (error) {
      // Old container removal/new startup briefly returns 400 or 404. Auth and
      // transport failures are not a successful deployment and must fail safely.
      if (!(error instanceof ApiError) || ![400, 404].includes(error.status)) throw error;
      baseline = undefined;
    }
    if (response !== undefined) {
      if (typeof response?.logs !== "string") throw new Error("Unexpected Coolify logs response");
      const checkedNow = now();
      const latest = latestReadinessCheck(response.logs, { digest, nonce, now: checkedNow });
      if (baseline !== undefined && freshChecks([baseline], checkedNow).length === 0) baseline = undefined;
      if (latest !== undefined) {
        // Only the latest probe in a response counts. A historical pair in the
        // first tail cannot prove the app kept responding after this observation.
        if (baseline === undefined) baseline = latest;
        else if (latest - baseline >= MIN_PROBE_SEPARATION_MS) {
          return { outcome: "healthy", sha, digest, url: DEVELOPMENT_URL, uuid: config.serviceUuid };
        }
      }
    }
    if (attempt + 1 < maxAttempts) await wait(5_000);
  }
  throw new Error("Development deployment did not produce fresh application and database readiness evidence; inspect Coolify privately");
}

export async function main(environment = process.env) {
  assertWorkflowContext(environment);
  const coolify = jsonClient({ baseUrl: environment.COOLIFY_URL, token: environment.COOLIFY_DEVELOPMENT_TOKEN, service: "Coolify" });
  const github = jsonClient({ baseUrl: "https://api.github.com", token: environment.GITHUB_TOKEN, service: "GitHub", headers: { "x-github-api-version": "2022-11-28" } });
  try {
    const result = await runDevelopment({ sha: environment.GITHUB_SHA, digest: environment.PUBLISHED_IMAGE_DIGEST, coolify, github,
      config: { projectUuid: environment.COOLIFY_PROJECT_UUID, environmentUuid: environment.COOLIFY_DEVELOPMENT_ENVIRONMENT_UUID, serviceUuid: environment.COOLIFY_DEVELOPMENT_SERVICE_UUID } });
    console.log(`Development deployed and healthy: ${result.digest}`);
    if (environment.GITHUB_STEP_SUMMARY) appendFileSync(environment.GITHUB_STEP_SUMMARY, `Development deployed and healthy: ${result.digest}\n`);
    return result;
  } catch (error) {
    if (error instanceof StaleRun) { console.log(error.message); return { outcome: "stale" }; }
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
