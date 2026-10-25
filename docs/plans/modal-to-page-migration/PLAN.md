# Modal to page migration plan

Status: implementation complete, authorized by the user on 2026-10-16. See [implementation tracking](./IMPLEMENTATION.md) for validation evidence and physical-device release follow-ups, and [the final inventory](./INVENTORY.md) for every migrated flow and retained overlay.

Source baseline: `22d5661`, inspected 2026-10-16. Routes below are internal route keys unless explicitly labelled as localized URLs.

Companion drafts: [visual inheritance and page anatomy](./DESIGN.md), [experience contract and illustrative journeys](./EXPERIENCE.md).

## Intended outcome

Give each substantial contribution, create, edit, and detail task a normal page with a stable URL, breadcrumbs, a labelled left-arrow return control, and explicit submit/cancel actions. The same page is used on desktop and mobile. Refresh, browser Back/Forward, opening a new tab, and arriving through sign-in must work independently of the originating list component.

Breadcrumbs describe the page hierarchy; the return control takes the person back to their actual source context. These can differ: someone can start a word correction from Saved Words while the breadcrumb still identifies the word and correction task.

## Implementation defaults

The user authorized implementing this plan. The following defaults were announced at implementation start and remain steerable:

1. **Modal exceptions:** move forms and content/detail views into pages; retain brief confirmations and navigation/search/install utilities. Small supporting fields expand inline within a parent form. This scope does not claim “zero modals.”
2. **Migration order:** shared foundation, a small dashboard pilot, public contributions, then the remaining dashboard and account forms, followed by complete inventory and validation.

## What the current code shows

- Direct overlay markup appears in 16 dashboard files and 30 shared/public/account files. This is a source inventory, not 46 distinct live workflows: it includes shared wrappers, navigation drawers, and components whose active callers must be checked during migration.
- The public word correction shell (`WordCardRequestModal`) contains word/pronunciation, meaning, related-word, and related-phrase tasks. It can open more dialogs. It is reached from `WordCard`, including the saved-word experience.
- Public word and meaning edits create **moderation requests**. Dashboard word editing calls an admin mutation that changes the dictionary. Moving the presentation must preserve both semantics.
- `/contribute-word` is already a page with detailed/simple forms and `?word=` prefill, but supporting attribute, author, and relationship entry still opens modals. The simple contribution tab is currently component state rather than a URL-selected entry point.
- Announcement creation/editing and request details already have pages. Reuse them and standardize their navigation; do not rebuild them as competing flows.
- `/feedback/new` and `/dashboard/daily-words/[id]/edit` appear in both route registries, but corresponding page files are absent in this checkout. A route-registry entry is not a completed page migration.
- Daily-word pagination is component state. Moving its edit dialog without first preserving list context would reset the user's place.
- Dashboard layout permits admin/moderator entry. Individual page capabilities and existing tRPC procedure restrictions still need to govern each action.
- Sign-in already accepts `backTo`; `getSafeAuthReturnUrl` in `src/lib/play-url.ts` validates same-origin targets. Reuse this boundary where suitable instead of introducing a competing auth callback convention.

## Page and navigation contract

### Page anatomy

Each task page has a labelled return arrow, breadcrumbs, one descriptive heading, a short context summary where useful, the form or detail content, and a clear action area. Example:

```text
← Back to words
Dashboard / Words / Edit “ev”

Edit “ev”
[word fields]
[meanings]

Cancel                         Save changes
```

Use the existing UI system and `bg-background/40` surfaces. On narrow screens, retain the return label and current task, collapse intermediate breadcrumbs accessibly, and stack fields/actions. Use document scrolling. Avoid carrying modal height limits, backdrop layers, focus traps, or body-scroll locks into the page.

### Return context and browser history

1. Entry controls are ordinary localized links, with a stable entity ID in the route and an optional encoded `returnTo` containing the immediate source pathname, query, and meaningful fragment. A chooser retains its own original source inside that URL, so nested tasks return one step at a time.
2. Promote relevant list state into the source URL before migrating its modal: page/cursor, page size, search, sort, filters, selected word/tab where needed. Preserve scroll and the triggering row separately as best-effort per-tab state.
3. Breadcrumb parents are explicit semantic routes, not a list of previously visited pages. Do not derive labels or parentage only by splitting URL segments.
4. The return arrow and Cancel resolve a validated local return target; otherwise use a stable parent fallback. Use browser Back only when the app has reliable evidence that the immediately previous entry is that source. `history.length` and `document.referrer` alone are insufficient.
5. A same-tab launch should allow native Back to restore the source. Direct links, pasted links, sign-in redirects, refreshes, and new tabs must still have a useful app return control.
6. On success, mark the form clean, clear its draft, invalidate/refetch the affected data, then return without adding a redundant form/list history entry. Use the known previous source when available, otherwise replace with the validated destination. Verify this in the pilot rather than rewriting Next.js history internals.
7. Forward/revisiting a submitted page must never replay a mutation or restore the submitted draft as unsaved work. Intentional repeat contributions start clean.
8. A stale or deleted source item falls back to the surrounding list. If deletion empties the last page, resolve to a valid preceding page.

