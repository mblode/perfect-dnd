# perfect-dnd

Spring physics drag-and-drop with velocity-driven swing animations, built on dnd-kit.

## Features

- **Velocity-driven swing:** Cards tilt and rotate based on cursor velocity during drag — faster drags produce more tilt.
- **Spring settling animation:** On drop, cards spring back to their final position with configurable stiffness, damping, and mass.
- **Two-phase drag system:** A drag overlay handles in-flight animation; a settling overlay takes over on release and animates independently of dnd-kit.
- **Custom spring physics:** Hand-rolled Euler-integrated spring simulation with live target tracking — no Framer Motion dependency.
- **Tunable parameters:** Velocity scale, max rotation, drag scale, and both springs are settings on the store, applied live to the running simulation. No settings UI ships yet.
- **Touch + keyboard support:** iOS-friendly touch sensor with scroll/drag disambiguation; full keyboard drag via dnd-kit's `KeyboardSensor`.
- **Persistent state:** Block order and physics settings are saved to `localStorage`, validated on read so a stale or hand-edited payload cannot feed NaN into the springs.

## Getting Started

Requires Node.js 24+.

```bash
git clone https://github.com/mblode/perfect-dnd.git
cd perfect-dnd
npm install
npm run dev
```

Open [http://localhost:3000/perfect-dnd](http://localhost:3000/perfect-dnd) (the app is served under a `basePath`).

## Development

```bash
npm run dev                  # Start dev server
npm run build                # Production build
npm run check-types          # TypeScript type check
npm run lint                 # Check for lint issues
npm run lint:fix             # Auto-fix formatting and lint issues
```

Architecture notes, including why the drag lifecycle has a single owner, are in
[docs/architecture.md](docs/architecture.md).

## Tech Stack

- [Next.js 16](https://nextjs.org/) — framework with React Compiler enabled
- [dnd-kit](https://dndkit.com/) — drag-and-drop primitives
- [MobX](https://mobx.js.org/) — reactive state management
- [Tailwind CSS v4](https://tailwindcss.com/) — utility-first styling
- [Ultracite](https://github.com/haydenbleasel/ultracite) (oxlint + oxfmt) — linting and formatting

---

Crafted by [<img src="https://blode.co/avatar-circle.png" width="20" align="top" />](https://blode.co) [Matthew Blode](https://blode.co)
