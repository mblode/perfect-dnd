# Repository Guidelines

## Project Structure & Module Organization

- `app/` is the Next.js App Router: `page.tsx`, `layout.tsx`, `globals.css`, and metadata assets.
- `components/dnd-kit/` holds the drag surface: the list page, the card, and the two overlays.
- `components/ui/` holds shadcn primitives. Nothing imports them yet; they are staged for the settings panel (see Known gaps).
- `hooks/use-drag-swing.tsx` turns pointer velocity into tilt and scale on the in-flight overlay.
- `lib/spring/` is the physics: `spring.ts` (simulation), `loop.ts` (rAF driver), `velocity.ts` (pointer velocity to tilt), `settings.ts` (tunables). Framework-free and independent of dnd-kit.
- `lib/dnd/` is the dnd-kit integration: the drag phase machine, the DOM contract, the pointer tracker, and the vendored sensors.
- `lib/stores/` holds the MobX store, its localStorage persistence, and the demo data.
- `types/` holds shared types; `public/` holds static assets served from the site root.

## Build, Test, and Development Commands

- `npm run dev`: local dev server on `http://localhost:3000/perfect-dnd`.
- `npm run build`: production build. Type errors fail the build.
- `npm run start`: serve the production build.
- `npm run lint`: Ultracite (oxlint + oxfmt) check across the repo.
- `npm run lint:fix`: auto-fix lint and formatting.
- `npm run check-types`: `tsc --noEmit`.

## Architecture

**The drag lifecycle is one value.** `store.dragPhase` is a tagged union in `lib/dnd/drag-phase.ts`: `idle`, `dragging`, or `settling`, never a combination. Add drag state to the phase, not as a sibling field, so illegal pairs stay unrepresentable.

**`EditorPage` owns every phase transition.** The overlays report what the pointer did and never write phase state themselves. Two components mutating the lifecycle is what made drag-cancel order-dependent before.

**Two overlays, one handoff.** `DragSwingOverlay` animates the card while it is held; on release it hands a `SettleOrigin` (rect, tilt, scale) to `SettlingOverlay`, which flies the card home outside dnd-kit's control. dnd-kit's own `dropAnimation` is disabled on purpose.

**Overlays find cards by data attribute** because they render outside the list and cannot be handed refs. Both ends of that contract live in `lib/dnd/dom.ts`. Do not hand-write the attribute strings.

**`lib/dnd/tracked-sensors.ts` is a vendored fork** of dnd-kit's internal pointer sensor, forked only to record absolute pointer positions. Keep it close to upstream; diff it when bumping `@dnd-kit/core`.

**Physics runs in refs, never state.** Spring values change every frame and are written straight to CSS custom properties. A `setState` per frame would re-render the tree 60 times a second.

## Coding Style & Naming Conventions

Formatting and lint are enforced by Ultracite (`oxlint.config.ts`, `oxfmt.config.ts`) and run on staged files by lefthook. Run `npm run lint:fix`; do not hand-format.

Conventions the linter cannot check:

- Components are `PascalCase` in `*.tsx`; hooks are `useX`; utilities are `*.ts`.
- Comments say *why*, not *what*. Prefer deleting a comment that restates the code.
- No barrel files. Import from the module that defines the symbol.

## Testing

There is no test framework in the repo. The quality gates are `npm run lint`, `npm run check-types`, and `npm run build`.

None of those exercise the physics, so **verify drag changes in a browser**: drag a card, confirm it tilts with pointer speed, settles into its new slot without jumping, and leaves no stranded overlay. Check Escape mid-drag too, which is the path that regresses most easily.

If you add tests, keep them next to the feature with a `*.test.ts(x)` suffix. `lib/spring/` is pure and the natural place to start.

## Known gaps

- The physics tunables in `store.dragSwingSettings` have setters and are persisted, but no UI moves them. The `components/ui/` primitives are staged for that panel.
- Nothing renders `block.visible`, and nothing shows a drop-position indicator.

## Commit & Pull Request Guidelines

- Commit messages: short, imperative, sentence case, with a scope when it clarifies intent.
- PRs: what changed, the impact on behavior, and how it was validated.
- For UI or motion changes, include a before/after recording. Drag feel does not survive a still screenshot.
