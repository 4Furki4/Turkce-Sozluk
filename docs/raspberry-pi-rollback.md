# Raspberry Pi Rollback Runbook

Development runs in Coolify; production remains in its original Compose stack.
Watchtower is stopped globally and must stay stopped during recovery. App rollback
does not undo schema or data changes. The legacy development commands below are
an emergency fallback: stop the Coolify service and free port 3002 first.

## Coolify Development Rollback

Open Turkish Dictionary → development → dictionary-development in
[Coolify](https://coolify.furkan-cengiz.com). Preserve its runtime environment and
replace Compose using `developmentCompose` from `scripts/deploy/compose.mjs`, with
the known-good digest and a fresh 64-character hex nonce. For example, from a
checkout of this release:

```bash
node --input-type=module -e '
import {randomBytes} from "node:crypto";
import {developmentCompose} from "./scripts/deploy/compose.mjs";
console.log(JSON.stringify(developmentCompose({digest:process.env.ROLLBACK_DIGEST,
  nonce:randomBytes(32).toString("hex")}), null, 2));
'
```

Set `ROLLBACK_DIGEST=sha256:<known-good-digest>` for this command. Paste its generated
JSON (valid Compose YAML) into the service Compose editor, then redeploy. This
keeps the health command's digest/nonce and its environment consistent. The
generator contains no secrets. A later successful develop push will deploy the
new branch head, so coordinate releases during recovery.

The initial migration preserves digest
`sha256:0a17cea9247e911b294c258f8bae604b749b82dc57a0a25734a1411a62ad8a5c`.
Verify the newly created container image and health, plus local
`http://127.0.0.1:3002/api/health`; the public domain retains Cloudflare Access.
Cached Coolify status alone does not prove a new release.

The original `turkish-dictionary-app-development` container remains stopped with
restart `no`. Private snapshots are under
`/data/coolify/migration-backups/development/` on the Pi and contain secrets;
never print or commit them. If Coolify is unavailable, stop its app container,
verify port 3002 is free, then `sudo docker start turkish-dictionary-app-development`.
After recovery, stop the legacy app before restarting Coolify. If intentionally
keeping the legacy app through a Pi reboot, explicitly restore its restart policy.

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
  docker compose --env-file .env.development.pi -f docker-compose.development.yml --profile legacy-development up -d --no-deps app-development

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
  docker compose --env-file .env.development.pi -f docker-compose.development.yml --profile legacy-development up -d --no-deps app-development
```

Verify:

```bash
curl http://127.0.0.1:3002/api/health
curl -I https://development.turkce-sozluk.com/tr
sudo docker compose --env-file .env.development.pi -f docker-compose.development.yml logs --tail=100 app-development
```

## Resume Normal Development Releases

Keep Watchtower stopped. Push a fix to `develop`; after the workflow is merged,
successful CI publishes and deploys the exact new digest through Coolify.
Production and portfolio releases remain manual until separately migrated.

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

- push a fix to `develop`, letting the gated Coolify workflow deploy it, or
- intentionally redeploy the affected production app with the chosen digest.

## Incident Checklist

- Stop Watchtower.
- Capture container/image/log state.
- Pick a known-good image tag or digest.
- Recreate only the affected app container.
- Verify local health endpoint.
- Verify Cloudflare hostname.
- Check Dozzle/app logs.
- Check Netdata CPU/RAM/disk.
- Leave Watchtower stopped globally.
