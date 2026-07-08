# Raspberry Pi Deployments

This setup runs production and development as separate Docker Compose stacks on
the same Raspberry Pi.

## Channels

- Production: `main` branch -> `furki4/turkish-dictionary-app:latest`
- Development: `develop` branch -> `furki4/turkish-dictionary-app:development`

## Environment Files

Create these files on the Pi from the examples and fill in real secrets:

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

## Start Development

```bash
docker compose --env-file .env.development.pi -f docker-compose.development.yml up -d
```

Development listens on the Pi at `127.0.0.1:3002`.

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

Watchtower is defined in the production compose file and updates containers with
the `com.centurylinklabs.watchtower.enable=true` label. Both app containers are
labeled, so production follows `latest` and development follows `development`.

Start production first, or start Watchtower explicitly with:

```bash
docker compose --env-file .env.production.pi -f docker-compose.production.yml up -d watchtower
```

## Rollback

If a bad image is deployed, stop Watchtower before changing the app container so
it does not immediately pull the bad floating tag again.

See `docs/raspberry-pi-rollback.md` for the production and development rollback
commands.
