# Architecture brief

Produced by an adoption pass over the existing codebase: domain-informed
deepening, not a rewrite. Records what the structure is, what enforces it, and
which opportunities were considered and dropped.

## Context and constraints

A single-page demo whose product *is* the feel of dragging a card. No backend,
no auth, no multi-tenancy; state lives in the browser. Deployed as a static
Next.js app under `blode.co/perfect-dnd`. One maintainer.

The binding constraint is frame budget. Everything on the drag path runs 60+
times a second, so the architecture optimises for keeping physics out of React's
render cycle and for keeping the two animation phases from disagreeing.

## Domain glossary

| Concept | Where it lives | Notes |
|---|---|---|
| Block | `types/block.ts`, `lib/stores/mock-blocks.ts` | The draggable item. Has `order` within a `pageId`. |
| Drag phase | `lib/dnd/drag-phase.ts` | The lifecycle: idle, dragging, settling. |
| Settle origin | `lib/dnd/drag-phase.ts` | Rect, tilt, and scale at the moment of release. The handoff between the two overlays. |
| Swing | `hooks/use-drag-swing.tsx`, `lib/spring/velocity.ts` | Velocity-driven tilt while held. |
| Settle | `components/dnd-kit/settling-overlay.tsx` | The flight home after release. |
| Spring | `lib/spring/spring.ts` | One scalar simulation with a live target. |

## Repo shape

Single app, no workspaces. Splitting into `apps/` or `packages/` would add
release coupling for one deployable surface and no shared consumers.

```
app/                     Next.js App Router
components/dnd-kit/      the drag surface
components/ui/           shadcn primitives (staged, see Open risks)
hooks/                   use-drag-swing
lib/spring/              physics: no React, no dnd-kit
lib/dnd/                 dnd-kit integration
lib/stores/              MobX store, persistence, demo data
types/
```

The one hard layering rule: `lib/spring/` depends on nothing in the app.
It is the piece worth testing and the piece worth reusing.

## Module contracts

| Module | Responsibility | Must not | Enforcement |
|---|---|---|---|
| `lib/spring/*` | Pure physics and frame scheduling | Import React, dnd-kit, MobX, or the store | Import review; the modules have no such imports today |
| `lib/dnd/drag-phase.ts` | The lifecycle type and its accessors | Hold behavior; it is data plus three pure functions | `tsc` (exhaustiveness on the union) |
| `lib/dnd/dom.ts` | Both ends of the data-attribute contract | Be bypassed by hand-written attribute strings | Grep: the literals appear only here |
| `lib/stores/persistence.ts` | Read, validate, write localStorage | Throw. Every failure resolves to defaults | `tsc`; every path returns a value |
| `lib/stores/store.tsx` | Domain state and transitions | Touch the DOM or schedule frames | Review |
| `hooks/use-drag-swing.tsx` | Pointer velocity to CSS custom properties | Write store state | Type: it takes `onRelease` and returns only refs |
| `components/dnd-kit/*` | Rendering and event wiring | Reimplement physics | Review |

## State ownership

Each piece of state has exactly one owner.

- **Drag lifecycle:** `store.dragPhase`, transitioned only by `EditorPage`. The
  overlays report events upward. This was the main defect fixed in this pass:
  `EditorPage` and `useDragSwing` both wrote drag state, so a cancel produced a
  different result depending on the order dnd-kit dispatched to props versus
  monitors.
- **Illegal states are unrepresentable.** The lifecycle was five loose fields
  (`activeBlockId`, `settlingBlockId`, `dropAnimationRect`, `dropAnimationRotation`,
  `dropAnimationScale`). A settle rect with no settling id was reachable, and was
  exactly the state the app got stuck in when the overlay card could not be found.
  It is now one tagged union.
- **Transitions are order-independent.** `beginSettling` is ignored unless a drag
  is in flight; `endDrag` is idempotent. Whatever order dnd-kit delivers release
  and cancel in, the result is the same.
- **Physics values live in refs**, never in state, and are written to CSS custom
  properties. State would mean a render per frame.
- **Server data has no owner** because there is no server. Persisted state is
  applied once in a layout effect after hydration, so the first client render
  still matches the server HTML.

## Frontend boundaries

`app/page.tsx` is a server component that renders one client subtree. `"use client"`
sits on the drag components, not on the layout, so the shell still streams.

The two-overlay design is deliberate. dnd-kit drops its overlay the instant the
pointer lifts, which is too early for a spring settle, so `dropAnimation` is
disabled and `SettlingOverlay` renders outside dnd-kit entirely. The seam
between them is `SettleOrigin`: one value, captured before the release is
reported, since reporting unmounts the element it was measured from.

## Testing strategy

No test framework today. The gates are `npm run lint`, `npm run check-types`,
and `npm run build` (which now fails on type errors).

