# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains the Next.js App Router, global styles, and metadata assets (for example `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, and icons).
- `components/` holds shared UI components.
- `hooks/` holds reusable React hooks.
- `lib/` contains shared utilities and state/helpers used across features.
- `types/` contains shared TypeScript types.
- `public/` contains static assets served from the site root.

## Build, Test, and Development Commands
- `npm run dev`: start the local dev server (default: `http://localhost:3000`).
- `npm run build`: create a production build with Next.js.
- `npm run start`: run the production build locally.
- `npm run lint`: run Biome lint checks across the repo.
- `npm run lint:fix`: auto-fix lint issues with Biome.
- `npm run format`: format files with Biome (`npm run format:check` verifies formatting).
- `npm run check-types`: run TypeScript type checking without emitting output.

## Coding Style & Naming Conventions
- TypeScript + React throughout; prefer `*.tsx` for components and `*.ts` for utilities.
- Indentation is 2 spaces, enforced by Biome (`biome.json`).
- Hooks should be named with the `useX` prefix; components should use `PascalCase`.
- Formatting is enforced via Biome and `ultracite`; the pre-commit hook runs `npx ultracite fix` on staged files.

## Testing Guidelines
- No dedicated test framework or test folders are present in the repo today.
- Current quality gates are `npm run lint` and `npm run check-types`.
- If you add tests, keep them close to the feature and use a clear suffix like `*.test.ts(x)`.

## Commit & Pull Request Guidelines
- Recent commit history uses very short summaries (e.g., “Save”, “analytics”, “opengraph”). Keep messages brief and imperative; add a scope if it clarifies intent.
- PRs should include a concise description, the impact on UI/behavior, and how you validated changes (commands or manual steps).
- For UI changes, include before/after screenshots or a short recording. Link related issues if applicable.
