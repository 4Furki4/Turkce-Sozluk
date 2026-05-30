# AGENTS.md

## Project overview

Turkish Dictionary is a full-stack TypeScript app for a modern, community-driven Turkish dictionary.

- Framework: Next.js App Router + React 19
- API: tRPC with TanStack Query and SuperJSON
- Data: PostgreSQL + Drizzle ORM
- Auth: Better Auth with cookie sessions, email OTP, and social providers
- UI: Tailwind CSS v4 + HeroUI + Radix primitives + lucide-react
- i18n: next-intl with Turkish and English routes
- Offline/PWA: Serwist service worker, IndexedDB, generated offline dictionary data
- Search: PostgreSQL queries plus Meilisearch sync/search integration

This repository uses **npm** for package management and targets the versions pinned in `package.json` and `package-lock.json`.

## Repository map

- `src/app/` - Next.js App Router routes, layouts, metadata, API routes, sitemap/robots, service worker
- `src/app/[locale]/` - localized application pages
- `src/_pages/` - page-level client/server UI modules used by App Router pages
- `src/components/` - reusable React components, custom HeroUI wrappers, forms, cards, modals, navigation
- `src/server/api/` - tRPC setup, routers, schemas, and request handlers
- `src/trpc/` - tRPC React/RSC clients and query client wiring
- `src/lib/` - shared app utilities, SEO helpers, auth helpers, offline DB, morphology/game logic, search helpers
- `src/i18n/` - next-intl routing and pathname definitions
- `messages/` - user-facing locale messages for `en` and `tr`
- `db/schema/` - Drizzle table and relation definitions
- `db/index.ts` - Drizzle client and exported schema map
- `drizzle/migrations/` - generated Drizzle SQL migrations and metadata
- `src/scripts/` - seed, offline-data, and Meilisearch scripts
- `scripts/` - deployment/maintenance shell scripts
- `docs/` - operational and feature documentation
- `public/` - static assets and generated PWA artifacts

## First-time local setup

```bash
npm install
cp .env.development.pi.example .env.local
npm run db:push:local
npm run dev
```

Adjust `.env.local` for the local database, auth providers, Upstash, reCAPTCHA, UploadThing, R2, and Meilisearch values needed by the feature you are working on.

## Common commands

```bash
# app
npm run dev
npm run build
npm run start

# quality
npm run lint
npm run test
npm run test:watch

# database
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:push:local
npm run db:migrate:local
npm run studio
npm run studio:local

# data/search/offline
npm run seed:tdk
npm run seed:daily
npm run offline-data:generate
npm run search:sync

# Raspberry Pi deployment helpers
npm run pi:sanitize:development
npm run docker:build-pi:development
npm run docker:build-pi:latest
```

## Agent rules

### Package management

- Use **npm** for dependency installation and normal lifecycle commands.
- `package-lock.json` is the authoritative npm lockfile.
- Do not add `pnpm-lock.yaml`, `yarn.lock`, or other new package-manager lockfiles.
- The repo contains existing npm scripts that invoke `bun` for data scripts; run those through their `npm run ...` script names unless the user asks otherwise.

### Generated files and build artifacts

Do not hand-edit generated or build artifacts unless the user explicitly asks for it.

Generated/build artifacts include:

- `.next/`
- `public/sw*`
- `public/swe-worker*`
- `drizzle/migrations/meta/*`
- generated Drizzle migration SQL under `drizzle/migrations/` unless deliberately reviewing/fixing a migration
- local database dumps/backups such as `turkish_dictionary.dump` or `backups/postgres/`

If a schema or source change requires generated output, change the source first and regenerate with the project command.

### Environment variables

- App env schema lives in `src/env.mjs`; add new app env variables there first.
- Prefer importing `env` from `@/src/env.mjs` in app/server code when the variable belongs to application runtime.
- Direct `process.env` access is acceptable in config files, scripts, and framework integration points that already require it.
- Do not modify `.env*` secrets unless the user explicitly asks.
- Keep checked-in env examples current when adding a required variable.

### Auth and permissions

- Authentication is Better Auth, configured in `src/lib/auth.ts`.
- Client auth helpers live in `src/lib/auth-client.ts`.
- Do not introduce NextAuth or JWT auth flows unless explicitly requested.
- Use tRPC procedure boundaries for access control:
  - `publicProcedure` for unauthenticated reads
  - `protectedProcedure` for signed-in user actions
  - `adminProcedure` for `session.user.role === "admin"` actions
- When adding admin-facing behavior, update both frontend gating and server-side procedure protection.

### tRPC and data flow

