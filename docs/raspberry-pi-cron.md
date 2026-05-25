# Raspberry Pi Cron Reliability

Cron jobs run locally on the Pi:

- Production: `127.0.0.1:3000`
- Development: `127.0.0.1:3002`

They do not need to be public Cloudflare requests.

## Jobs

- Daily word generation: `/api/generate-daily-words`
- View count aggregation: `/api/update-view-counts`

Both endpoints require:

```http
Authorization: Bearer <CRON_SECRET>
```

`CRON_SECRET` must be set separately in:

- `.env.production.pi`
- `.env.development.pi`

Do not keep `CRON_SECRET` or `DEV_CRON_SECRET` directly in crontab. The script
reads the secret from the selected env file.

## Install Script

From the repo on the Pi:

```bash
cd ~/development/Turkce-Sozluk
chmod +x scripts/pi-cron-request.sh
```

The script:

- reads `CRON_SECRET` from the selected env file
- calls the local cron endpoint
- retries transient curl failures
- writes timestamped logs under `/var/log/turkish-dictionary`
- writes last-success marker files under `/var/lib/turkish-dictionary/cron`
- optionally pings Uptime Kuma push monitors

## Manual Test Production

Daily word:

```bash
sudo ./scripts/pi-cron-request.sh \
  .env.production.pi \
  http://127.0.0.1:3000 \
  generate-daily-words \
  /api/generate-daily-words
```

View counts:

```bash
sudo ./scripts/pi-cron-request.sh \
  .env.production.pi \
  http://127.0.0.1:3000 \
  update-view-counts \
  /api/update-view-counts
```

## Manual Test Development

Daily word:

```bash
sudo ./scripts/pi-cron-request.sh \
  .env.development.pi \
  http://127.0.0.1:3002 \
  development-generate-daily-words \
  /api/generate-daily-words
```

View counts:

```bash
sudo ./scripts/pi-cron-request.sh \
  .env.development.pi \
  http://127.0.0.1:3002 \
  development-update-view-counts \
  /api/update-view-counts
```

Check logs:

```bash
sudo tail -n 100 /var/log/turkish-dictionary/generate-daily-words.log
sudo tail -n 100 /var/log/turkish-dictionary/update-view-counts.log
sudo tail -n 100 /var/log/turkish-dictionary/development-generate-daily-words.log
sudo tail -n 100 /var/log/turkish-dictionary/development-update-view-counts.log
```

Check last successful run markers:

```bash
sudo cat /var/lib/turkish-dictionary/cron/generate-daily-words.last_success
sudo cat /var/lib/turkish-dictionary/cron/update-view-counts.last_success
sudo cat /var/lib/turkish-dictionary/cron/development-generate-daily-words.last_success
sudo cat /var/lib/turkish-dictionary/cron/development-update-view-counts.last_success
```

## Crontab

Edit root crontab:

```bash
sudo crontab -e
```

Replace the old direct `curl` crons with this script-based schedule:

```cron
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

5 0 * * * cd /home/furki/development/Turkce-Sozluk && ./scripts/pi-cron-request.sh .env.production.pi http://127.0.0.1:3000 generate-daily-words /api/generate-daily-words
10 5 * * * cd /home/furki/development/Turkce-Sozluk && ./scripts/pi-cron-request.sh .env.production.pi http://127.0.0.1:3000 update-view-counts /api/update-view-counts

15 0 * * * cd /home/furki/development/Turkce-Sozluk && ./scripts/pi-cron-request.sh .env.development.pi http://127.0.0.1:3002 development-generate-daily-words /api/generate-daily-words
15 5 * * * cd /home/furki/development/Turkce-Sozluk && ./scripts/pi-cron-request.sh .env.development.pi http://127.0.0.1:3002 development-update-view-counts /api/update-view-counts
```

Use root crontab so logs and state markers can be written without permission
issues.

## Uptime Kuma Push Monitors

For each cron job, create a Uptime Kuma monitor:

- Monitor Type: `Push`
- Name examples:
  - `Production generate daily words cron`
  - `Production update view counts cron`
  - `Development generate daily words cron`
  - `Development update view counts cron`
- Heartbeat Interval: `24 hours`
- Retries: `1`
- Resend notification every: your preference

Copy the push URL from Uptime Kuma and append it as the last argument in the
crontab entry. The final crontab should look like this after replacing each
`<...-push-url>` placeholder with the matching Uptime Kuma push URL:

```cron
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

5 0 * * * cd /home/furki/development/Turkce-Sozluk && ./scripts/pi-cron-request.sh .env.production.pi http://127.0.0.1:3000 generate-daily-words /api/generate-daily-words "<production-generate-daily-words-push-url>"
10 5 * * * cd /home/furki/development/Turkce-Sozluk && ./scripts/pi-cron-request.sh .env.production.pi http://127.0.0.1:3000 update-view-counts /api/update-view-counts "<production-update-view-counts-push-url>"

15 0 * * * cd /home/furki/development/Turkce-Sozluk && ./scripts/pi-cron-request.sh .env.development.pi http://127.0.0.1:3002 development-generate-daily-words /api/generate-daily-words "<development-generate-daily-words-push-url>"
15 5 * * * cd /home/furki/development/Turkce-Sozluk && ./scripts/pi-cron-request.sh .env.development.pi http://127.0.0.1:3002 development-update-view-counts /api/update-view-counts "<development-update-view-counts-push-url>"
```

If a job fails, the script sends a down push. If the job does not run at all,
Uptime Kuma marks the push monitor down after the heartbeat window.

## Troubleshooting

401:

- the selected env file has the wrong `CRON_SECRET`
- the endpoint container was not restarted after changing the env file
- shell quoting changed the secret

500:

- check app logs in Dozzle
- check local app logs:

```bash
sudo docker compose --env-file .env.production.pi -f docker-compose.production.yml logs --tail=200 app-production
sudo docker compose --env-file .env.development.pi -f docker-compose.development.yml logs --tail=200 app-development
```

Connection refused:

- production app is not listening on `127.0.0.1:3000`
- development app is not listening on `127.0.0.1:3002`
- container is restarting
- Cloudflare is irrelevant for this check because cron calls the local app

## Verification Commands

```bash
sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3002/api/health
sudo tail -n 100 /var/log/turkish-dictionary/generate-daily-words.log
sudo tail -n 100 /var/log/turkish-dictionary/update-view-counts.log
sudo tail -n 100 /var/log/turkish-dictionary/development-generate-daily-words.log
sudo tail -n 100 /var/log/turkish-dictionary/development-update-view-counts.log
sudo ls -l /var/lib/turkish-dictionary/cron
```
