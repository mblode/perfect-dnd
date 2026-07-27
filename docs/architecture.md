# Architecture brief

A single-page dnd-kit demo whose point is the feel of the motion. The
architecture exists to keep the physics honest and the drag lifecycle
unambiguous; everything else is deliberately small.

## Context and constraints

- One deployable surface: a static Next.js App Router page under `basePath: /perfect-dnd`.
- No backend, no auth, no tenancy. State is a demo list plus physics settings in `localStorage`.
- Team size 1. Quality bar is "the drag feels right and never strands a card".
- Type check, lint, unit tests, and a browser drag are the gates.

## Repo shape

Single app, no `packages/`. Extracting shared packages would couple release
cycles for no second consumer.

```
app/            Route, layout, global CSS
components/
  dnd-kit/      The list, the two overlays, the card
                (no ui/ yet; components.json points shadcn here when needed)
hooks/          useDragSwing: the in-flight physics hook
lib/
  dnd/          Drag lifecycle type, DOM contract, sensors, pointer tracking
  spring/       Framework-free physics: simulation, frame loop, velocity, settings
  stores/       MobX store, persistence, demo data
types/          Shared domain types
docs/           This brief
```

The split that matters is `lib/spring/` (pure, framework-free, no React or
dnd-kit imports) versus `lib/dnd/` (knows about dnd-kit and the DOM). The
physics can be reasoned about, and eventually tested, without a browser drag.

## Module contracts

| Module | May import | Must not | Enforcement |
|---|---|---|---|
| `lib/spring/*` | nothing app-specific | React, dnd-kit, the store | Review; no such import exists today |
| `lib/dnd/*` | `lib/spring` | React components, the store | Review |
| `lib/stores/*` | `lib/spring`, `lib/dnd` | components, hooks | Review |
| `hooks/`, `components/` | anything in `lib/` | writing `dragPhase` outside the page | Review |

These are directional rules, not lint-enforced. oxlint has no import-boundary
rule in this setup; at four modules the review cost is lower than the tooling
cost. Revisit if the app grows a second surface.

## Drag lifecycle: one owner

The core invariant. `Store.dragPhase` is a tagged union:

```ts
{ status: "idle" }
{ status: "dragging"; blockId }
{ status: "settling"; blockId; origin }
```

Previously this was five independent fields (`activeBlockId`, `settlingBlockId`,
`dropAnimationRect`, `dropAnimationRotation`, `dropAnimationScale`). That let
illegal combinations exist, and two components both wrote them on release:
`dnd-kit-page` called `endDrag()` on cancel while `useDragSwing` called
`startSettling()`, so the outcome depended on the order dnd-kit happened to
dispatch its callbacks in.

Now:

- `EditorPage` makes every transition.
- `useDragSwing` reports through `onRelease(origin | null)` and writes no state.
- `beginSettling` is a no-op unless the phase is `dragging`, so overlapping
  release and cancel converge on the same result whatever the order.
- `onRelease(null)` means "nothing to animate" (cancelled, or the card left the
  DOM) and goes straight to idle. The old code returned early when the card
  element was missing, leaving `activeBlockId` set and the overlay stranded.

## Physics boundaries

- Springs run on `requestAnimationFrame` and write CSS custom properties and
  inline transforms directly. **No React render is involved in a frame.**
- `runSpringLoop` owns rAF scheduling, the settle watchdog, and cleanup. Both
  animation phases use it; they previously hand-rolled the loop, the frame
  counter, and the 120-frame / 2000 ms guard separately, in two files.
- The watchdog is wall-clock as well as frame-count based, so a settle paused by
  a backgrounded tab (where rAF is frozen) lands the card on target when the tab
  returns rather than resuming a stale animation.
- `RotationSpringSettings` *is* `SpringConfig`, and `ScaleSpringSettings` is it
  without `mass`, so settings pass straight to `createSpring`. Three
  field-by-field copies are gone, and with them the nine-entry effect dependency
  array they forced in the settling overlay.

## DOM contract

The overlays render outside the sortable list and cannot hold refs into it, so
they find their counterparts by data attribute. `lib/dnd/dom.ts` owns the
attribute names, the marker helpers that write them, and the lookups that read
them. `app/globals.css` is a third consumer (iOS `touch-action`, GPU hints),
noted in that file because CSS cannot be type-checked against it.

