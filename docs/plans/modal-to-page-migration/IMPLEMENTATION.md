---
title: Migrate task modals to breadcrumb pages
type: feature
created: 2026-10-16
status: done
baseline_commit: 22d5661612aece085ebb46ef0b021b7356da2f01
review_loop_iteration: 0
context:
  - docs/plans/modal-to-page-migration/PLAN.md
  - docs/plans/modal-to-page-migration/DESIGN.md
  - docs/plans/modal-to-page-migration/EXPERIENCE.md
---

<frozen-after-approval reason="User approved implementation of the migration plan">

## Intent

**Problem:** Forms and detail views in nested overlays are difficult to navigate and fragile on mobile. Their state often depends on the originating component.

**Approach:** Implement the approved PLAN inventory as independent localized task pages with explicit breadcrumbs, source-aware return, normal document scrolling, draft recovery, and matching existing domain mutations. Convert small dependent forms to inline sections. Retain short confirmations, mobile navigation/search, and install utilities as the default exception policy announced at implementation start.

## Boundaries & Constraints

**Always:** Preserve moderation requests versus direct admin saves, existing permissions/captcha/schema validation, exact entity identities, theme/reduced motion, Turkish/English labels, native link behavior, and relevant source URL state. Use Next.js 16.3.2 installed docs, bun, existing tRPC/Drizzle/auth, HeroUI wrappers, and translucent surfaces. User authorized the complete inventory and implementation, not only the pilot.

**Ask First:** Destructive production/deployment/database changes, which are not expected for this migration.

**Never:** Apply database migrations, expose secrets, modify environment secrets, deploy, push, open a PR, discard unrelated work, recreate task modals through route interception, or claim real-device checks performed without evidence.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected behavior | Error handling |
| --- | --- | --- | --- |
| Contextual launch | Filtered/paged source links to a task | Stable localized task URL, semantic breadcrumb, source return | Invalid return target uses parent fallback |
| Independent entry | Refresh, new tab, or sign-in | Fetch exact record by ID, preserve full task through auth | Missing/forbidden record has usable navigation |
| Submission | Existing form payload and permission | Same domain mutation; invalidate affected data and return | Keep input and errors on failure; block duplicates |
| Unsaved work | Long text form and app/browser navigation | Recover supported per-tab draft; explicit discard behavior | Storage denial preserves usable form; media reload limits visible |
| Revisit | Submitted page re-entered with Back/Forward | No mutation replay or submitted draft resurrection | Fetch current data/status |

</frozen-after-approval>

## Code Map

- `src/components/task-pages/`, `src/lib/task-navigation.ts`, `src/hooks/` — new shared page, navigation, draft, and return contracts.
- `src/i18n/routing.ts`, `src/i18n/pathnames.ts`, `messages/{en,tr}.json` — localized routes and copy.
- `src/_pages/dashboard/`, `src/app/[locale]/dashboard/`, `src/components/dynamic-parameter-{form,table}.tsx` — dashboard inventory and page entry points.
- `src/components/customs/edit-request-modal/`, `src/components/customs/modals/`, `src/components/requests/`, `src/_pages/contribute-word/` — public contribution forms and old overlay callers.
- `src/components/customs/saved-word-card.tsx`, `src/_pages/profile/`, `src/components/foreign-term-suggestions/` — detail/account/suggestion migration.
- `src/server/api/routers/` — narrowly scoped ID lookups where needed, preserving protection and parent ownership.
- `src/lib/play-url.ts` — auth return encoding boundary.
- `e2e/`, existing Jest suites — navigation, recovery, permissions, mutation, localization, and history regressions.

## Tasks & Acceptance

