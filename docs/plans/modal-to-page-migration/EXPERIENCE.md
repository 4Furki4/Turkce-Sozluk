---
name: Turkish Dictionary modal to page migration
status: draft
updated: 2026-10-16
source-baseline: 22d5661
sources:
  - PLAN.md
  - .memlog.md
---

## Foundation

Responsive web for desktop and mobile, including installed PWA use. Inherit HeroUI wrappers, Tailwind, localized navigation, existing authentication and moderation. [DESIGN.md](./DESIGN.md) owns visuals. [PLAN.md](./PLAN.md) owns the full source inventory, proposed routes, implementation boundaries, delivery slices, and validation; this document distills the shared experience contract. Rendered desktop/mobile emulation evidence is recorded in IMPLEMENTATION.md; physical-device keyboard and media verification remain separate release follow-ups.

Forms and content/detail tasks are proposed for page migration. Short confirmations and navigation/install utilities remain explicit scope decisions; migration order is also provisional. No visual mock or reviewer gate is required for this discussion draft. Layout follows PLAN's page anatomy and still requires future rendered QA.

## Information Architecture

Routes below are internal route keys; new localized paths need both route registries and Turkish/English labels. Stable IDs identify mutation targets; displayed names label breadcrumbs. Every inventory family uses one of these task patterns and the corresponding journey below.

| Surface family | Proposed/reused routes | Journey |
| --- | --- | --- |
| Dashboard create/edit and moderation | `/dashboard/daily-words/new`, `/dashboard/daily-words/[id]/edit`; word/user/feedback/badge/parameter and request-rejection destinations in PLAN; reuse announcement/request pages | Deniz |
| Word corrections, meaning, relationship, pronunciation requests | `/contribute-word/[wordId]/edit`, `/contribute-word/[wordId]/meanings/[meaningId]/edit` and `/remove`; relationship/pronunciation routes in PLAN | Elif |
| New word, feedback, foreign-term suggestion | `/contribute-word?mode=simple&word=...`, existing detailed contribution page, `/feedback/new`, `/foreign-term-suggestions/new` | Ece |
| Saved-word reading and account edit | Canonical `/search/[word]`, `/profile/[id]/edit` | Can |

Breadcrumbs describe explicit semantic parents; do not derive them only from URL segments or session history. For example, `Dashboard / Words / Edit “ev”` needs no intermediate dashboard word-detail page. The labelled return arrow, Cancel and completion resolve the immediate validated previous step. For word corrections the full hierarchy is `Word / Contribute / Edit`: the editor returns to its contribution chooser, and the chooser retains the original word, Saved Words or other source URL. Direct links and refreshes also return through the chooser before reaching that original source. Read-only selection pages are valid intermediate returns; unfinished editors and self loops are rejected.

## Voice and Tone

Use concise task verbs and entity names in both locales. Distinguish public “Request submitted for review” from admin “Changes saved.” Offer request details when an ID exists. Return labels name the destination, such as “Back to words.” Explain recovery and media re-selection plainly; never promise publication or offline submission before it occurs.

## Component Patterns

| Component | Behavioral contract |
| --- | --- |
| Task header | Return link, labelled breadcrumb navigation, current-page indication, one heading, optional context; preserve ordinary link/new-tab behavior. Uses {components.task-header.title}. |
| Task body | Fetch independently by route ID, validate parent ownership and capability, retain existing schemas and mutation semantics. Uses {components.task-body.surface}. |
| Supporting editor | Expand small author/attribute/related-item entry inline; retain the parent draft and selected values, return focus to the relevant field. Use a route only for a meaningful standalone task. |
| Action area | Explicit submit and Cancel; block duplicate submissions while pending. Success clears dirty state and draft, refreshes affected source data, then returns. |
| Status region | Keep loading, validation, failure/retry, unavailable connection, missing record, and forbidden states in the page shell with usable navigation. Announce outcomes. |
| Draft decision | For app-controlled navigation with unsaved changes, show inline Keep editing / Discard changes. Keep editing retains values; discard clears the draft before leaving. |

## State Patterns

| State | Applicable surfaces | Required treatment |
| --- | --- | --- |
| Loading | All data-backed tasks and source returns | Stable shell/navigation; show progress while fetching current data. |
| Empty/new | Create forms and supporting editors | Clear empty fields; preserve intentional prefills and URL-selected mode. |
| Missing/deleted | Entity tasks or stale source | Explain and offer the surrounding list/parent; resolve an emptied final list page. |
| Unauthorized/forbidden | Protected tasks | Sign in with validated `backTo`, or show the capability failure; direct loading cannot bypass protection. |
| Invalid | All forms | Preserve input, associate messages with fields, focus first invalid field. |
| Pending | All submissions | Visible pending status and duplicate-submit prevention. |
| Failure/offline | All forms | Keep values and errors; explicit retry when possible. Retain supported text drafts without claiming queued submission. |
| Recovered/stale | Long contribution and edit forms | Visible recovery plus discard; compare recovered edits with fresh server data before applying. |
| Success | All submissions | Distinct moderated/admin copy; clear submitted draft, refresh relevant data, restore source context. |
| Focus/return | All tasks and source pages | Logical reading order; restore originating row and scroll when available. |
| Media denied/lost | Recording and uploads | Explain permissions or required re-selection, preserve text, allow retry/cancel, clean up recording resources. |

## Interaction Primitives

Entry actions are localized links to a task with an optional encoded `returnTo`. Preserve page/cursor, size, filters, search, sort, and relevant tab/selection in the source URL before migration. Keep scroll/trigger identity separately as best-effort per-tab state.

