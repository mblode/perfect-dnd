# Repository Guidelines

A single-page dnd-kit demo: a sortable list whose drag tilt and drop settle are
driven by a hand-rolled spring simulation. There is no backend and no test
suite; `check-types`, `lint`, and a real browser drag are the quality gates.

## Commands

- `npm run dev` — dev server on `http://localhost:3000/perfect-dnd` (note the `basePath`).
- `npm run build` — production build. Type errors fail the build.
- `npm run check-types` — `tsc --noEmit`.
- `npm run lint` / `npm run lint:fix` — Ultracite (oxlint + oxfmt).
- `npm run format` / `npm run format:check` — oxfmt.

Lefthook runs `npx ultracite check` on staged files pre-commit.

## Architecture

Read `docs/architecture.md` before changing drag behaviour. The two rules that
are not obvious from the code:

- **One owner for the drag lifecycle.** `Store.dragPhase` is a tagged union
  (`idle | dragging | settling`) in `lib/dnd/drag-phase.ts`. Only
  `dnd-kit-page.tsx` transitions it. `useDragSwing` reports what the pointer
  did through `onRelease` and never writes to the store; adding a store write
  there reintroduces the cancel race the union was built to remove.
- **Physics never renders.** Springs run on rAF and write CSS custom properties
  and inline transforms straight to the DOM. Nothing in `lib/spring/` may cause
  a React render; a `setState` in a frame callback drops the animation to React's
  render rate.

`lib/dnd/dom.ts` holds the data-attribute contract between the list and the
overlays. `app/globals.css` also styles those attributes, so renaming one there
means editing the CSS too.

## Gotchas

- `useDragSwing` has no `onDragStart` handler on purpose. The overlay that
  mounts it only renders after a drag is already in flight, so dnd-kit has
  already dispatched `onDragStart` before a monitor can register. Mounting is
  the drag-start signal.
- Spring settings come from persisted, untrusted JSON. `lib/stores/persistence.ts`
  copies only finite numbers; a NaN reaching the integrator poisons every later
  frame with no error.
- dnd-kit logs a hydration mismatch on `aria-describedby` in dev. Its
  `useUniqueId` uses a module-level counter rather than `useId`, so server and
  client disagree. It is a library bug, not ours; do not try to "fix" it in app code.
- `requestAnimationFrame` is frozen in a hidden tab, so a settle pauses when the
  tab is backgrounded. The settle watchdog is wall-clock based, so it lands the
  card on target as soon as the tab returns. Automated browser drags need a
  visible tab or they appear stuck.

## Testing

No test framework. Verify drag changes in a browser: drag a card, confirm the
order changes, the card flies back into its slot, and the list returns to rest
with no overlay left behind (`document.querySelectorAll('[data-settling-target]')`
should be empty). If you add tests, colocate them as `*.test.ts(x)`.

## Commits & PRs

Short, imperative summaries with a scope when it clarifies (`analytics: …`).
PRs describe the behaviour change and how it was validated; include a recording
for motion changes, since a screenshot cannot show a spring.
