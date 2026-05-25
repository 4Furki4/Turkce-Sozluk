# Raspberry Pi Rollback Runbook

Use this when a bad Docker image reaches the Pi through Watchtower or a manual
deploy. The goal is to stop automatic replacement, pin the app to a known-good
image, verify health, and only then resume normal updates.

## Quick Reference

Production:

```bash
cd ~/development/Turkce-Sozluk

sudo docker stop watchtower-1

sudo env APP_IMAGE=furki4/turkish-dictionary-app:<known-good-tag> \
  docker compose --env-file .env.production.pi -f docker-compose.production.yml up -d app-production

curl http://127.0.0.1:3000/api/health
curl -I https://turkce-sozluk.com/tr
```

Development:

```bash
cd ~/development/Turkce-Sozluk

sudo docker stop watchtower-1

sudo env APP_IMAGE=furki4/turkish-dictionary-app:<known-good-tag> \
  docker compose --env-file .env.development.pi -f docker-compose.development.yml up -d app-development

curl http://127.0.0.1:3002/api/health
curl -I https://development.turkce-sozluk.com/tr
```

Replace `<known-good-tag>` with a versioned CI tag, for example
`main-32fa3a2` or `develop-32fa3a2`. The value is the first 7 characters of
the Git commit SHA from a successful GitHub Actions run.

## Before Rollback

Capture the current state before changing anything:

```bash
cd ~/development/Turkce-Sozluk

sudo docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
sudo docker inspect turkish-dictionary-app-production --format 'production image id={{.Image}}'
sudo docker inspect turkish-dictionary-app-development --format 'development image id={{.Image}}'
sudo docker logs --tail=200 watchtower-1
```

If production is broken, stop Watchtower first so it does not re-apply the bad
floating tag while you are recovering:

```bash
sudo docker stop watchtower-1
```

## Find A Rollback Image

Preferred rollback target order:

1. A known-good immutable Docker digest.
2. A versioned tag from the last successful deployment.
3. A locally cached old image ID, if Watchtower did not remove it.

Check local images:

```bash
sudo docker images furki4/turkish-dictionary-app --digests
```

Check the image currently attached to a container:

```bash
sudo docker inspect turkish-dictionary-app-production \
  --format '{{.Config.Image}} {{.Image}}'
```

If the previous image is not local, use Docker Hub or GitHub Actions to find the
last successful tag from before the bad deploy. CI publishes these tags:

- Production deploys: `latest` and `main-<git-sha>`
- Development deploys: `development` and `develop-<git-sha>`

Examples:

```bash
furki4/turkish-dictionary-app:main-32fa3a2
furki4/turkish-dictionary-app:develop-32fa3a2
```

In GitHub, the short SHA is shown beside the branch name in each Actions run.
You can also find it locally with:

```bash
git log --oneline -10
```

## Roll Back Production

Pin production to a specific image for the rollback run:

```bash
cd ~/development/Turkce-Sozluk

sudo env APP_IMAGE=furki4/turkish-dictionary-app:<known-good-tag> \
  docker compose --env-file .env.production.pi -f docker-compose.production.yml up -d app-production
```

Digest form is better when available:

```bash
sudo env APP_IMAGE='furki4/turkish-dictionary-app@sha256:<known-good-digest>' \
  docker compose --env-file .env.production.pi -f docker-compose.production.yml up -d app-production
```

Verify:

```bash
sudo docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
curl http://127.0.0.1:3000/api/health
curl -I https://turkce-sozluk.com/tr
sudo docker compose --env-file .env.production.pi -f docker-compose.production.yml logs --tail=100 app-production
```

## Roll Back Development

```bash
cd ~/development/Turkce-Sozluk

sudo env APP_IMAGE=furki4/turkish-dictionary-app:<known-good-development-tag> \
  docker compose --env-file .env.development.pi -f docker-compose.development.yml up -d app-development
```

Verify:

```bash
curl http://127.0.0.1:3002/api/health
curl -I https://development.turkce-sozluk.com/tr
sudo docker compose --env-file .env.development.pi -f docker-compose.development.yml logs --tail=100 app-development
```

## Resume Normal Auto-Deploy

Only resume Watchtower after the bad tag has been fixed or moved away from the
bad image.

For production, make sure `latest` points to a good image again. Then:

```bash
cd ~/development/Turkce-Sozluk

sudo docker compose --env-file .env.production.pi -f docker-compose.production.yml up -d watchtower
sudo docker logs --tail=100 watchtower-1
```

If you are intentionally staying pinned to a rollback digest for a while, keep
Watchtower stopped. Otherwise Watchtower may pull the floating tag again.

## Database Rollback

Do not roll back the database unless the bad deploy changed data in a harmful
way. App rollback is usually enough.

If data rollback is required:

1. Stop Watchtower.
2. Stop the affected app container.
3. Restore the selected Restic/Postgres backup into the affected database.
4. Start the app.
5. Verify `/api/health` and a known dictionary query.

Use development for restore drills before touching production data.

## Safer Future Tagging

Floating tags like `latest` and `development` are convenient for Watchtower but
weak for rollback. CI also publishes versioned rollback tags:

- `main-<git-sha>`
- `develop-<git-sha>`

Then each deploy can be rolled back with:

```bash
sudo env APP_IMAGE=furki4/turkish-dictionary-app:main-<previous-git-sha> \
  docker compose --env-file .env.production.pi -f docker-compose.production.yml up -d app-production
```

After rollback, decide whether to:

- push a fix to `main`/`develop`, letting Watchtower deploy it, or
- retag the known-good image as `latest`/`development`.

## Incident Checklist

- Stop Watchtower.
- Capture container/image/log state.
- Pick a known-good image tag or digest.
- Recreate only the affected app container.
- Verify local health endpoint.
- Verify Cloudflare hostname.
- Check Dozzle/app logs.
- Check Netdata CPU/RAM/disk.
- Leave Watchtower stopped until the floating tag is safe again.
