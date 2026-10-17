---
title: Coolify branch previews on the Raspberry Pi
type: feature
created: 2026-10-17
status: done
baseline_commit: f87aafdc24558fdd716be7825f1932b225704e05
review_loop_iteration: 0
context:
  - AGENTS.md
  - docs/raspberry-pi-deployments.md
  - docs/ci.md
---

<frozen-after-approval reason="human-owned intent">

## Intent

**Problem:** Pushing a feature branch does not currently provide a separately deployed dictionary app with a predictable URL. Reviewing a branch should not require replacing development or production.

**Approach:** Install Coolify on the existing Raspberry Pi and add a GitHub Actions workflow that builds ARM64 images outside the Pi, creates or updates one preview per feature branch, and deletes its resources when the branch is deleted. Use a readable project and branch slug with a collision-resistant suffix in the hostname.

## Boundaries & Constraints

**Always:** Keep existing production/development services, image tags, cron jobs, and tunnel routes working. Install Coolify in its own directory and Docker network. Use the existing Cloudflare Tunnel for public HTTPS. Keep database ports private. Use the shared development database through a private gateway, without deployment-time schema changes or fixture imports. Preview writes intentionally affect development data. Keep runtime variables editable in Coolify, preserving saved overrides across deployments and using shared preview-scoped settings for common values. Build public Next.js URLs into each image. Preserve authentication origin checks. Record installation and rollback without checking in secrets. Use the GitHub account email for the Coolify administrator and a private initial password. Restrict deployment triggers to branches in this repository.

**Ask First:** Migrating an existing production service into Coolify, deleting existing data, changing the main/develop release behavior, purchasing a domain or paid service, or changing an established account credential.

**Never:** Expose a database publicly, reuse production credentials in previews, deploy public fork pull requests, change DNS records for existing services, or print secret values in logs. Do not merge the workflow branch without a separate instruction.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| First push | New feature branch | Separate Coolify resource, shared development data, HTTPS URL | Failed deployment fails Actions with useful diagnostics |
| Later push | Existing preview branch | Same URL serves the new commit | Never replace another branch or an existing release |
| Concurrent pushes | Older and newer runs overlap | Only the latest branch head deploys | Serialize lifecycle changes and reject stale heads |
| Hostname collisions | Slashes, Unicode, long names, similar slugs | Valid distinct stable DNS labels | Deterministic hash suffix and length bound |
| Branch deletion | Existing preview | Remove only its containers and UUID network; retain development database/gateway | Missing resources count as successful cleanup |
| Runtime configuration | Saved branch override or shared reference | Survives later deployments; applied by redeploy | Missing required database shared keys fail before mutation |
| Protected branches | main or develop | Existing publishing workflow continues | Preview workflow skips these branches |
| Missing config | Coolify/API/registry unavailable | Action fails without exposing tokens | No fallback to production resources |

</frozen-after-approval>

## Code Map

- `.github/workflows/test.yml` — existing protected branch CI and ARM64 release publishing.
- `Dockerfile` — existing standalone Next.js runtime and public build arguments.
- `scripts/ci/` — existing disposable PostgreSQL schema and synthetic fixtures.
- `src/env.mjs`, `src/lib/auth.ts` — runtime validation and authentication origins.
- `docs/raspberry-pi-deployments.md` — current ports and Cloudflare routing.
- Pi `/etc/cloudflared/config.yml` — existing named tunnel routes; append preview routing before its catch-all.
- Pi `/data/coolify/` — new management service, database, SSH key, and proxy configuration.

## Tasks & Acceptance