## Frontend boundaries

- Server Components by default; `"use client"` sits on the interactive leaves.
- One owner per piece of data. Server-less here, so the store owns list order
  and settings, component state owns nothing cross-cutting, and physics lives in
  refs precisely because it must not be state.
- `useDragSwing` has no `onDragStart`. The overlay that mounts it renders only
  after a drag is in flight, so dnd-kit has already dispatched `onDragStart`
  before a monitor can register. The old handler was ~50 lines of unreachable
  code duplicating the mount effect.

## Testing strategy

Vitest in a node environment, covering the pure logic that can regress silently
and independently of its callers: the spring integrator, the velocity tracker,
and the `dragPhase` state machine. `lib/spring/` was carved out to make this
possible; everything under test takes its clock as an argument, so no DOM, no
fake timers, and no component harness are involved.

Deliberately not covered, because it would need a browser rather than a unit
test: the pointer-delta fallback in `handleDragMove`, and the "overlay card
element is missing" path through `findOverlayCard`.

Each regression test was proven to fail against the unfixed code. Reverting the
velocity guard to its old `=== POSITIVE_INFINITY` form, removing the
`MAX_FRAME_MS` clamp, or removing the `beginSettling` dragging-only guard each
fails exactly the tests naming that behaviour, and nothing else. A test that has
never been seen to fail is not yet coverage.

The browser check is still a gate, not a formality. Verified in Chrome for this
change: drag reorders the list, the card flies back into its slot, the phase
returns to idle, order persists to `localStorage`, a hand-edited empty
`blocksData` falls back to the demo blocks, and no overlay or placeholder is
left behind.

## Quality bar and guardrails

| Guardrail | Before | After |
|---|---|---|
| Lint | `oxlint.config.ts` enabled **zero** rules | Full Ultracite core + react + next rule set, passing |
| Build type safety | `typescript.ignoreBuildErrors: true` | Removed; type errors fail the build |
| `lint:fix`, `format:check` | Called `biome`, which is not a dependency | Use ultracite / oxfmt |
| Suppressions | A `biome-ignore` in an oxlint repo, suppressing nothing | `oxlint-disable-next-line` with a reason |
| Tests | No framework, no `test` script | Vitest over the physics and the drag state machine |

The stale comment claiming the source "predates Ultracite's strict rule set"
was wrong: enabling the full set produced exactly one violation, in a file with
a suppression that no longer matched the linter.

## Rollout and rollback

One static page, no migrations, no persisted-schema change: `dragPhase` is
runtime-only and `localStorage` still holds the same `blocksData` and
`dragSwingSettings` shape, so an old payload loads unchanged and a rollback
needs no data work. Rollback is `git revert`.

## Open risks and follow-ups

- **No settings UI.** The store exposes setters, persistence, and live
  reconfiguration, and nothing drives them. This is the one remaining dead
  surface: `setDragSwingSetting`, `setRotationSpringSetting`,
  `setScaleSpringSetting`, and `resetDragSwingSettings` have no callers. They
  are kept because deleting them also makes settings persistence, the
  finite-number validation, and the live `autorun` reconfiguration pointless,
  which removes the tunability the project exists to demonstrate. Build the
  panel or delete the whole subsystem; do not leave it half-owned much longer.
  The six shadcn primitives that would have built that panel were deleted, along
  with the five Radix and CVA dependencies that existed only for them;
  `components.json` remains, so `npx shadcn add` brings any of them back.
- **Drop-position indicator removed.** `overBlockId` / `dropPosition` were
  written on every drag-over and never read. Deleted rather than left as a
  half-built feature; re-add with the indicator that needs it.
- **Import boundaries are review-enforced, not lint-enforced.** Acceptable at
  four modules; add a rule if the app grows. In particular nothing mechanically
  stops `lib/spring/` importing React or dnd-kit, which would break the property
  that makes it unit-testable in a node environment.
- **dnd-kit hydration warning.** `useUniqueId` uses a module counter rather than
  `useId`, so `aria-describedby` mismatches in dev. Library-internal and
  pre-existing; do not work around it in app code.
- **Component and integration behaviour is untested.** The drag lifecycle is
  covered at the store, and the physics at the function, but nothing exercises
  `useDragSwing` or the two overlays. A regression in how they are wired
  together still only shows up in a manual drag.
