# Raspberry Pi Deployments

Development runs as the `dictionary-development` Compose service in
[Coolify](https://coolify.furkan-cengiz.com), under Turkish Dictionary → development.
Production and portfolio apps retain their existing stacks. Watchtower is stopped
globally with restart disabled; those apps keep their current images until an
explicit deployment.

## Channels

- Production: `main` branch -> `furki4/turkish-dictionary-app:latest`
- Development: `develop` branch -> CI-gated ARM64 image -> Coolify, pinned by digest

After this workflow change reaches `develop`, a same-repository push must pass
lint, unit tests, production build and browser tests before image publication and
deployment. The final build job sends the published digest to Coolify and waits
for fresh application/database health evidence. Runs superseded before dispatch
skip deployment; dispatched releases always finish health verification. Main and
pull request runs do not trigger the development deployment hook.

Readiness requires two fresh successful probes observed separately, at least
eight seconds apart. Repeated markers survive ordinary log bursts; proof expires
after 30 seconds. Keep the Pi and runner clocks synchronized. Failed readiness
fails Actions and requires inspecting the service or following the rollback runbook.

The service retains init, no-new-privileges, dropped capabilities, `/tmp` tmpfs,
bounded logs and the existing `turkce-sozluk_default` network. Its database and
PgBouncer remain in the original stack without published ports. Deployment has a
brief restart interval because port 3002 belongs to one container at a time.

## Coolify development configuration

GitHub repository variables are `COOLIFY_URL`, `COOLIFY_PROJECT_UUID`,
`COOLIFY_DEVELOPMENT_ENVIRONMENT_UUID` and `COOLIFY_DEVELOPMENT_SERVICE_UUID`.
The separate secret `COOLIFY_DEVELOPMENT_TOKEN` has Coolify team permissions
`read`, `read:sensitive`, `write`, `deploy`. Sensitive read is needed for private
readiness logs. Coolify scopes the token to the team, not one service; the script
also verifies project/environment membership, UUID/name, ownership description and
the current develop head before mutations. Keep the ownership description intact.

Edit runtime settings in **dictionary-development → Environment Variables**, then
redeploy. The initial settings were copied privately from the existing development
container. Future Actions deployments update Compose/image identity and preserve
saved runtime values. Use literal values for secrets containing `$`; exclude
registry credentials and `POSTGRES_*` database bootstrap values from the app.
Development continues to use `pgbouncer-development:5432` and its existing database.

The generated Compose owns `NODE_ENV`, `HOSTNAME`, `PORT`, deployment identity and
`BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_URL`. All three URL fields
stay `https://development.turkce-sozluk.com`. Other runtime values are managed in
the service editor. Preview settings remain in their separate Coolify environment;
editing development settings does not automatically update previews.

## Branch previews

Feature branches deploy through GitHub Actions and
[Coolify](https://coolify.furkan-cengiz.com), using a separate app for each branch
and sharing the existing development database through a private
gateway. Preview writes affect development data. URLs use
`dictionary-<branch>-<hash>.furkan-cengiz.com`.

See [the preview runbook](coolify-previews.md) for setup, credentials, cleanup,
resource limits, and recovery. The workflow must reach the default branch before
GitHub activates automatic branch-deletion cleanup and manual dispatch.

## Environment Files

Production and the development data services still use these Pi files:

```bash
cp .env.production.pi.example .env.production.pi
cp .env.development.pi.example .env.development.pi
```

Keep the production and development Postgres passwords different.

Runtime env files are not enough for `NEXT_PUBLIC_*` variables. Next.js embeds
public variables into browser JavaScript during `next build`, so GitHub Actions
must also receive them while building the Docker image.

Required GitHub secret:

- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`

Optional GitHub variable:

- `NEXT_PUBLIC_PATREON_URL`

## Start Development Data Services

```bash
docker compose --env-file .env.development.pi -f docker-compose.development.yml up -d
```

This starts only PostgreSQL and PgBouncer. Coolify manages the development app on
`127.0.0.1:3002`; use Coolify for its logs, restart and redeployment. The legacy app
is behind profile `legacy-development` and must not run while Coolify owns 3002.

## Start Production

```bash
docker compose --env-file .env.production.pi -f docker-compose.production.yml up -d
```

Production listens on the Pi at `127.0.0.1:3000`.

## Cloudflare Tunnel Routes

Configure `/etc/cloudflared/config.yml` with separate hostnames:

```yaml
ingress:
  - hostname: turkce-sozluk.com
    service: http://localhost:3000

  - hostname: www.turkce-sozluk.com
    service: http://localhost:3000

  - hostname: development.turkce-sozluk.com
    service: http://localhost:3002

  - hostname: netdata.turkce-sozluk.com
    service: http://localhost:19999

  - hostname: logs.turkce-sozluk.com
    service: http://localhost:9999

  - service: http_status:404
```

Apply Cloudflare Access to `development.turkce-sozluk.com`,
`netdata.turkce-sozluk.com`, and `logs.turkce-sozluk.com`.

See `docs/agent-discovery-dns.md` for the public DNS-AID SVCB records used by
agent discovery scanners.

## Monitoring

Monitoring runs as a separate stack:

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

See `docs/raspberry-pi-monitoring.md` for Netdata, Dozzle, Cloudflare Access,
and Uptime Kuma alert setup.

## Cron

Production cron jobs run locally against `127.0.0.1:3000` and write logs plus
last-success markers.

See `docs/raspberry-pi-cron.md` for install, test, crontab, and Uptime Kuma push
monitor setup.

## Watchtower

Watchtower is stopped across the Pi with restart policy `no`. Its Compose service
has profile `legacy-watchtower` and restart `no`, so normal Compose startup does
not resume it. Do not start it during normal releases or recovery: it also updates
production and portfolio apps. Publishing `latest` alone no longer deploys
production; intentionally recreate only the affected app for a manual release.

## Rollback

If a bad image is deployed, stop Watchtower before changing the app container so
it does not immediately pull the bad floating tag again.

See `docs/raspberry-pi-rollback.md` for the production and development rollback
commands.