**Execution:**
- [x] Pi `/data/coolify/source/` — install a pinned current release with private management ports, persistent storage, and an initial administrator; verify host connection and proxy.
- [x] Pi `/etc/cloudflared/config.yml` and Cloudflare DNS — add `coolify.furkan-cengiz.com` and wildcard preview routing without replacing existing hostnames; validate configuration and back it up first.
- [x] `scripts/preview/` — implement deterministic naming and Coolify create/update/delete lifecycle with precise ownership checks, stale-head protection, safe diagnostics, and preview-only database configuration.
- [x] `.github/workflows/preview.yml` — build ARM64 app images in Actions, deploy after successful isolated CI checks, and clean up deleted branches; configure GitHub secrets and variables.
- [x] `scripts/preview/` tests — cover lifecycle decisions, naming boundaries, stale heads, failure handling, and cleanup ownership.
- [x] `docs/coolify-previews.md` — document dashboard access, URL naming, administrator credential retrieval, lifecycle, limitations, and recovery.
- [x] Workflow branch — publish a reviewable branch/PR and verify a real preview deployment, repeat push, and disposable cleanup where permitted without merging.
- [x] `scripts/preview/development-gateway.*`, `compose.mjs`, workflow, and runbook — connect previews privately to development, preserve Coolify runtime/shared settings, and verify data access, configuration persistence, and shared-resource retention during cleanup.

**Acceptance Criteria:**
- Given the configured Pi and repository, when a feature branch is pushed, then its HTTPS URL renders that branch and reports healthy application/database status.
- Given an existing preview, when a subsequent commit is pushed, then the URL stays stable and its deployed revision changes to the current head.
- Given the working installation, when main/develop health endpoints are checked, then both remain healthy and their containers retain their previous configuration.
- Given a deleted feature branch, when cleanup completes, then its preview resources are absent and other applications are intact.
- Given shared development configuration, when a preview starts, then it reads development data without deploying its own database or running migrations.
- Given a runtime variable edited in Coolify, when the workflow redeploys, then the saved value or shared reference remains effective.

## Spec Change Log

- User steering on 2026-10-17: replace the synthetic preview database with the existing development database and make environments manageable in Coolify. This explicitly supersedes the original isolated-data constraint. Keep production credentials excluded, existing containers intact, private ports, branch-specific auth defaults, ownership/stale-head guards, and scoped cleanup. A separately managed gateway exposes only development PgBouncer to preview code; its external network survives branch deletion. Required database values live in Coolify's previews-scoped shared variables. CI remains isolated from development data.

- User steering: move the dashboard and all branch preview hostnames to `furkan-cengiz.com`; preserve the dictionary's existing production domains and asset origin.

- Review patches: use only Coolify's automatically owned resource network so branch cleanup does not leak Compose networks; retain metadata when a server is unavailable and distinguish queued cleanup from completed runtime removal; retain pending lifecycle jobs with GitHub's maximum queue. Preserve URL identity, ownership checks, isolated credentials, and existing release channels.

- Live API correction: Coolify 4.4.6's outer create validator rejects `connect_to_docker_network` despite its inner Compose validator allowing it. Omit that field on creation, where the server defaults it to `false`; explicitly retain `false` on updates. Verified the deployed containers join only their resource network.

## Design Notes

Use first-level hostnames such as `dictionary-feature-search-a1b2c3d4.furkan-cengiz.com` so ordinary domain certificates cover the previews. Coolify's own PR-number preview templates do not provide arbitrary branch creation and naming; the Actions lifecycle owns that mapping. The dashboard is `coolify.furkan-cengiz.com`. Existing services continue using their direct tunnel routes. Preview data is shared development data; preview access and writes have the same data scope as development. Production credentials remain excluded.

## Verification

- Focused Bun tests and workflow/YAML validation pass.
- `bun run build` passes with the repository's disposable build environment; report any environmental blocker explicitly.
- Coolify's own health checks and its local SSH connection succeed.
- Public HTTPS preview, locale routes, and `/api/health` respond correctly.
- Existing production/development `/api/health` endpoints remain healthy after installation and tunnel routing changes.

