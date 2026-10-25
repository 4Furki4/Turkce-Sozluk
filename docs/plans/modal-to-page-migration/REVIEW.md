# Implementation review and resolution

Blind Hunter and Edge Case Hunter independently reviewed the complete tracked/untracked diff from `22d5661`, followed by verification of the fixes. No remote review comments or repository changes were made by reviewers. Findings were deduplicated and resolved as implementation patches; no intent decision was required.

| Finding | Consequence / severity | Resolution |
| --- | --- | --- |
| Consecutive list setters read an uncommitted URL | Filters or page size silently revert; high | Remove redundant pagination writes; coupled filter/size setters already reset page 1 |
| Recovery notice stops saving replacement edits | New text can disappear after refresh; high | Continue saving subsequent edits; focused recovery regression test |
| Restored form IDs differ from visible select state | Users can submit selections they cannot see; high | Drive selection from RHF values and mark programmatic selection changes dirty; browser recovery test |
| Contribution tabs bypass leave handling | Text/media lost when changing mode; high | Shared guarded `navigateTo` action; browser Keep/Discard test |
| Audio state does not mark task dirty; tracks outlive task | Lost recordings or active microphone after navigation; high | Dirty signal, active/pending permission cleanup, actual recording MIME and object-URL cleanup; hook and browser denial tests |
| Supporting editor Enter submits parent | Wrong mutation or parent validation; high | Inline input Enter invokes its own form validation; preserve textarea Enter |
| Repeated supporting Enter bypasses loading button | Duplicate author/attribute requests; high | Shared synchronous submission lock plus RHF/mutation pending guards; regression test |
| Rejection page omits request context | Ambiguous consequential action; medium | Show request number/type/action, contributor, reason and shared request detail display |
| Autocomplete recovery does not restore selection/display together | Blank or misleading selected target; high | Persist selected ID and label, seed selected option and clear ID when search is edited. Allow unselected search text in the control while requiring a selected ID in form validation, so dismissal cannot reopen a controlled menu or erase a query while scrolling |
| Initial selected-word lookup makes an untouched editor dirty | Return unnecessarily requires Discard; medium | Fetch selected word labels with the three admin ID lookups and use them in the draft baseline |
| Word correction sends `name` to a `wordName` API contract | Spelling correction discarded; high | Map the existing form field to the accepted API name; DB-backed moderated-request assertion |
| Nested menu links do not cover menu keyboard activation | Enter can fail to open task; medium | Whole menu items use localized anchor URLs; use HeroUI Button triggers with 44px targets |
| Language switch only carries older `id`/`slug` parameters | New task links contain unresolved route placeholders; medium | Preserve all route parameters except locale, including word/meaning/relation/user IDs; focused hook and browser coverage |
| Enlarged English labels overflow the narrow badge form | Labels obscure controls at 320px; medium | Outside labels wrap within the available width; preserve multiline description fields |

The apparent deletion of feedback/suggestion launchers was withdrawn by the reviewer: these files are compact link replacements and compile successfully.

The remaining lint warnings are recorded in IMPLEMENTATION.md. This review does not establish physical-device keyboard/media behavior or production deployment health.

## Navigation and layout follow-up

The user's screenshot feedback identified that editor returns skipped the contribution chooser. The shared link contract now carries each immediate source. Only read-only choosers may be intermediate task returns, and self loops/unfinished editors remain rejected. Direct and older editor links wrap the original source behind the chooser fallback. Word / Contribute / Task breadcrumbs and Back/Cancel/completion share this behavior.

Impeccable layout assessment replaced nested form frames and loose underlined links with a compact navigation strip, one heading, a single workspace, semantic field groups and a common action footer. The chooser uses action rows and divided meaning/relationship lists. Mechanical scan: no findings. Rendered confirmation covered both locales/themes/viewports and enlarged text. Navigation tests and the exact split browser-run results are recorded in IMPLEMENTATION.md.
