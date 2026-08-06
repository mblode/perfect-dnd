<div align="center">

# [Perfect DnD](https://blode.co/perfect-dnd)

**Spring-physics drag and drop on [dnd-kit](https://dndkit.com), where the card tilts with your cursor and settles on release**

Drag a card fast and it leans into the motion, then springs back into its slot when you let go.

</div>

## Demo

A sortable list you can throw around with a mouse, a finger, or the keyboard.

<p>
<a href="https://blode.co/perfect-dnd">
<img alt="View demo" src=".github/assets/demo.svg" width="200" />
</a>
</p>

## Install

Requires Node 24 or newer.

```bash
git clone https://github.com/mblode/perfect-dnd.git
cd perfect-dnd
npm install
```

## Quickstart

```bash
npm run dev
```

Open [http://localhost:3000/perfect-dnd](http://localhost:3000/perfect-dnd). The app is served under a `basePath`, so the bare root will not find it.

## How the drag feels

- **Velocity-driven tilt:** the card rotates with cursor velocity measured against the oldest sample in a 100ms window, capped at 45 degrees, so one stuttered frame cannot spike it.
- **Spring settling:** on release a second overlay takes over from dnd-kit and springs the card into its slot at stiffness 200 and damping 20, for about 5% overshoot.
- **Two-phase drag:** one overlay animates the card in flight, another animates the settle, and a single tagged union owns the transition between them, so a release cannot race dnd-kit's cancel.
- **No animation library:** a Euler-integrated spring runs on `requestAnimationFrame` and writes CSS custom properties straight to the DOM, so nothing in the physics path causes a React render.

## Tuning

Every constant lives in [`lib/spring/settings.ts`](lib/spring/settings.ts): the velocity window and scale, the rotation ceiling, the held-card scale of 1.04, and both spring configs. Edit and reload, since there is no settings UI.

## Notes

- Mouse drags arm after 10px of travel; touch drags arm after a 250ms hold with 5px of tolerance, which keeps a scroll from becoming a drag. Keyboard drag comes from dnd-kit's `KeyboardSensor`.
- Block order persists to `localStorage` and is validated on read, so a stale or hand-edited payload falls back to the defaults rather than rendering a broken list.
- Why the drag lifecycle has a single owner is written up in [docs/architecture.md](docs/architecture.md).

## License

MIT

---

Crafted by [<img src="https://blode.co/avatar-circle.png" width="20" align="top" />](https://blode.co) [Matthew Blode](https://blode.co)