**Execution:**
- [x] Shared task navigation, page shell, source-state retention, text draft recovery, leave handling, and tests.
- [x] Daily-word new/edit pilot and normal localized list links with page state.
- [x] Word/meaning/relationship/pronunciation requests, quick missing-word entry, and inline supporting forms; all existing entry points switched.
- [x] Saved-word canonical detail links, foreign-term suggestion, feedback, and owner-only profile task pages.
- [x] Remaining dashboard word/users/feedback/badges/misspellings/galatimeshur/parameters/rejection inventory, plus existing announcement/create-word page alignment.
- [x] Remove obsolete form/detail overlay code; record named confirmation/utility exceptions and verify inventory closure.
- [x] Build, relevant automated tests, rendered desktop/mobile checks in both locales; document any external-service or real-device limits accurately.

**Acceptance Criteria:**
- Given any migrated entry point, when opened normally or in a new tab, then it renders the same independent task page with descriptive heading, breadcrumbs, return, and action controls.
- Given a paginated or filtered source, when a task succeeds or is cancelled, then the source context survives and affected data is fresh.
- Given a public correction or an admin edit, when submitted, then it preserves its original request/direct-write semantics and server authorization.
- Given a long dirty form, when navigating or refreshing, then supported text recovery or explicit discard prevents silent loss; media limitations are visible.
- Given mobile dimensions, long labels, theme changes, and reduced motion, when using the task, then controls remain aligned, reachable, keyboard-accessible, and free of migrated overlay locks.
- Given the final inventory, when audited, then no form/detail modal remains except a specifically documented justified disposition; no missing tasks are hidden as completion.

## Spec Change Log

- 2026-10-16 follow-up: the user clarified that a word editor's previous page is the contribution chooser. Task links now retain the immediate source URL instead of flattening it. Back, Cancel and completion return to that chooser; its own return preserves the original reading/list context. Direct and legacy editor URLs use the same parent step. Breadcrumbs show Word / Contribute / Task. Impeccable layout guidance was explicitly requested for the shared shell, chooser and word editor.

## Design Notes

PLAN's route inventory defines the scope. Breadcrumb hierarchy and actual return source are separate concepts. Source state belongs in URLs; large records and credentials do not. Share extracted form bodies, not duplicate page/dialog copies. Stable IDs identify mutations even when names repeat. Route parent-child relations must be verified server-side.

## Verification

Completed against the local worktree on 2026-10-16:

- `bun run ci:build` (runs `bun run build` with the sanitized CI environment): successful production build, Next.js route generation and TypeScript checks.
- `bun run test -- --runInBand --silent` with `ciEnvironment()` and `NODE_ENV=test`: **97 suites / 531 tests passed**; one suite / 15 tests intentionally skipped.
- `bunx tsc --noEmit`: passed.
- ESLint on the navigation/layout follow-up TypeScript files: **0 errors, 0 warnings**. The earlier full migration lint run recorded 43 warnings in its wider scope; these are not represented as a warning-free repository lint run.
- `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/dictionary-modal-browsers bun run test:e2e e2e/task-pages.spec.ts --workers=2`: the layout confirmation had **68 passing cases**. Four autocomplete cases hung on an incorrect test-only `response.finished()` wait. After removing that wait, the targeted `--grep 'existing-word suggestion'` rerun had **4 passing cases**. All **72 cases** were verified across these runs; this is not a claim of one clean 72-case invocation. Coverage includes one-step chooser/editor returns, direct entry, refresh/new tabs, nested URL state, moderated and admin saves, auth, language switching, history, draft recovery, unsaved transitions and microphone denial.
- Inspected the contribution chooser/editor in Turkish and English, light/dark themes, desktop and Pixel 7 emulation. Header hierarchy, single form surface, 48px control alignment, 44px actions and wrapping were checked in a bounded initial/confirmation visual pass. The suite also verifies 320px with 200% text and reduced motion. No additional polish loop was performed.
- Impeccable's separate layout assessment informed the structure. Its mechanical layout detector ran once over the four principal UI files: exit 0, `[]`. The two source concerns (unbroken Back labels and fixed Select helper height) were addressed. The rendered pass additionally tightened narrow gutters and allowed action labels to wrap.
- Graph-assisted audit found 14 remaining overlay call-site files, all accounted for in [INVENTORY.md](./INVENTORY.md) as approved confirmations, navigation/install utilities or supporting primitives. No planned substantial form/detail overlay remains.
- Independent Blind Hunter and Edge Case Hunter reviews plus fix verification are recorded in [REVIEW.md](./REVIEW.md). `git diff --check` passed.