Local validation: production build through `bun run ci:build` passed; lint passed; 103 Jest suites and 645 tests passed (one suite and 15 tests skipped). Focused lifecycle tests pass. Current GitHub queue syntax is verified against GitHub documentation; actionlint's older schema is checked using a temporary copy removing only the two queue declarations.

Before the shared-development change, live verification completed at `94202065`: GitHub CI and the full preview workflow passed, including all 186 browser cases and ARM64 image publishing. The preview updated from `d17f97d` to `94202065` at the same HTTPS URL and Coolify UUID. App/database health, revision/noindex headers, and Turkish/English search for the synthetic `kitap` entry passed.

The disposable `codex/coolify-cleanup-trial` branch passed its complete deployment workflow. After deleting that branch, the same lifecycle controller queued cleanup; direct Pi inspection confirmed all three containers and the resource network were absent. The implementation preview remained healthy. Production/development retained container IDs `3f90a803375d` / `5e5d64c23fb7`, and both health endpoints reported app/database `ok` afterward. Automatic delete events and manual dispatch still require the workflow on the default branch; the approved merge boundary remains in effect.

Two follow-up reviews of `94202065` found no actionable correctness, security, or edge-case findings. Evidence: [preview update](https://github.com/4Furki4/Turkce-Sozluk/actions/runs/39045279491), [CI](https://github.com/4Furki4/Turkce-Sozluk/actions/runs/39045283023), and [disposable deployment](https://github.com/4Furki4/Turkce-Sozluk/actions/runs/39045334381).

Shared-development update verification on 2026-10-17:

- The current lifecycle redeployed the existing `94202065` app image with the new runtime configuration. Public health reports database `ok`; real development lookup `ev` succeeds. The app joins only its resource network and the private gateway network, with no published ports. Runtime credentials match development, and the database hostname is the gateway alias.
- A temporary shared environment value referenced by a branch variable survived lifecycle Compose regeneration and redeployment. Both test entries were then removed and the app redeployed; the temporary variable is absent at runtime.
- A task-only idle service on the shared network was created for an absent branch and removed through the actual deletion lifecycle. Pi inspection confirmed its container and UUID network were removed, while the existing gateway container and shared internal network remained. Coolify's asynchronous cleanup required waiting beyond the API response.
- The retired fixture database container and its obsolete Coolify service-part entry were removed. Production/development retained container IDs `3f90a803375d` / `5e5d64c23fb7`; both local health endpoints still report app/database `ok`. No shared database schema changes or data imports ran.
- The production build through `bun run ci:build`, lint, gateway Compose validation, and actionlint passed. The final focused suite passes 25 tests with 138 assertions. CI used and then removed its own disposable database.
- Independent correctness and edge-case reviews found two patch issues: shared Upstash defaults were omitted and the runbook retained a synthetic-data claim. Both were corrected and rechecked without remaining findings. Workflow validation for the next pushed commit remains separate from these local and operator deployment checks.

## Suggested Review Order

- Follow feature pushes through validation, ARM64 publishing, deployment, and branch cleanup.
  [preview.yml:1](../.github/workflows/preview.yml#L1)
- Inspect ownership and fresh-head checks at each lifecycle mutation.
  [lifecycle.mjs:20](../scripts/preview/lifecycle.mjs#L20)
- Check shared runtime references, branch auth defaults, resource limits, and proxy headers.
  [compose.mjs:6](../scripts/preview/compose.mjs#L6)
- Check the private development gateway and network boundary.
  [development-gateway.compose.yml:1](../scripts/preview/development-gateway.compose.yml#L1)
- Review URL naming and collision-resistant branch identity.
  [identity.mjs:5](../scripts/preview/identity.mjs#L5)
- Check failure, ownership, stale-head, and cleanup edge cases.
  [preview.test.mjs:1](../scripts/preview/preview.test.mjs#L1)
- Read operational limits and recovery procedures.
  [coolify-previews.md:1](coolify-previews.md#L1)
