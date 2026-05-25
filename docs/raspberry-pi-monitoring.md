# Raspberry Pi Monitoring

This stack adds local monitoring dashboards without exposing them directly to
the LAN or internet.

- Netdata: host, Docker, CPU, RAM, disk, and network metrics
- Dozzle: searchable Docker container logs
- Uptime Kuma: uptime checks and Telegram alerts

## Start Monitoring

Run this on the Pi from the app repo:

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

The dashboards listen only on loopback:

```text
Netdata: http://127.0.0.1:19999
Dozzle:  http://127.0.0.1:9999
```

Verify the bindings:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Expected ports:

```text
netdata   127.0.0.1:19999->19999/tcp
dozzle    127.0.0.1:9999->8080/tcp
```

## Cloudflare Tunnel Routes

Add these rules to `/etc/cloudflared/config.yml` before the final
`http_status:404` fallback:

```yaml
  - hostname: netdata.turkce-sozluk.com
    service: http://localhost:19999

  - hostname: logs.turkce-sozluk.com
    service: http://localhost:9999
```

Restart the tunnel after editing:

```bash
sudo systemctl restart cloudflared
sudo journalctl -u cloudflared -f
```

## Cloudflare Access

Protect both monitoring hostnames with Cloudflare Access:

```text
netdata.turkce-sozluk.com
logs.turkce-sozluk.com
```

Use the same email allow policy you use for development access. Do not make
these dashboards public.

Unauthenticated checks should redirect to Cloudflare Access:

```bash
curl -I https://netdata.turkce-sozluk.com
curl -I https://logs.turkce-sozluk.com
```

## Uptime Kuma Alerts

Keep Uptime Kuma as the alerting source. Add monitors for:

- `https://turkce-sozluk.com/api/health`
- `https://turkce-sozluk.com/tr`
- `https://www.turkce-sozluk.com/tr`

For development health, use one of these patterns:

- Public path check: monitor `https://development.turkce-sozluk.com/api/health`
  and accept the Cloudflare Access redirect status if you only want to know the
  tunnel and Access app are reachable.
- Real app health check: create a Cloudflare Access service token and configure
  the Uptime Kuma monitor with these headers:

```text
CF-Access-Client-Id: your-client-id
CF-Access-Client-Secret: your-client-secret
```

With the service-token headers, the monitor should expect `200`.

Attach a Telegram notification channel to the production health monitor at
minimum.

Recommended Telegram setup:

1. Create a Telegram bot with `@BotFather`.
2. Send a message to the bot from your account.
3. In Uptime Kuma, add a Telegram notification channel with the bot token and
   your chat ID.
4. Click `Test` and verify the message arrives.
5. Attach the notification to the production health monitor.

Test alerts safely by creating a temporary monitor for a bad URL, waiting for
the Telegram down alert, then deleting the temporary monitor after the recovery
alert is confirmed.

## Security Notes

Dozzle and Netdata both read from `/var/run/docker.sock`. Netdata also has host
mounts for metrics. This is acceptable only because their HTTP ports are bound
to `127.0.0.1` and public access is gated by Cloudflare Access.

Watchtower is label-scoped, and these monitoring containers are explicitly
unlabeled for automatic updates.
