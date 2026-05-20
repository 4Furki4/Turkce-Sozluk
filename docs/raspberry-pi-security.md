# Raspberry Pi Security Runbook

This deployment is designed to expose the app only through Cloudflare Tunnel.
Do not port-forward SSH, Postgres, PgBouncer, app ports, or Caddy to the public
internet.

## Network

Cloudflare Tunnel should route:

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

Verify local Docker exposure:

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
ss -ltnp
```

The app ports should be bound to `127.0.0.1`; Postgres and PgBouncer should not
publish host ports.

Monitoring dashboards should also be loopback-only:

```text
netdata   127.0.0.1:19999->19999/tcp
dozzle    127.0.0.1:9999->8080/tcp
```

Watchtower is pinned to Docker API `1.40` in Compose so it can talk to newer
Docker daemons that reject old client API versions.

## Monitoring

Use the separate monitoring stack for local metrics and searchable logs:

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

Netdata and Dozzle both read `/var/run/docker.sock`; Netdata also uses host
mounts for metrics. Keep both dashboards behind Cloudflare Access and never
publish their ports on `0.0.0.0`.

## SSH

Keep SSH LAN/VPN-only. Recommended `/etc/ssh/sshd_config.d/hardening.conf`:

```text
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
X11Forwarding no
AllowUsers furki
```

Restart SSH after validating keys in a separate terminal:

```bash
sudo systemctl restart ssh
```

## Firewall

If using UFW, keep defaults strict and allow only LAN services:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.0.0/16 to any port 22 proto tcp
sudo ufw allow from 192.168.0.0/16 to any port 53
sudo ufw enable
sudo ufw status verbose
```

Adjust the LAN CIDR if your network is not `192.168.0.0/16`.

## Secrets

Rotate any secret that was pasted into terminals, logs, screenshots, or chat.
Use simple hex cron secrets to avoid shell parsing issues:

```bash
openssl rand -hex 32
```

Store separate values in `.env.production.pi` and `.env.development.pi`.

## Cron

Call cron endpoints locally only:

```cron
CRON_SECRET=replace-with-production-hex-secret

0 0 * * * curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3000/api/generate-daily-words >/var/log/turkish-dictionary-generate-daily-words.log 2>&1
0 5 * * * curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3000/api/update-view-counts >/var/log/turkish-dictionary-update-view-counts.log 2>&1
```

Test that the right secret returns `200` and a wrong secret returns `401`.

## Backups

Production backups need a consistent `pg_dump`; backing up the live Docker volume
alone is not enough. Your existing `restic-backup.timer` encrypts and uploads
`/home/furki`, `/srv`, and `/var/lib/docker/volumes` to Google Drive, so create
a database dump before restic snapshots `/srv`.

Add this before the `restic ... backup` command in
`/usr/local/sbin/restic-backup.sh`:

```bash
mkdir -p /srv/backups/pre-restic/turkish-dictionary/postgres

cd /home/furki/development/Turkce-Sozluk

docker compose --env-file .env.production.pi -f docker-compose.production.yml exec -T db-production \
  sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --compress=9 --no-owner --no-privileges' \
  > /srv/backups/pre-restic/turkish-dictionary/postgres/production_$(date -u +%Y%m%dT%H%M%SZ).dump
```

That writes a local custom-format PostgreSQL dump under `/srv/backups/pre-restic`,
then restic encrypts and uploads it through your existing
`rclone:gdrive:raspberrypi-backups/furkipie-restic` repository.

Manual test:

```bash
mkdir -p /srv/backups/pre-restic/turkish-dictionary/postgres

cd /home/furki/development/Turkce-Sozluk

docker compose --env-file .env.production.pi -f docker-compose.production.yml exec -T db-production \
  sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --compress=9 --no-owner --no-privileges' \
  > /srv/backups/pre-restic/turkish-dictionary/postgres/production_$(date -u +%Y%m%dT%H%M%SZ).dump
```

## Development Data Sanitization

After restoring a production dump into development, remove user/session/log data:

```bash
CONFIRM_SANITIZE_DEVELOPMENT_DB=yes npm run pi:sanitize:development
docker compose --env-file .env.development.pi -f docker-compose.development.yml restart app-development
```

This keeps dictionary content while removing accounts, sessions, saved words,
search logs, feedback, requests, pronunciations, and other user-linked data.
