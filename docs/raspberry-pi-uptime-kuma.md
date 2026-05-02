# Raspberry Pi uptime monitoring with Uptime Kuma

This app exposes `GET /api/health` for Uptime Kuma.

Use `durum.turkce-sozluk.com` as the public Uptime Kuma status page if your root domain is `turkce-sozluk.com`. If your real domain has a different TLD, keep the same pattern and change only the domain, for example `durum.turkce-sozluk.com.tr`.

The endpoint returns:

- `200` when Next.js is reachable and Postgres responds to `select 1`
- `503` when Next.js responds but the database check fails

## Run Uptime Kuma on the Pi

Install Docker on the Raspberry Pi, then create a folder for Kuma:

```bash
mkdir -p ~/uptime-kuma
cd ~/uptime-kuma
```

Create `docker-compose.yml`:

```yaml
services:
  uptime-kuma:
    image: louislam/uptime-kuma:2
    container_name: uptime-kuma
    restart: always
    ports:
      - "3001:3001"
    volumes:
      - uptime-kuma:/app/data

volumes:
  uptime-kuma:
```

Start it:

```bash
docker compose up -d
```

Open Kuma from your LAN:

```text
http://raspberry-pi.local:3001
```

If mDNS does not resolve, use the Pi's IP address:

```bash
hostname -I
```

## Add this app as a monitor

In Uptime Kuma:

1. Add New Monitor
2. Monitor Type: `HTTP(s)`
3. Friendly Name: `Turkish Dictionary`
4. URL: `https://turkce-sozluk.com/api/health`
5. Method: `GET`
6. Heartbeat Interval: `60`
7. Retries: `3`
8. Accepted Status Codes: `200-299`

Use the public domain, not `localhost`, even if the app runs on the same Pi. This verifies the real public path through DNS, networking, reverse proxy, Next.js, and Postgres.

## Publish `durum` through Cloudflare Tunnel

Yes, use your existing Cloudflare Tunnel pattern for this.

Recommended layout:

- `turkce-sozluk.com` points to the web app
- `durum.turkce-sozluk.com` points to Uptime Kuma's public status page
- optional `kuma-admin.turkce-sozluk.com` points to the Kuma dashboard and is protected by Cloudflare Access

In Cloudflare Zero Trust:

1. Go to `Networks` -> `Tunnels`
2. Select the tunnel that runs on the Raspberry Pi
3. Open `Public Hostnames`
4. Add a public hostname
5. Subdomain: `durum`
6. Domain: `turkce-sozluk.com`
7. Type: `HTTP`
8. URL: `localhost:3001`
9. Save

If `cloudflared` runs on another machine, use the Pi's LAN address instead:

```text
http://192.168.1.50:3001
```

After this, Cloudflare routes:

```text
https://durum.turkce-sozluk.com -> http://localhost:3001
```

If your tunnel is locally managed with a `config.yml`, add an ingress rule like this before the final fallback rule:

```yaml
ingress:
  - hostname: durum.turkce-sozluk.com
    service: http://localhost:3001
  - service: http_status:404
```

## Make `durum` a public status page

In Uptime Kuma:

1. Create a status page
2. Add the `Turkish Dictionary` monitor to it
3. In the status page settings, add the domain name:

```text
durum.turkce-sozluk.com
```

That makes `durum.turkce-sozluk.com` show the public status page instead of being just the admin dashboard URL.

For admin access, prefer a separate hostname such as:

```text
kuma-admin.turkce-sozluk.com
```

Point it to the same service, `http://localhost:3001`, and protect it with Cloudflare Access. Kuma has its own login, but putting the admin dashboard behind Access reduces public attack surface.

## Notifications

Add a notification channel in Uptime Kuma, for example:

- Telegram
- Discord webhook
- Slack webhook
- Email SMTP

Attach the notification to the `Turkish Dictionary` monitor.

## Optional extra monitors

Add these separately if you want to see which layer failed:

- `https://your-domain.com` as a basic public homepage monitor
- `https://turkce-sozluk.com/api/health` as the app plus database monitor
- Local Pi Docker container monitor if the app is hosted on the Pi

The health endpoint is the most important monitor because it catches database failures that a homepage-only check can miss.