Normalize and validate return URLs centrally, rejecting external/protocol-relative/unsafe targets and unfinished-editor returns and self loops. Read-only contribution and pronunciation choosers are allowed as intermediate steps. Reuse and test the existing same-origin helper, adding flow-specific parent rules where needed. Its current implementation explicitly decodes the supplied value; test nested auth/task return URLs and names containing `%`, `&`, `+`, Unicode, and fragments before reuse so values are not decoded twice. Construct nested query strings with URL utilities. Do not pass raw query-string URLs into the router.

### Form state and results

- Extract each existing form from its overlay shell. Replace close-specific callbacks with completion/cancellation callbacks; retain schemas, mutation payloads, captcha, moderation, and validation rules.
- The page fetches by route ID and validates child-to-parent ownership. It must not depend on `selectedItem` or a full record passed from a table row. Where current APIs only fetch by name or through a list, add a narrowly scoped, permission-appropriate ID lookup.
- Public submissions say “Request submitted for review” and return to the source. Admin edits say “Changes saved.” Offer a request-details link when a request ID is available; do not imply immediate publication.
- Preserve values and errors on API failure; focus the first invalid field. Prevent repeated submissions while pending. A late response after navigation must not redirect the user from an unrelated page.
- Loading, missing record, forbidden, offline, and retry states must occupy the normal page shell with usable navigation. A blank fragment is not an adequate routed error state.

### Drafts and leaving a task

- Add draft recovery to long contribution/edit forms before introducing navigation away from them. Scope recoverable text drafts by account, operation, entity, and draft identity; version them, expire them, and clear them on successful submission, explicit discard, or account changes.
- Use per-tab storage for supported serializable fields with a storage-disabled fallback. Restore with visible feedback and a discard option. Reconcile a recovered edit against fresh server data rather than silently overwriting changed records.
- In-app Cancel/return/breadcrumb navigation with unsaved work offers an inline “Keep editing / Discard changes” decision. Retaining a recoverable draft protects native Back and refresh; browser unload prompts are supplementary and cannot be relied on for mobile app termination.
- Keep selected files and recorded audio in a narrowly scoped in-memory draft while the page remains active. Text storage cannot preserve `File`/`Blob` objects across a reload. Clearly state when media must be reselected; do not claim durable media drafts without implementing and validating suitable storage.
- Author/attribute/related-item entry that only supports the current unsaved form expands inline and returns focus to the relevant field. Create reusable domain requests through their existing mutations; keep newly selected values in the parent draft. An independent task can have a route when it has a meaningful standalone use.

## Migration inventory and proposed destinations

All new routes need matching entries in `src/i18n/routing.ts` and `src/i18n/pathnames.ts`, Turkish/English labels, and suitable metadata. `[id]` below means the entity's actual stable identifier; badge routes use the existing slug.

### Dashboard

| Current surface | Proposed destination or treatment | Main source |
| --- | --- | --- |
| Word editor | `/dashboard/word-list/[wordId]/edit`; fetch the exact word by ID | `src/_pages/dashboard/word-list/edit-modal/edit-word-modal.tsx` |
| Create word and its supporting author/attribute dialogs | Keep `/dashboard/create-word`; supporting entry inline or linked with draft preservation | `src/_pages/dashboard/create-word-form/` |
| User role editor / badge assignment | `/dashboard/user-list/[userId]/role` and `/dashboard/user-list/[userId]/badges` | `src/_pages/dashboard/user-list/` |
| Feedback status/type editors | One `/dashboard/feedback/[id]/edit` page that exposes the existing actions and permissions | `src/_pages/dashboard/feedback/modals/` |
| Daily-word create/edit | `/dashboard/daily-words/new` and the already-registered `/dashboard/daily-words/[id]/edit` | `src/_pages/dashboard/daily-words/daily-words-list.tsx` |
| Misspelling create/edit | `/dashboard/misspellings/new`, `/dashboard/misspellings/[id]/edit` | `src/_pages/dashboard/misspellings/` |
| Galatımeşhur create/edit | `/dashboard/galatimeshur/new`, `/dashboard/galatimeshur/[id]/edit` | `src/_pages/dashboard/galatimeshur/` |
| Badge create/edit | `/dashboard/badges/new`, `/dashboard/badges/[slug]/edit` | `src/_pages/dashboard/badges/badge-management.tsx` |
| Dynamic parameter entry/edit | `/dashboard/dynamic-parameters/<existing-type>/new` and `/[id]/edit`; keep existing type-specific restrictions | `src/components/dynamic-parameter-form.tsx`, `src/components/dynamic-parameter-table.tsx` |
| Request rejection form | `/dashboard/requests/[id]/reject`, returning to the request detail | `src/_pages/dashboard/requests/admin-request-detail.tsx` |
| Announcement create/edit | Keep existing new/edit pages; adopt the shared header and return behavior | `src/_pages/dashboard/announcements/announcement-form.tsx` |
| Deletes, relationship removal, and approval | Separate confirmation inventory; proposed inline confirmation on the owning page, or retain short dialogs if chosen | Word/user/feedback/announcement/badge lists, request details, word-relations components |

