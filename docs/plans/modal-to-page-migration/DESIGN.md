---
name: Turkish Dictionary task pages
description: Existing Turkish Dictionary visual system applied to routed contribution and dashboard tasks.
status: implemented
updated: 2026-10-16
source-baseline: b6bf1a1
sources:
  - PLAN.md
  - .memlog.md
colors: {} # No overrides; inherit the existing light/dark theme tokens.
typography:
  title:
    note: Existing font family; fixed text-2xl mobile and text-3xl desktop headings.
  body:
    note: Existing application body and form-label typography.
rounded: {} # Inherit existing HeroUI wrappers and Tailwind utilities.
spacing: {} # Inherit existing page gutters and form spacing.
components:
  task-header:
    title: '{typography.title}'
  task-body:
    surface: bg-background/40
    text: '{typography.body}'
  supporting-editor:
    surface: bg-background/40
  action-area:
    primary: Existing HeroUI primary action variant
  status-region:
    text: '{typography.body}'
  draft-decision:
    surface: bg-background/40
---

## Brand & Style

Inherit the current Turkish Dictionary identity, HeroUI wrappers, Tailwind system, theme behavior, and lucide-react icon style. This migration changes task presentation and navigation. It introduces no brand direction. [PLAN.md](./PLAN.md) owns the route inventory, page anatomy, and delivery order; [EXPERIENCE.md](./EXPERIENCE.md) owns behavior.

## Colors

Keep the established red `primary`, neutral `background`, and existing foreground, border, focus, validation, and status tokens in both themes. Main task and section surfaces use `bg-background/40`, preserving the shared red background gradient. Add no page-local gradient or new palette. Verify text and controls against their actual translucent backgrounds at WCAG AA contrast targets.

## Typography

Use {typography.title} for one descriptive task heading and {typography.body} for fields, instructions, and outcomes. Keep the current font family and type hierarchy. Long Turkish/English labels and entity names may wrap; preserve the full task meaning at 200% text.

## Layout & Spacing

The 2026-10-16 layout refinement uses one compact navigation strip, a prominent heading with optional explanation, and a single workspace surface. The strip separates the labelled Back action from the complete breadcrumb chain. Intermediate word contribution steps remain visible and wrap on mobile; the breadcrumb leaf uses a short task label instead of repeating the entire heading.

The contribution chooser uses full-width action rows, an ordered meaning list, and equivalent relationship sections that sit side by side only when there is room. Editors group word details and the reason in separate sections, with one divided action footer. No nested form card remains. Controls in the word editor align at 48px; actions have 44px minimum targets. Short field gaps and larger section gaps create the hierarchy. Mobile gutters tighten and actions wrap at enlarged text sizes.

Use normal document scrolling and content-driven height. Retain the existing theme and reduced-motion behavior. No sticky action bar or new motion is introduced. Back, Cancel and successful submission return through the immediate chooser step; the chooser preserves the original reading/list context.

## Elevation & Depth

Use one translucent workspace surface with a quiet border and soft offset shadow. Section dividers and typography establish groups inside it. Routed tasks add no backdrop layer, elevated modal frame or nested cards.

## Shapes

Inherit wrapper radii and field shapes. Match visible Input `inputWrapper`, Select `trigger`, and adjacent Button heights, labels, padding, and baselines.

## Components

| Component | Visual contract |
| --- | --- |
| Task header | Labelled left arrow and breadcrumbs above {components.task-header.title}; use existing links and lucide-react icon sizing. |
| Task body | {components.task-body.surface}, existing field wrappers, visible labels, inherited typography and spacing. |
| Supporting editor | Inline section within the task body; visually subordinate, with the same field vocabulary. |
| Action area | One clear existing primary action plus a secondary Cancel; stack without clipped labels on mobile. |
| Status region | Existing loading/error/success styling; text communicates state independently of color. |
| Draft decision | Inline explanation with Keep editing / Discard changes actions using existing button variants. |

## Do's and Don'ts

Preserve SSR visibility, existing route transitions, theme, and reduced-motion behavior. Keep keyboard focus visible. Do not transfer modal max-heights, nested scrolling, body locks, focus traps, or animation choreography into task pages. Rendered Turkish/English, light/dark, desktop/mobile checks and navigation regressions are recorded in IMPLEMENTATION.md.