Validate and normalize local return targets centrally. Reject external, protocol-relative, unsafe, and unsupported task-loop targets; otherwise use the semantic-parent fallback. Reuse the existing same-origin auth boundary with flow-specific restrictions. Never pass raw URL parameters into imperative navigation.

Use native Back only with reliable evidence that the immediately previous entry is the intended source; `history.length` and referrer alone do not prove this. Refresh, direct entry, pasted links, sign-in, and new tabs always retain a useful return control. On success, return through known history or replace with the validated target without a redundant task/list entry. Forward/revisit must neither replay mutations nor revive the submitted draft. A late mutation response cannot redirect from an unrelated page.

Sign-in uses existing `backTo` with the full task URL and its validated return context. Before reusing `getSafeAuthReturnUrl`, test nested auth/task return encoding: the existing helper explicitly decodes its input, so valid literal escapes must survive without double decoding. Page capability checks and existing tRPC protections remain authoritative, including owner checks for profile edits. Use ordinary localized links for breadcrumbs and `useProgressRouter` for imperative completion navigation.

### Draft and media lifetime

Recover supported serializable text fields per tab, scoped by account, operation, entity, and draft identity. Version and expire drafts; clear on success, explicit discard, or account change. Storage-disabled cases retain the usable current form and explain recovery limitations. No server draft store is implied.

Keep selected files and recorded audio only in narrowly scoped active-page memory. Reload cannot restore `File`/`Blob` values from text storage: visibly request media again. Recoverable text protects native Back/refresh; unload prompts are supplementary and cannot protect against mobile termination. The inline leave decision applies to app-controlled Cancel, return, and breadcrumb navigation.

## Accessibility Floor

Label breadcrumb navigation and the return control; identify the current page. Use a descriptive document title and one heading. Announce validation/submission outcomes, associate field errors, maintain visible focus, and restore meaningful focus after inline work or source return. Ensure comfortable touch targets and keyboard operation for every action.

Honor 200% text, light/dark theme, and reduced motion; {typography.body} inherits existing readable text behavior. Verify WCAG AA contrast over {components.task-body.surface}. Routed forms must leave no focus trap, background scroll lock, or inaccessible offscreen action. Preserve SSR content visibility and existing PWA update behavior.

## Responsive & Platform

Use the same task page on desktop and mobile. At 320–390 px, retain the labelled return and current task, accessibly collapse intermediate breadcrumbs, wrap long names, and stack fields/actions. Use document scrolling; the software keyboard and browser controls must not obscure errors or submit controls. Preserve text selection and normal browser gestures.

Rendered QA covers both locales, 200% text, portrait/landscape, keyboard open, and long labels. Real iOS Safari and Android Chrome checks are required for keyboard/scroll claims; desktop emulation alone is insufficient. Recording/upload additionally covers denial, cancellation, and navigation cleanup.

## Inspiration & Anti-patterns

Adopt the user's page-with-breadcrumbs approach: stable task URLs, a quick labelled left arrow, and a contextual completion return. Avoid recreating the nested modal as a large tabbed overlay on a route, retaining modal scroll constraints, or treating every dropdown/portal as a migrated form. Utility/confirmation policy stays explicit in PLAN.

## Key Flows

The following named protagonists are illustrative assumptions for coverage, not user-research findings. Each inventory family follows its mapped journey; retain the family's existing permissions, fields, and mutation rules.

### Deniz — Dashboard create/edit and moderation

1. Deniz filters and paginates a dashboard list, then follows its create/edit link; the daily-word family is the proposed pilot.
2. The task loads by ID with breadcrumbs and source-aware return; Deniz edits and submits using the existing permitted action.
3. **Climax:** “Changes saved” appears and the refreshed source restores the same URL context, row, and best-effort scroll. Request rejection instead returns to its request detail with the existing status semantics.
4. Failure: forbidden or deleted target shows a navigable state; API failure retains edits. Cancel offers the inline dirty decision; browser Back/Forward must preserve safe history and draft rules.

### Elif — Word corrections, meaning, relationship, pronunciation requests

1. Elif follows a specific task from a word or Saved Words; its stable ID selects the intended entry even when spellings repeat.
2. If sign-in is required, `backTo` resumes the same task and source context. Elif edits text or records/uploads audio; supporting entry stays inline.
3. **Climax:** “Request submitted for review” confirms the request and returns to the source without implying immediate dictionary publication; an available request-details link remains useful.
4. Failure: validation/API errors keep values; denied media can be retried. Reload visibly restores supported text and asks for media again. Changed server data requires reconciliation.

### Ece — New word, feedback, foreign-term suggestion

1. Ece follows the missing-word action; `/contribute-word?mode=simple&word=...` opens the prefilled simple form immediately. Detailed contribution, feedback, and foreign-term entry use the same independent page pattern.
2. Ece fills the existing required fields, adds supporting values inline where needed, and submits.
3. **Climax:** The existing workflow's accurate outcome appears and Ece returns to the originating search/page; intentional repeat entry starts clean.
4. Failure: offline/API failure preserves text and provides retry/navigation. A direct or new-tab visit has a useful fallback without assuming a prior history entry.

### Can — Saved-word reading and account edit

1. Can opens a saved entry on its canonical word page with Saved Words as return context; the intended word entry remains identifiable.
2. Can uses the labelled arrow to return, or opens the owner-authorized profile edit page and updates profile fields.
3. **Climax:** Reading returns to the saved list context; a successful profile save returns to the refreshed profile.
4. Failure: an unavailable word/profile or unauthorized edit gets a navigable state. Dirty profile edits follow the shared recovery/discard contract.