`src/_pages/dashboard/requests/request-details.tsx` is a second request-detail implementation. The active route imports `AdminRequestDetail`; inspect remaining callers and consolidate/remove an obsolete implementation only after confirming it is unused.

### Contributions and account forms

| Current surface | Proposed destination or treatment | Main source |
| --- | --- | --- |
| Saved-word detail preview | Reuse the canonical `/search/[word]` page, retaining the Saved Words return target and identifying the intended word entry where spellings repeat | `src/components/customs/saved-word-card.tsx` |
| Word correction dialog | `/contribute-word/[wordId]/edit` | `src/components/customs/modals/word-card-request-modal.tsx`, `src/components/customs/edit-request-modal/word-edit-request.tsx` |
| Meaning edit / deletion request with a reason | `/contribute-word/[wordId]/meanings/[meaningId]/edit` and `/remove` | `src/components/customs/edit-request-modal/meanings-edit-request.tsx`, `delete-meaning-modal.tsx` |
| Related word/phrase create, edit, removal request | `/contribute-word/[wordId]/related-words/new`, `/[relationId]/edit`, `/[relationId]/remove`, and the equivalent `related-phrases` routes | `src/components/customs/edit-request-modal/related-*-request-modal.tsx` |
| Pronunciation contribution | `/contribute-word/[wordId]/pronunciations/new`; preserve recording/upload capability and source context | `src/components/requests/*pronunciation*modal.tsx`, `src/components/customs/edit-request-modal/word-edit-request.tsx` |
| Missing-word quick request | Reuse `/contribute-word?mode=simple&word=...`; make mode URL-selectable, prefilled, and visible immediately | `src/components/customs/modals/simple-word-request-modal.tsx`, `src/_pages/contribute-word/` |
| Detailed new-word supporting dialogs | Keep the main contribution page and expand small supporting forms inline | `src/_pages/contribute-word/components/add-related-item-modal.tsx`, `detailed-contribution-form.tsx`, `src/components/customs/edit-request-modal/meanings/`, `word/` |
| Foreign-term suggestion | `/foreign-term-suggestions/new` | `src/components/foreign-term-suggestions/ForeignTermSuggestionModal.tsx` |
| Feedback submission | Implement already-registered `/feedback/new`; share one form instead of separate dialog/page copies | `src/components/customs/modals/add-feedback.tsx`, `feedback-dialog.tsx` |
| Profile editor | `/profile/[id]/edit`, server-authorized for the signed-in owner | `src/_pages/profile/edit-profile-form.tsx` |

Use the contribution namespace for stable entity IDs and task routes, with the canonical word page as a breadcrumb/return destination where appropriate. Word spelling can change and multiple entries can share a spelling; avoid making the spelling the sole mutation identity. Display the word name, not the ID, in the breadcrumb. Link directly to a task rather than recreating the old nested dialog as a large tabbed overlay on a page. Add a contribution task chooser only where the existing entry action is genuinely generic.

Example dashboard localization:

- Internal key: `/dashboard/word-list/[wordId]/edit`
- English URL: `/en/dashboard/word-list/123/edit`
- Turkish URL: `/tr/panel/kelimeler/123/duzenle`

The Turkish slugs for new contribution routes remain proposed implementation details to resolve consistently with existing names.

### Explicit exception register

Before implementation, classify each of these as retain, inline replacement, or dedicated utility page:

- Simple destructive confirmations: delete word/user/feedback/announcement/badge/parameter; request approval/cancellation; clear search history.
- Request removals that collect reasons: these are forms and belong in the routed migration even if their filenames say “delete.”
- Install-app instructions (`src/components/install-app-control.tsx`).
- Mobile search drawer and navigation sidebar. Their navigation/search purpose differs from a create/edit form; do not count retaining them as a complete removal of all modal behavior.
- Shared overlay primitives (`CustomModal`, `components/ui/dialog.tsx`, `components/ui/sheet.tsx`): remove only if no approved uses remain. Check popovers/select dropdowns separately rather than treating every portal as a modal.

## Delivery sequence

