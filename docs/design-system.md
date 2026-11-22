# Connectly Design System

The reusable UI library lives under `frontend/src/components/ui`. Import from
the root barrel for convenience or from a category barrel for a narrower,
tree-shakeable dependency:

```tsx
import { Button, Card, PasswordInput } from "@/components/ui";
import { VideoCard } from "@/components/ui/cards";
```

## Tokens and themes

`frontend/src/styles/theme.css` is the source of truth for semantic color,
typography, sizing, spacing, radius, elevation, z-index, duration, easing,
opacity, icon-size, and breakpoint tokens. Existing `canvas`, `surface`,
`primary`, and typography utilities retain their established values. Semantic
status tokens provide light- and dark-theme foreground/background pairs.

`next-themes` remains responsible for the existing Light, Dark, and System
selection. Token values change through the `.dark` class; do not add another
theme provider or persist a second theme preference.

## Component organization

- `buttons`, `inputs`, `cards`, `display`, `navigation`, `overlay`, and
  `feedback` contain reusable controls and content primitives.
- `layout` contains composable layout helpers and aliases to the existing
  application-shell containers/navigation.
- `icons`, `theme`, and `animations` contain focused icon, theme-toggle, and
  Framer Motion APIs.
- Existing flat component paths remain available for compatibility where
  applicable. New work should prefer the typed category APIs.

Use native inputs, disclosures, and dialogs where their built-in keyboard
behavior is useful. Dialog-based overlays are controlled with `open` and
`onOpenChange`, and should be rendered from a client component. Toast and card
components are presentational; they do not add data fetching, timers, or
business logic.

## Accessibility and motion

Form controls forward refs and expose error/label attributes. Buttons, tabs,
menus, disclosures, and dialogs use semantic HTML and visible focus treatment.
The theme stylesheet responds to reduced-motion, increased-contrast, and
forced-colors preferences; Framer Motion helpers also use `useReducedMotion`.
Use an explicit accessible name for icon-only controls, ranges, and progress
indicators.

These are accessibility foundations, not a blanket WCAG certification. Verify
actual color combinations and interaction flows when adding new variants or
composing components.

## Storybook readiness

Components expose typed props, named exports, and deterministic visual states.
Storybook can be added later without changing the component API; it is not
installed or configured in this phase.
