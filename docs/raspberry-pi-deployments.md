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

  - service: http_status:404
```

Apply Cloudflare Access only to `development.turkce-sozluk.com`.

## Watchtower

Watchtower is defined in the production compose file and updates containers with
the `com.centurylinklabs.watchtower.enable=true` label. Both app containers are
labeled, so production follows `latest` and development follows `development`.

Start production first, or start Watchtower explicitly with:

```bash
docker compose --env-file .env.production.pi -f docker-compose.production.yml up -d watchtower
```