- Add new routers under `src/server/api/routers/`.
- Register every new router in `src/server/api/root.ts`.
- Use Zod input schemas for procedures that accept external input.
- Prefer tRPC procedures for internal app reads/writes.
- Use Next.js API routes only for framework or external boundaries such as Better Auth, UploadThing, cron, web push, and service integrations.
- Keep request/contribution workflows aligned with the existing request handlers under `src/server/api/routers/request-handlers/` and `src/server/api/handlers/request-handlers/`.

### Database and schema workflow

- Drizzle schema source lives in `db/schema/*.ts`.
- `db/index.ts` must export new tables/relations in the `schema` object when they need to be available through the shared Drizzle client.
- Migrations are written to `drizzle/migrations/`.
- For schema changes:
  1. Edit the relevant `db/schema/*.ts` file.
  2. Run `npm run db:generate`.
  3. Apply locally with `npm run db:migrate` or `npm run db:migrate:local` as appropriate.
  4. Inspect the generated SQL before finalizing.
- Prefer Drizzle query builders and transactions over raw SQL in application code.

## Frontend conventions

### UI styling

- For every new page or component, use `bg-background/40` for main surfaces and section backgrounds by default so the site-wide red background gradient remains visible.
- Do not replace the shared red background gradient with page-local gradients unless the user explicitly asks for a gradient.
- Use solid or translucent Tailwind background utilities over custom gradient utilities for routine UI surfaces.
- Reuse custom HeroUI wrappers in `src/components/customs/heroui/` before styling raw HeroUI primitives from scratch.
- Keep the established red primary color and neutral background system from `tailwind.config.ts` and `src/app/globals.css`.
- Use `lucide-react` icons for common actions and navigation.
- Preserve reduced-motion and theme behavior from `src/components/customs/provider.tsx`.

### Routing and navigation

- Use localized navigation utilities from `@/src/i18n/routing` for locale-aware links, redirects, pathnames, and router usage.
- Use `useProgressRouter` from `src/hooks/use-progress-router.ts` when imperative client navigation should trigger the progress bar.
- Avoid hard-coded localized URL strings when a route key exists in the i18n routing config.
- When adding or renaming routes, keep both `src/i18n/routing.ts` and `src/i18n/pathnames.ts` in sync.

### i18n

- User-facing copy should go through `messages/en.json` and `messages/tr.json`.
- Keep English and Turkish messages in sync for new UI.
- Turkish is the default locale and the primary indexed locale.

### SEO and canonical routes

- SEO helpers live in `src/lib/seo-utils.ts`.
- `src/proxy.ts` handles canonical redirects and English noindex behavior; do not bypass it casually.
- If you add indexable routes, update sitemap/robots logic and the relevant tests under `src/app/__tests__/`.
- Use `getWordCanonicalPath`, `getWordCanonicalUrl`, and static route helpers instead of reimplementing canonical URL logic.

### Offline and PWA behavior

- Serwist is only enabled for production builds in `next.config.js`.
- Service-worker behavior lives in `src/app/sw.ts`; avoid enabling it for local dev.
- Offline dictionary client/storage logic lives in `src/lib/offline-db.ts`, `src/lib/workers/`, and `src/app/[locale]/offline-dictionary/`.
- Generated offline data is produced by `npm run offline-data:generate` and depends on R2/S3 env vars.

## Backend and domain conventions

### Search

- Primary dictionary search logic lives in `src/server/api/routers/word.ts`, `src/server/api/routers/search.ts`, and `src/lib/search-*`.
- Meilisearch sync is in `src/scripts/sync-meilisearch.ts`.
- Keep offline search helpers and route helpers compatible with both `/en/search` and `/tr/arama`.

### Requests and contributions

- Community edits are represented as requests with status transitions.
- Preserve the existing moderation path: user submits request, admin reviews, handler applies the approved change.
- When adding a request entity type, update the enum/schema, router handlers, display registry, and admin detail UI together.

### Morphology and games

- Morphology code lives in `src/lib/morphology/` and has Jest tests in `src/lib/__tests__/`.
- Game utilities live in `src/lib/game/` and game routes/components under the localized app pages.
- For morphology changes, add or update focused tests before relying on broad UI checks.

## Validation expectations

Default validation for normal code changes:

```bash
npm run build
```

For logic covered by tests, also run:

```bash
npm run test
```

Use narrower checks during iteration when useful, but do not present them as full validation if `npm run build` was not run. If build cannot run because env vars or external services are missing, say that explicitly.

## Good change hygiene

- Make small, surgical edits.
- Read nearby files before introducing a new pattern.
- Follow existing Next.js, tRPC, Drizzle, HeroUI, and next-intl conventions in the touched area.
- Prefer updating existing helpers, schemas, constants, and wrappers over duplicating logic.
- Avoid broad refactors unless requested.
- Do not change deployment, Docker, Pi, or production database behavior unless the task calls for it.