None of those cover the physics, so drag changes are verified in a browser
against: tilt responds to pointer speed, the card settles into its slot without
jumping, no overlay is left stranded, and Escape mid-drag returns to idle.

`lib/spring/` is pure and dependency-free, which makes it the natural first test
target: spring convergence, velocity over a sliding window, and the loop's
settle deadline are all assertable without a DOM.

## Quality bar and guardrails

| Guardrail | Enforcement |
|---|---|
| Full Ultracite rule set (core, react, next) | `oxlint.config.ts`, `npm run lint`, lefthook pre-commit |
| Formatting | oxfmt via Ultracite, same hook |
| Type errors block release | `next.config.ts` no longer sets `ignoreBuildErrors` |
| Vendored code is marked | Header block in `lib/dnd/tracked-sensors.ts` |
| Rules live in tooling, not prose | `AGENTS.md` documents architecture; the linter owns style |

Before this pass `oxlint.config.ts` enabled zero rules, so `npm run lint` only
checked formatting, and two of the four lint scripts invoked `biome`, which is
not a dependency. The full rule set now passes with one justified suppression.

## Rollout and rollback

One static deployment, no migrations, no feature flags. Rollback is reverting
the commit and redeploying.

The one stateful surface is the `perfect-dnd-store` localStorage key. Its shape
is unchanged by this work, and `readPersistedState` validates every field on
read, so a payload written by any version resolves to defaults rather than
breaking the app. A rollback therefore needs no data migration.

## Validation

Run before finalising this brief.

| Check | Evidence |
|---|---|
| Consistency | Contradiction scan over every claim above. One finding, fixed: `data-sortable-item` is read by `globals.css`, not by JS, so a JS-only grep wrongly showed it dead and it was briefly dropped from the card. It is now issued through `lib/dnd/dom.ts` with the CSS dependency documented. |
| Enforceability | Every contract in the tables names its enforcement. Three rely on review rather than tooling, and are listed as such rather than claimed as enforced. |
| Operability | One static surface. Rollback is a revert; the persisted payload is version-tolerant by validation, so no migration is involved. |
| Quality gates | `npm run lint`, `npm run check-types`, and `npm run build` all pass. The full Ultracite rule set is enabled, with one justified suppression (`next/no-img-element` on a self-hosted 20px avatar). |
| Behavior | Driven in Chromium against the production build: tilt tracks pointer velocity (`--motion-rotate` non-zero, `--motion-scale` 1.04), reorder lands correctly, the settle overlay mounts and tears itself down leaving no stranded node, the order survives a reload, Escape mid-drag returns to idle with nothing left hidden, and the iOS touch rules resolve on the card. |

## Open risks and follow-ups

- **Physics has no automated coverage.** The riskiest code in the repo is
  verified by hand. `lib/spring/` is pure; unit tests there are the highest-value
  next investment.
- **Settings are tunable but not tuneable by a user.** The store exposes setters,
  the values persist and validate, and `components/ui/` holds the primitives, but
  no panel renders them. Either build the panel or delete the setters and the
  primitives together; leaving it half-built is what made the README wrong.
- **The vendored sensor fork will drift** from `@dnd-kit/core`. Diff it on every
  bump. Delete it if dnd-kit ever exposes pointer coordinates.
- **`block.visible` is modelled but never rendered.** Demo data marks one block
  hidden and the UI ignores it.
- **The CSS end of the DOM contract is unenforced.** `globals.css` selects the
  same three data attributes that `lib/dnd/dom.ts` defines, and nothing links
  them. Renaming an attribute silently drops a style rule, which is exactly how
  the iOS touch rules were briefly lost during this pass. A CSS-aware lint rule
  or a smoke test asserting `touch-action` on a card would close it.

### Out of scope (deferred)

Recorded so a future pass does not re-evaluate them from scratch.

- **Split `lib/dnd/` further into transport and policy layers.** No current
  variation to absorb; the module is four small files with one consumer each.
- **Extract a `packages/spring` library.** Wait for a second consumer. One app
  does not justify a release cycle.
- **Replace MobX with `useState` plus context.** MobX earns its place: the store
  is read by several components at different depths and updated outside React's
  event system. Not a change to make without a reason.
- **Delete `components/ui/` as dead code.** Deferred rather than done: they are
  the settings panel's building blocks, and deleting them prejudges the decision
  above. Re-evaluate once the panel ships or is abandoned.
- **Drop-position indicator.** `overBlockId` and `dropPosition` were written on
  every drag-over and read by nothing, so the state and its handler were removed.
  Rebuild both together if the indicator is ever wanted.
- **`"type": "module"` in `package.json`.** Would silence a Node warning on every
  lint run, but changes module resolution for every config file in a Next.js app.
  Not worth the blast radius for a cosmetic warning.