Browser checks use real local Next.js, Better Auth, tRPC and PostgreSQL. Only external captcha and Upstash boundaries are fixtures, guarded for the disposable loopback CI app. Separate test client IPs prevent parallel journeys from consuming one shared authentication rate-limit window. No deployment or external database migration was performed.

Physical iOS/Android keyboard, browser microphone permission UI and real media-upload service behavior were not verified. These remain release follow-ups. Text drafts exclude files and recordings, with that reload limitation displayed in the relevant tasks.

## Develop integration and PR review

Rebased onto `develop` at `390cf00`, preserving the newer search-gap prefills, correction filters, dashboard navigation, and audited mutation returns. [PR #212](https://github.com/4Furki4/Turkce-Sozluk/pull/212) targets `develop`.

The first GPT-6.1 Sol/xhigh COMMENT review identified three reproduced regressions: chooser changes triggering an unsaved-work prompt, fast search typing losing characters while route transitions were pending, and eager author validation using missing English keys. Choosers now stay clean, client filters update synchronously with native History URL persistence, and author validation uses the shared translated keys. Added unit/browser coverage checks these behaviors and reload restoration.

The integrated branch passes the production build and 109 Jest suites / 690 tests (15 skipped). Repository lint has no errors; warnings remain. Browser regression checks cover both locales and desktop/mobile. The task fixture recreates its PostgreSQL connection for each hook lifecycle so reused Playwright workers remain valid. The history filter check uses its keyboard interaction after Back restoration. CI retains three browser repetitions and its flaky-test failure policy; its browser job allowance is 45 minutes for the expanded suite. A fresh current-head review and passing GitHub CI are required before merging.

A second GPT-6.1 Sol/xhigh review found a controlled-autocomplete label/ID mismatch. Existing spelling corrections could save the old ID while showing a new query. Daily, spelling, Galatımeşhur and pronunciation pickers now invalidate stale selections and synchronize canonical labels on selection. Added durable selected-ID tests for each admin family and partial-label pronunciation coverage. Twenty focused desktop/mobile cases passed, along with the production build, 690 unit tests and lint. The first full local repeated suite passed 426 cases on the preceding head; GitHub subsequently exposed two flaky menu cases caused by concurrently deleted fixture accounts. Stable menu accounts now isolate that test without relaxing CI's flaky policy.

## Suggested Review Order

1. [Start with a direct task route](<../../../src/app/[locale]/contribute-word/[wordId]/meanings/[meaningId]/edit/page.tsx#L1>) — Independent route entry and noindex metadata.
2. [Check navigation and source restoration](<../../../src/components/task-pages/task-page.tsx#L47>) — Breadcrumbs, guarded return, auth and completion.
3. [Check link and return URL contracts](<../../../src/components/task-pages/task-link.tsx#L59>) — Localized anchors, modifier clicks and immediate source URLs with nested original context.
4. [Inspect draft isolation and lifecycle](<../../../src/hooks/use-task-draft.tsx#L28>) — Account/entity/tab scope, explicit restore and successful-submit clearing.
5. [Inspect protected record lookups](<../../../src/server/api/routers/task.ts#L19>) — Admin permissions and route identity; public word child validation is in word.ts.
6. [Compare migrated forms with original mutations](<../../../src/components/task-pages/word-task.tsx#L30>) — Public correction flow; dashboard-task.tsx and dashboard-task-forms.tsx cover admin tasks.
7. [Review journey evidence and inventory](<../../../e2e/task-pages.spec.ts#L1>) — Durable saves, moderation, auth/history, recovery, locale changes and responsive checks; see INVENTORY.md and REVIEW.md for scope and resolved findings.
