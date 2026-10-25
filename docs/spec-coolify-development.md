---
title: Move development deployment to Coolify and stop Watchtower
type: operations
created: 2026-10-18
status: done
baseline_commit: 5d258001f7b9835e7144d133ecafd9be84b37069
review_loop_iteration: 0
context:
  - AGENTS.md
  - docs/raspberry-pi-deployments.md
  - docs/raspberry-pi-rollback.md
---

<frozen-after-approval reason="user requested migration and explicitly selected stopping Watchtower across the Pi">

## Intent

**Problem:** Development follows a floating Docker image through Watchtower rather than being managed by Coolify. The user requests moving `develop` into Coolify and explicitly requests stopping Watchtower across the Pi, including its automatic updates for other applications.

**Approach:** Move the currently healthy development app image into a dedicated Coolify development environment, preserve its domain, private database and runtime configuration, and add a develop-only GitHub Actions deployment after successful image publication. Keep rollback possible without changing database contents.

## Boundaries & Constraints

**Always:** Preserve `development.turkce-sozluk.com`, Cloudflare Access, loopback port 3002, existing development database/PgBouncer, private database ports, shared networks, existing production and portfolio containers, and development container hardening. Retain the old app configuration/image for rollback. Stop Watchtower and disable its restart/default Compose activation across the Pi. Keep secrets in Coolify/GitHub/Pi private files, never logs or commits. Build ARM64 images in GitHub Actions after existing CI gates; deploy immutable digests and reject stale heads.

**Ask First:** Merging the existing preview PR #214, merging a new delivery PR, database schema changes, deleting stored data, new domains, or changes to production application behavior.

**Never:** Bypass failed development CI to publish a new application revision, publish database ports, migrate production into Coolify, rotate established provider credentials, or erase rollback containers/data as part of this migration.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Initial migration | Healthy existing development image | Same app/data/domain managed by Coolify | Keep old app available until candidate health passes |
| Failed latest CI | Develop head has no passing release | Transfer the current healthy image without building that failed head | Report which release remains active |
| Future develop push | Successful gated ARM64 publication | Coolify deploys that immutable digest | Fail Actions on deployment timeout/failure |
| Newer head | Develop advances before deployment mutation | Older run skips mutation | Recheck before update and start |
| Runtime configuration | Imported dev settings and later Coolify edits | Existing values remain effective on future releases | No regeneration of credentials or database defaults |
| Cutover failure | New app unhealthy on 3002 | Restore old app on 3002 | Keep database and other apps untouched |
| Watchtower removal | Global stop authorized | No running/restarting Watchtower | Other containers retain current images |

</frozen-after-approval>

## Code Map

- `.github/workflows/test.yml` — existing CI and image publication gate.
- `docker-compose.development.yml` — existing app, database and pool.
- `docker-compose.production.yml` — current global Watchtower definition.
- Pi `/home/furki/development/Turkce-Sozluk/` — deployed Compose/configuration.
- Coolify API `/services`, `/projects`, service envs/logs — deployment management.

## Tasks & Acceptance

- [x] Pi `watchtower-1` — back up metadata, stop it, disable restart.
- [x] Coolify project — create a separate development environment/service, transfer only runtime settings and current image digest, preserve hardening and DB access.
- [x] Pi development app — verify candidate health, retain rollback state, then hand loopback port 3002 to Coolify.
- [x] `scripts/deploy/` — implement immutable, ownership-checked, stale-head guarded release deployment with evidence from the new container's successful health check.
- [x] `.github/workflows/test.yml` — deploy only successful develop pushes after image publication; configure scoped CI variables and a dedicated token.
- [x] Compose files — make legacy app/Watchtower startup explicit opt-in; update live Compose configuration without recreating existing data services.
- [x] `docs/raspberry-pi-deployments.md`, rollback/runbook — explain Coolify env management, release gating, rollback, and paused updates for other apps.
- [x] Focused tests, workflow/Compose checks, independent reviews, healthy live cutover and a reviewable development-targeted PR.

**Acceptance Criteria:**

- Given the migrated service, when local port 3002 is requested, then the app/database are healthy and its image matches the preserved release.
- Given another application, when migration finishes, then its running container identity and health are preserved.
- Given a successful new develop publication, when the deployment hook runs, then the exact digest becomes healthy before Actions succeeds.
- Given an older head or foreign resource, when the hook runs, then it makes no unsafe mutation.
- Given a Coolify runtime override, when the next image deploys, then that override remains effective.
- Given a Pi restart or normal Compose startup, then Watchtower does not automatically resume.

## Spec Change Log

- 2026-10-18: User explicitly requested development migration and selected “Stop Watchtower across the Pi.” This supersedes the earlier preview-only boundary for the development app and global image updater; production/data services remain outside this migration.
- Pinned Coolify 4.4.6 Docker Image applications cannot preserve `no-new-privileges` and `/tmp` tmpfs through supported run options. Use its Compose service manager to preserve the existing runtime contract. CI completion must use fresh container health evidence rather than cached service status.

## Design Notes

Use a dedicated environment so imported development credentials cannot overwrite the previews configuration. The existing Cloudflare route stays on 3002; deployments have a brief restart interval because that loopback port is exclusive. Current develop CI is blocked by a flaky mobile picker browser case, so the initial migration preserves the running image instead of bypassing its release gate.

## Verification

Watchtower is stopped with restart policy `no`. Coolify service
`qsmph7hpjlumn8v3etrvftze`, environment `rpekuukdqxaeqvrgxvmrtcvr`, is healthy on
loopback 3002 with the original image ID/digest and matching runtime data/auth
settings. The no-port candidate passed fresh health proof before cutover; the
retained legacy app is stopped with restart `no`. Live Compose profiles validate
without recreating data services. Dedicated Actions variables/token are saved.

Focused deployment tests: 28 pass, 135 assertions. Actionlint, script ESLint,
Compose generation and diff checks pass. The full production build passes through
`bun run ci:build` with an isolated synthetic CI database. The live hook passed
again after review fixes using two fresh timestamped probes. Runtime settings,
image identity, hardening and loopback binding remained correct; production,
portfolio, database and gateway container identities were preserved. The public
development domain retains its Cloudflare Access redirect.

Both independent reviews found the same two implementation issues: a stale-head
skip after restart dispatch could hide failure, and a one-time log marker could
be evicted. Both were patched, with regression coverage. Both reviewers report
no remaining findings. Delivery targets `develop`; workflow activation awaits
an approved merge into that branch. This migration does not merge PR #214.

## Suggested Review Order

**Release boundary**

- Follow the CI-gated develop deployment entry point.
  [test.yml:312](../.github/workflows/test.yml#L312)
- Verify ownership and branch guards before modifying the service.
  [development.mjs:37](../scripts/deploy/development.mjs#L37)
- Check fresh health evidence and truthful outcomes after restart dispatch.
  [development.mjs:76](../scripts/deploy/development.mjs#L76)

**Runtime and recovery**

- Preserve private networking, runtime settings and container hardening.
  [compose.mjs:30](../scripts/deploy/compose.mjs#L30)
- Keep the legacy application and global updater opt-in only.
  [docker-compose.development.yml:2](../docker-compose.development.yml#L2)
  [docker-compose.production.yml:78](../docker-compose.production.yml#L78)
- Review environment management and the rollback procedure.
  [raspberry-pi-deployments.md:25](raspberry-pi-deployments.md#L25)
  [raspberry-pi-rollback.md:8](raspberry-pi-rollback.md#L8)
- Inspect deployment failure and readiness regressions.
  [development.test.mjs:1](../scripts/deploy/development.test.mjs#L1)
