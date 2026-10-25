# Implementation inventory

All route names below are internal localized route keys. `src/i18n/task-pathnames.ts` supplies the Turkish and English paths to both route registries. Each task uses normal document flow, noindex metadata, and the shared task shell. Browser evidence and remaining device limits are recorded in IMPLEMENTATION.md.

| Original workflow | Final disposition |
| --- | --- |
| Dashboard word edit | `/dashboard/word-list/[wordId]/edit`; exact ID lookup, original direct admin mutation, text recovery |
| Dashboard create word | Existing `/dashboard/create-word` adopts task navigation/recovery; author and attribute helpers expand inline |
| User role / badge assignment | `/dashboard/user-list/[userId]/role` and `/badges`; protected admin lookups/actions |
| Feedback status / type | `/dashboard/feedback/[id]/edit`, exposing the existing protected actions |
| Daily-word create / edit | `/dashboard/daily-words/new`, `/dashboard/daily-words/[id]/edit`; URL pagination and full selected-word data |
| Misspelling create / edit | `/dashboard/misspellings/new`, `/dashboard/misspellings/[id]/edit` |
| Galatımeşhur create / edit | `/dashboard/galatimeshur/new`, `/dashboard/galatimeshur/[id]/edit` |
| Badge create / edit | `/dashboard/badges/new`, `/dashboard/badges/[slug]/edit` |
| Parameter create / edit | `/dashboard/dynamic-parameters/{word-attributes,meaning-attributes,authors,part-of-speech,languages,roots}/new` and `/[id]/edit` |
| Request rejection | `/dashboard/requests/[id]/reject`; includes request identity, contributor, current/proposed content and reason |
| Announcements | Existing new/edit pages adopt task navigation and drafts; existing detail page retained |
| Saved-word detail | Canonical `/search/[word]` with stable `entry` ID and Saved Words return context |
| Generic word correction action | `/contribute-word/[wordId]` chooser; both current search variants and legacy word-card callers migrated |
| Word correction | `/contribute-word/[wordId]/edit`; original moderated request, stable word ID |
| Meaning correction / removal request | `/contribute-word/[wordId]/meanings/[meaningId]/{edit,remove}`; validates parent-child identity |
| Related words / phrases | `/contribute-word/[wordId]/{related-words,related-phrases}/new` and `/[relationId]/{edit,remove}`; composite parent/related identity |
| Pronunciation | `/contribute-word/[wordId]/pronunciations/new`; voting-page entry uses `/pronunciation-voting/new` chooser; recording cleanup on navigation |
| Quick missing word | Existing `/contribute-word?mode=simple&word=...`; full task/source resumes after sign-in |
| Detailed contribution helpers | Author, attributes and related-item entry expand inline; parent text/IDs recoverable, mode changes guarded |
| Foreign-term suggestion | `/foreign-term-suggestions/new`; selected existing-word ID and visible label recover together |
| Feedback submission | `/feedback/new`; old footer and shared launchers are ordinary links |
| Profile editor | `/profile/[id]/edit`; server checks signed-in owner; media reload limitation displayed |
| Duplicate request-detail implementation | Unused `request-details.tsx` removed; active AdminRequestDetail retained |

## Deliberately retained overlays

The approved exception policy retains brief confirmations and navigation/install utilities:

| Remaining component | Purpose |
| --- | --- |
| `dashboard/word-list/word-list-delete-modal.tsx` | Confirm direct word deletion |
| `dashboard/user-list/user-delete-modal.tsx` | Confirm user deletion |
| `dashboard/feedback/modals/delete-feedback.tsx` | Confirm feedback deletion |
| `dashboard/announcements/delete-announcement-modal.tsx` | Confirm announcement deletion |
| `dashboard/badges/badge-management.tsx` | Confirm badge deletion |
| `dynamic-parameter-table.tsx` | Confirm parameter deletion |
| `dashboard/word-relations/_components/related-words-list.tsx` | Confirm direct admin relationship removal; its small editor remains inline |
| `dashboard/requests/admin-request-detail.tsx` | Confirm request approval; rejection is routed |
| `requests/cancel-request-button.tsx` | Confirm request cancellation |
| `customs/modals/clear-search-history.tsx` | Confirm clearing history |
| `customs/search/mobile-search-drawer.tsx` | Mobile search navigation |
| `customs/sidebar.tsx` | Mobile navigation |
| `install-app-control.tsx` | Installation instructions |
| `customs/heroui/custom-modal.tsx`, `components/ui/dialog.tsx`, `components/ui/sheet.tsx` | Shared primitives supporting approved utility/confirmation uses |

Graph-assisted source audit checked Modal, CustomModal, Dialog, DrawerContent and SheetContent call sites. No substantial create/edit/detail workflow from the plan remains in an overlay. Popovers and select menus remain ordinary control utilities.

## Recovery and media limits

Text recovery is scoped to the account, operation/entity and browser tab, expires after 24 hours, and requires an explicit Restore action. New edits continue saving when an older recovery notice is unanswered. Successful submission and explicit discard clear recovery. Account changes remount form state and remove previous-account drafts. Files and recordings remain in memory while the page is active; reloading requires selecting or recording media again.

Browser/device emulation can establish route behavior and layout, but cannot establish physical iOS/Android keyboard and microphone behavior. Physical-device verification remains a release follow-up.
