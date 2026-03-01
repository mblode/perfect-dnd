# perfect-dnd

Spring physics drag-and-drop with velocity-driven swing animations, built on dnd-kit.

## Features

- **Velocity-driven swing:** Cards tilt and rotate based on cursor velocity during drag — faster drags produce more tilt.
- **Spring settling animation:** On drop, cards spring back to their final position with configurable stiffness, damping, and mass.
- **Two-phase drag system:** A drag overlay handles in-flight animation; a settling overlay takes over on release and animates independently of dnd-kit.
- **Custom spring physics:** Hand-rolled Euler-integrated spring simulation with live target tracking — no Framer Motion dependency.
- **Tunable parameters:** Adjust velocity scale, max rotation, drag scale, and both rotation and scale springs through a live settings panel.
- **Touch + keyboard support:** iOS-friendly touch sensor with scroll/drag disambiguation; full keyboard drag via dnd-kit's `KeyboardSensor`.
- **Persistent state:** Block order and physics settings are saved to `localStorage` via MobX Persist Store.

## Getting Started

Requires Node.js 20+.

```bash
git clone https://github.com/mblode/perfect-dnd.git
cd perfect-dnd
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Development

```bash
npm run dev                  # Start dev server
npm run build                # Production build
npm run check-types          # TypeScript type check
npm run lint                 # Check for lint issues
npm exec -- ultracite fix    # Auto-fix formatting and lint issues
```

## Tech Stack

- [Next.js 16](https://nextjs.org/) — framework with React Compiler enabled
- [dnd-kit](https://dndkit.com/) — drag-and-drop primitives
- [MobX](https://mobx.js.org/) — reactive state management
- [Tailwind CSS v4](https://tailwindcss.com/) — utility-first styling
- [Biome](https://biomejs.dev/) + [Ultracite](https://github.com/haydenbleasel/ultracite) — linting and formatting
