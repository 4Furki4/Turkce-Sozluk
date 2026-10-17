# Branch previews on the Raspberry Pi

Coolify manages disposable feature-branch deployments at
[`coolify.furkan-cengiz.com`](https://coolify.furkan-cengiz.com). Production and
development keep their existing Compose stacks, Watchtower image channels, cron
jobs, databases, and exact Cloudflare Tunnel routes. They are not managed by
Coolify.

## Open a preview

Push a branch other than `main` or `develop`. The **Branch previews** GitHub
Actions workflow checks the branch, builds ARM64 images on GitHub runners, and
creates or updates its service in the dedicated Coolify preview environment.
The final deployment step links to the URL in the Actions run summary.

Push workflows run from the pushed branch. A branch must contain
`.github/workflows/preview.yml` and `scripts/preview/` to participate. After
introducing this workflow, merge or rebase long-lived branches onto the updated
base. If feature branches start from `develop`, include this setup in `develop`
as well. Merely adding the workflow to `main` does not retrofit older branches.

URLs use `dictionary-<readable-branch>-<12-character-hash>.furkan-cengiz.com`.
The hash includes the repository and exact branch name, so names containing
slashes, Unicode, or the same readable slug still receive different URLs. A
later push keeps the URL and replaces its deployed revision.

Deleting the branch queues deletion of that branch's owned Coolify service.
The shared development database and gateway are retained. Missing resources count as successful
cleanup. If the branch exists again, cleanup skips it. Automatic deletion events
use the workflow from the repository's default branch: **this workflow must be
merged into that branch before automatic cleanup becomes active**. A preview
deployment from a draft PR alone does not activate default-branch cleanup.
GitHub also does not generate a delete event when more than three branches are
deleted at once; dispatch cleanup separately for those absent branches.

The workflow has manual **deploy** and **delete** actions. Set `branch` to the
exact branch name; manual deletion refuses a branch that still exists. The
manual workflow must also be present on the default branch before GitHub offers
dispatch. During initial setup, an operator can run the same lifecycle script
from the reviewed checkout with the configured variables in a private shell.

## Administrator access

The initial administrator uses the GitHub account email selected during setup.
The generated initial credential is stored on the Pi in the root-readable file
`/data/coolify/initial-admin.json` (mode `0600`). Retrieve it in your own trusted
terminal:

```bash
ssh -t furkipie 'sudo cat /data/coolify/initial-admin.json'
```

Store that credential in your password manager. The file is an installation
record; it does not automatically follow later password changes. Application
containers and the repository never receive this administrator password.

## Deployment boundaries

Each preview contains the standalone app built with its branch URL and a private
HTTP fixture for the existing Upstash rate-limit protocol. The app has a 768 MiB
limit and the fixture has a 64 MiB limit.

All previews use the **existing development database**, through its PgBouncer
and a private TCP gateway. They see development's full dataset. Writes from a
preview affect development and other previews; they persist after the preview
is removed. Branches must remain compatible with the development schema.
Preview startup and deployment never run migrations, schema push, or fixture
imports against this database. CI checks still use their own disposable database.

Production credentials and production database connectivity are not configured.
Authentication secrets and fixture tokens default to separate branch-derived
values. OAuth, email, uploads, Meilisearch, and reCAPTCHA verification remain
disabled until their runtime values and provider domain settings are configured.
The default Upstash fixture accepts the existing CI sliding-window protocol and
does not enforce real visitor quotas. Set a real Upstash URL/token to use a real
rate limiter. External cron scheduling remains separate from preview deployment.

Cloudflare terminates public HTTPS and forwards matching preview hostnames to
the loopback Coolify HTTP proxy at `127.0.0.1:8088`. The origin sets
`X-Forwarded-Proto: https` and `X-Forwarded-Port: 443` so redirects preserve
standard HTTPS URLs. Coolify routes the app to internal port `3000`; there
are no published preview app or database ports. A response middleware adds
`X-Robots-Tag: noindex, nofollow` and `X-Preview-Commit: <full-commit-sha>`.
Deployment succeeds only when `/api/health` returns HTTP 200 with the expected
commit header and noindex. These preview URLs are publicly reachable and use
shared development data. Preview writes persist after branch deletion.

Coolify adds the resource's UUID network for routing and the fixture. The app
also joins the external `dictionary-preview-development` network. Its database
endpoint is `preview-development-db:5432`, which forwards to development
PgBouncer. The gateway joins the existing application network; preview code does
not join that network. No database or gateway ports are published to the host.
The gateway and external network are shared infrastructure and survive branch
cleanup. Coolify 4.4.6 removes only its resource UUID network during service
cleanup; it does not own the external database network.

## Manage environment variables

For common settings, open **Shared Variables → Environment wide**, select
**Turkish Dictionary → previews**, and edit the values there. The six
`DATABASE_*` entries already point to development through the private gateway.
Keep the URL and separate connection fields consistent when changing credentials;
`localhost` inside an app container cannot reach the Pi's database.

For a branch override, open **Projects → Turkish Dictionary → previews → the
preview service → Configuration → Environment Variables**. Save the value and
**Deploy/redeploy** the service. Runtime edits do not require rebuilding the
image. Existing saved values survive later GitHub deployments: the Compose
template provides initial defaults rather than rewriting those saved variables.
Use the variable editor rather than editing generated Compose directly.

To inherit a common value, set the branch variable to a shared reference:

```dotenv
RESEND_API_KEY={{environment.RESEND_API_KEY}}
RECAPTCHA_SECRET_KEY={{environment.RECAPTCHA_SECRET_KEY}}
```

New previews automatically reference supported shared settings that exist when
they are created, including the Upstash URL/token pair. Authentication and cron
secrets start with separate branch-derived defaults; use a shared reference
explicitly if those must be common. For existing previews, add the shared reference once if the
field currently has a branch-local default. Adding a shared setting does not
overwrite an existing override. After changing a common value, redeploy the
previews that should consume it. Update references before deleting or renaming
a shared key.

Supported runtime fields include database settings, auth/provider secrets,
reCAPTCHA verification, Resend, UploadThing, R2/S3, Meilisearch, Valkey, and
Upstash. Private services other than the database also need suitable private
connectivity; filling in a hostname does not attach the preview to their network.
OAuth callback and reCAPTCHA domain allowlists must accept the preview hostname.
The workflow owns the branch URL, hostname, and container port.

`NEXT_PUBLIC_*` browser values are baked into the Next.js image. Their build
inputs belong in GitHub Actions secrets/variables and the Docker build arguments;
changing them only in Coolify cannot update the browser bundle. Push a commit
after changing build inputs. The workflow generates each branch's public URL;
the public asset origin remains `https://data.turkce-sozluk.com`.

## GitHub configuration

Configure these repository secrets without committing their values:

| Secret | Purpose |
| --- | --- |
| `COOLIFY_TOKEN` | Dedicated Coolify API token with `read`, `write`, and `deploy` abilities |
| `PREVIEW_SECRET` | Independently generated secret of at least 32 characters for branch auth/fixture credentials |
| `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` | Existing Docker Hub image publishing credentials |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Existing public Next.js build configuration |

The Coolify token needs no `root` or `read:sensitive` ability. Store these
nonsecret repository variables:

| Variable | Value or role |
| --- | --- |
| `COOLIFY_URL` | `https://coolify.furkan-cengiz.com` |
| `COOLIFY_PROJECT_UUID` | Dedicated preview project UUID |
| `COOLIFY_ENVIRONMENT_UUID` | Dedicated preview environment UUID |
| `COOLIFY_SERVER_UUID` | Pi server UUID |
| `COOLIFY_DESTINATION_UUID` | Pi Docker destination UUID, required when the server has multiple destinations |
| `PREVIEW_PROJECT` | `dictionary` (default) |
| `PREVIEW_BASE_DOMAIN` | `furkan-cengiz.com` (default) |
| `PREVIEW_IMAGE_REPOSITORY` | `furki4/turkish-dictionary-app` (default) |

Keep this project/environment dedicated to previews; do not add shared
production environment variables there. The default Docker Hub repository must
allow public image pulls. App tags are `preview-<branch-hash>-<full-sha>`.
Database images are no longer built or published. Neither `latest` nor `development` is
modified by this workflow. Registry images are retained after branch deletion
and can be pruned separately by tag prefix when no preview uses them.

The workflow runs only for this repository's branch pushes, branch deletions,
and explicit dispatches. It does not deploy fork pull requests. Lifecycle work
is serialized by repository and exact branch, and the script checks the live
GitHub ref before every create, update, start, and delete decision. An older run
cannot deploy a different current head. A deleted and recreated branch prevents
a queued delete from removing the recreated branch's preview. Like any two
independent APIs, a ref change can occur just after a check; the next serialized
branch event reconciles that state.

Lifecycle jobs use `queue: max` so a late stale deployment does not replace a
pending branch-deletion job. GitHub permits up to 100 pending jobs in that
concurrency group; an overflow or manually cancelled cleanup needs a manual
cleanup run.

Ownership requires both the deterministic preview name and the exact marker
containing repository, branch, identity, and environment UUID. A collision or
modified marker stops automation for manual inspection. Cleanup does not invoke
global Docker pruning. Coolify queues actual container cleanup, so check its
queue and service logs if a removed service leaves containers behind.
Cleanup refuses an unavailable server before removing metadata, preserving the
ability to retry. A successful API request is reported as **cleanup queued**;
the API's immediate metadata removal does not prove Docker cleanup is complete.
If connectivity fails during the request, inspect the Pi's actual containers
before considering the preview removed.

## Installation and recovery

The initial installation pins Coolify **4.4.6** in `/data/coolify/source/`, with
its management port bound to `127.0.0.1:8000`, websocket ports bound to loopback,
and its HTTP proxy bound to `127.0.0.1:8088`. Management uses the `coolify` Docker
network and separate persistent storage. The installation backs up the prior
Cloudflare configuration before adding the dashboard and wildcard preview
ingress rules after all existing exact hostnames. Wildcard DNS points at the
existing named tunnel; existing service DNS records remain authoritative.
The manager's forced daily Docker cleanup is disabled, its disk threshold is
99%, and unused-volume/network pruning is disabled. Workflow cleanup requests
also disable global Docker cleanup; they remove only the owned preview.

The private database gateway lives in `/data/coolify/preview-database-gateway/`.
Its source templates are `scripts/preview/development-gateway.compose.yml` and
`development-gateway.cfg`. It uses a pinned official ARM64 HAProxy image, a
64 MiB memory limit, no host ports, and Docker DNS to follow development
PgBouncer after container recreation. Start it with:

```bash
sudo docker compose -f /data/coolify/preview-database-gateway/development-gateway.compose.yml up -d
```

The external development network name is installation-specific and currently
`turkce-sozluk_default`. Installing the gateway does not recreate existing
containers. Credentials stay in Coolify's encrypted shared-variable store,
outside GitHub and the repository.

For a failed preview, open its Actions run and Coolify service. API failures
report only status codes to avoid printing response bodies containing secrets.
Check image availability, the configured project/environment/destination UUIDs,
database health, Coolify queue status, and the proxy middleware. Redeploy the
current branch after correcting configuration. If the branch was deleted, run
manual cleanup for its exact name. An ownership failure needs inspection before
changing any marker; never bypass it by choosing another service UUID.

To suspend previews, disable the **Branch previews** workflow and stop its
owned services in Coolify. Do not stop the existing production or development
Compose stacks. To remove Coolify, first remove its owned preview services,
then stop the private gateway after all previews have detached from it. Remove
only its `dictionary-preview-development` network; retain the existing
`turkce-sozluk_default` application network and development database.
Then stop only `/data/coolify/source/`'s Compose stack and its `coolify-proxy`.
Remove only the added dashboard/wildcard ingress and DNS records, or restore the
installation backup after checking for later Cloudflare changes. Leave existing
exact ingress routes and DNS records intact. Keep `/data/coolify` until its
management data and administrator credential have been backed up or are no
longer needed.

The API contract is checked against the pinned release's
[service controller](https://github.com/coollabsio/coolify/blob/v4.4.6/app/Http/Controllers/Api/ServicesController.php)
and [routing](https://github.com/coollabsio/coolify/blob/v4.4.6/routes/api.php).
Run `bun test scripts/preview/*.test.mjs` for lifecycle and ownership edge cases. Keep the full repository build/browser checks green before
publishing preview images. GitHub's documented
[`queue: max`](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
is newer than actionlint 1.7.12's schema. Validate all remaining workflow syntax
using a temporary copy with only the two `queue: max` lines removed, and verify
the original workflow through an actual GitHub Actions run. Do not suppress
other validation errors.
