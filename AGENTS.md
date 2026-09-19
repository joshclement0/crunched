# Repository conventions

## React component boundaries

- Keep page entry components thin. They should coordinate state and compose child components, not contain full page markup.
- Every React component must have one primary responsibility: either layout/composition or a small, cohesive piece of view and interaction logic.
- Extract repeated or independently understandable UI into focused components.
- Move reusable or multi-step state transitions into hooks or plain functions instead of embedding them in view markup.
- Keep shared types, constants, and styles in dedicated modules when doing so reduces duplication or keeps components focused.
- When modifying an existing large component, preserve this separation rather than adding more responsibilities to it.

## Verification

- After TypeScript or React changes, run the production build and lint checks. Resolve compile and lint errors before handing work back.