| Slice | Concrete deliverable | Exit condition |
| --- | --- | --- |
| 1. Foundation + dashboard pilot | Shared task-page header/breadcrumbs, return-context resolver, draft/leave behavior, source URL state, and daily-word new/edit pages | A direct-linked edit and a filtered/paginated-list launch both survive save/cancel/Back/refresh on mobile; no overlay remains for daily-word forms |
| 2. Public contribution core | Word correction, meaning tasks, pronunciation, quick missing-word entry, and draft-safe supporting fields | All existing word-card and saved-word entry points reach the right task; requests remain moderated; recording and nested form work survive intended navigation |
| 3. Remaining contribution/account forms and content views | Saved-word detail navigation, related words/phrases, foreign-term suggestion, feedback, profile; standardize the existing detailed contribution page | Each migrated flow works independently of its former parent component; no remaining form/detail dialogs in this slice |
| 4. Dashboard remainder | Word editor, users, feedback, badges, misspellings, galatımeşhur, dynamic parameters, request rejection; align existing announcement pages | Each family has matching page/API capabilities and preserved list context |
| 5. Confirmation/utility decision + cleanup | Apply the chosen exception policy, remove obsolete modal state/imports/components, update docs and entry links | Repeat the overlay inventory; every remaining usage has an explicit disposition |

Keep slices reviewable by workflow family. Extract and reuse existing form bodies first, then switch all callers, verify the route, and finally remove the old overlay shell. Avoid a bulk replacement of modal tags or a global route-interception mechanism that still renders task overlays.

## Implementation boundaries

- Use localized `Link` for entry/breadcrumb navigation and `useProgressRouter` for imperative completion navigation. Keep regular link behavior, including middle-click and modifier-key new tabs.
- Validate auth and capabilities on direct route loads and retain the existing protected/admin tRPC boundaries. The dashboard layout alone does not establish permission for every form. Reuse `backTo` through sign-in with the full task URL and its validated return context.
- No database schema change is expected for this presentation migration. Persistent server-side drafts would be a separate explicit expansion; per-tab text recovery does not require one.
- Add task-page `noindex` metadata and keep contribution/edit action URLs out of the sitemap. Preserve existing word canonical helpers and English indexing policy.
- Audit cache freshness on the source, including server-prefetched lists and browser-restored pages. Public request submission refreshes request state without pretending that dictionary content changed immediately.
- Preserve theme, reduced-motion, SSR visibility, existing page-transition behavior, and PWA update behavior. A contribution page should report an unavailable connection and retain its draft rather than promise offline submission.
- Read the installed Next.js 16.3.2 documentation before writing implementation code. This checkout currently has no `node_modules/next/dist/docs`; current online documentation can describe newer APIs and is only a conceptual reference here.

## Acceptance and validation

For every migrated family, verify source launch, direct entry, reload, new tab, browser Back/Forward, return arrow, Cancel, successful completion, and failure/retry. Include session expiry followed by sign-in, a missing/deleted entity, stale status or changed entity data, and an account without the required capability.

Mobile checks must include 320–390 px widths, long Turkish/English labels and entity names, 200% text, an open software keyboard, portrait/landscape, and scrolling to errors/actions. Use real iOS Safari and Android Chrome for keyboard/scroll behavior; desktop emulation alone cannot establish the absence of those bugs. Recording/upload flows need media permission denial, cancellation, and navigation cleanup checks.

Accessibility checks: labelled breadcrumb navigation with a current-page indication, descriptive page title/heading, visible keyboard focus, first-error focus, announced validation/submission outcomes, and meaningful focus/scroll restoration on return. No background scroll lock or focus trap should remain after leaving a migrated form.

Automate the contracts that are easy to regress: return URL validation/fallbacks; route localization; ID/parent ownership and permission boundaries; dirty draft restore/clear; exact mutation semantics; URL state retention; and one successful plus one failed submission journey for the pilot and contribution core. Extend the existing Jest and Playwright setup rather than introduce another framework. Test the history behavior against the installed Next.js version.

Implementation validation: `bun run build`, relevant `bun run test` coverage, and targeted `bun run test:e2e` journeys using the existing CI service setup. Planning artifacts alone do not require installing dependencies or running the app build. No browser/mobile outcome has been validated during this planning pass.

Completion means every inventory item has a verified route/inline replacement or a named exception, all migrated entry points use it, and the intended mobile tasks pass the checks above. Do not equate “new page exists” with “modal migration complete.”

## Supporting references

- [Next.js Link behavior](https://nextjs.org/docs/app/api-reference/components/link): normal links, browser history, scrolling, and client navigation.
- [Next.js router behavior](https://nextjs.org/docs/app/api-reference/functions/use-router): push/replace/back semantics, cache-refresh limits, and validation of navigation URLs.
- [WAI breadcrumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/): hierarchical parents and accessible breadcrumb semantics.

These references support the proposed navigation contract; they do not demonstrate application-specific mobile fixes.
