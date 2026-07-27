# perfect-dnd

Spring physics drag-and-drop with velocity-driven swing animations, built on dnd-kit.

## Features

- **Velocity-driven swing:** Cards tilt based on cursor velocity during drag — faster drags produce more tilt, and the tilt lags behind the hand.
- **Spring settling animation:** On release, cards spring into their final slot with configurable stiffness, damping, and mass.
- **Two-phase drag system:** A drag overlay handles in-flight animation; a settling overlay takes over on release and animates independently of dnd-kit.
- **Custom spring physics:** Hand-rolled Euler-integrated spring simulation with live target tracking — no Framer Motion dependency.
- **Tunable parameters:** Velocity scale, max rotation, drag scale, and both springs are adjustable through the store's settings API and persist across reloads. No settings UI ships yet.
- **Touch + keyboard support:** iOS-friendly touch sensor with scroll/drag disambiguation; full keyboard drag via dnd-kit's `KeyboardSensor`.
- **Persistent state:** Block order and physics settings are written to `localStorage`, debounced, and validated on read so a stale payload cannot break the physics.

## Getting Started

Requires Node.js 24+.

```bash
git clone https://github.com/mblode/perfect-dnd.git
cd perfect-dnd
npm install
npm run dev
```

Open [http://localhost:3000/perfect-dnd](http://localhost:3000/perfect-dnd).

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build (fails on type errors)
npm run check-types  # TypeScript type check
npm run lint         # Check lint and formatting
npm run lint:fix     # Auto-fix lint and formatting
```

## How it works

`lib/spring/` holds the physics, with no dependency on React or dnd-kit: a spring
simulation, an rAF loop that drives springs to rest, and pointer-velocity
sampling over a sliding window.

`lib/dnd/` connects that to dnd-kit. A vendored fork of dnd-kit's pointer sensor
records absolute pointer positions, since dnd-kit itself only reports deltas.
`drag-phase.ts` models the lifecycle as a single tagged union — idle, dragging,
or settling — so the two overlays cannot disagree about what the card is doing.

See [AGENTS.md](AGENTS.md) for the architecture in full.

## Tech Stack

- [Next.js 16](https://nextjs.org/) — framework with React Compiler enabled
- [dnd-kit](https://dndkit.com/) — drag-and-drop primitives
- [MobX](https://mobx.js.org/) — reactive state management
- [Tailwind CSS v4](https://tailwindcss.com/) — utility-first styling
- [Ultracite](https://github.com/haydenbleasel/ultracite) — oxlint and oxfmt preset for linting and formatting

---

Crafted by [<img src="https://blode.co/avatar-circle.png" width="20" align="top" />](https://blode.co) [Matthew Blode](https://blode.co)
