# Raspberry Pi Cron Reliability

Production cron jobs run locally on the Pi against `127.0.0.1:3000`. They do
not need to be public Cloudflare requests.

## Jobs

- Daily word generation: `/api/generate-daily-words`
- View count aggregation: `/api/update-view-counts`

Both endpoints require:

```http
Authorization: Bearer <CRON_SECRET>
```

`CRON_SECRET` must be set in `.env.production.pi`.

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

## Manual Test

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

Check logs:

```bash
sudo tail -n 100 /var/log/turkish-dictionary/generate-daily-words.log
sudo tail -n 100 /var/log/turkish-dictionary/update-view-counts.log
```

Check last successful run markers:

```bash
sudo cat /var/lib/turkish-dictionary/cron/generate-daily-words.last_success
sudo cat /var/lib/turkish-dictionary/cron/update-view-counts.last_success
```

## Crontab

Edit root crontab:

```bash
sudo crontab -e
```

Recommended production schedule:

```cron
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

5 0 * * * cd /home/furki/development/Turkce-Sozluk && ./scripts/pi-cron-request.sh .env.production.pi http://127.0.0.1:3000 generate-daily-words /api/generate-daily-words
10 5 * * * cd /home/furki/development/Turkce-Sozluk && ./scripts/pi-cron-request.sh .env.production.pi http://127.0.0.1:3000 update-view-counts /api/update-view-counts
```

Use root crontab so logs and state markers can be written without permission
issues.

## Uptime Kuma Push Monitors

For each cron job, create a Uptime Kuma monitor:

- Monitor Type: `Push`
- Name: `Production generate daily words cron`
- Heartbeat Interval: `24 hours`
- Retries: `1`
- Resend notification every: your preference

Copy the push URL from Uptime Kuma and append it as the last argument in the
crontab entry:

```cron
5 0 * * * cd /home/furki/development/Turkce-Sozluk && ./scripts/pi-cron-request.sh .env.production.pi http://127.0.0.1:3000 generate-daily-words /api/generate-daily-words "https://durum.turkce-sozluk.com/api/push/<push-token>"
```

Do the same for `update-view-counts`.

If a job fails, the script sends a down push. If the job does not run at all,
Uptime Kuma marks the push monitor down after the heartbeat window.

## Troubleshooting

401:

- `.env.production.pi` has the wrong `CRON_SECRET`
- the endpoint container was not restarted after changing `.env.production.pi`
- shell quoting changed the secret

500:

- check app logs in Dozzle
- check local app logs:

```bash
sudo docker compose --env-file .env.production.pi -f docker-compose.production.yml logs --tail=200 app-production
```

Connection refused:

- production app is not listening on `127.0.0.1:3000`
- container is restarting
- Cloudflare is irrelevant for this check because cron calls the local app

## Verification Commands

```bash
sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
curl http://127.0.0.1:3000/api/health
sudo tail -n 100 /var/log/turkish-dictionary/generate-daily-words.log
sudo tail -n 100 /var/log/turkish-dictionary/update-view-counts.log
sudo ls -l /var/lib/turkish-dictionary/cron
```
