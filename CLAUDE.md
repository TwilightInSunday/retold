# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Start Vite dev server
bun run build        # TypeScript check + Vite production build
bun run test         # Run all tests (Vitest, single-run)
bun run test:watch   # Run tests in watch mode
bun run lint         # Biome linter on src/
bun run lint:fix     # Auto-fix lint errors
bun run format       # Format code with Biome
bun run preview      # Preview production build locally
```

Run a single test file: `bunx vitest run src/__tests__/notes-store.test.ts`

## Architecture

**RETRO.DO** — a spatial todo/whiteboard PWA where sticky notes live on a canvas with swim-lane zones.

### Offline-First Data Flow

IndexedDB is the **primary data source**, not the API. The app works fully offline (deployed to GitHub Pages with no backend).

1. **Zustand stores** (`store/`) hold runtime state: notes (Map), board (viewport/zoom), sync queue
2. **Persist middleware** (`store/middleware/persist.ts`) intercepts all state mutations and writes to IndexedDB asynchronously
3. **Sync engine** (`sync/`) queues CREATE/UPDATE/DELETE operations for eventual server push with exponential backoff
4. **Conflict resolution** (`sync/conflict.ts`) uses last-write-wins per entity via `updatedAt` timestamps

IndexedDB has 3 object stores: `notes`, `boards`, `syncOps` (defined in `db/schema.ts`).

### UI Layer

- **Canvas** (`components/board/Canvas.tsx`) — pan/zoom whiteboard container
- **Gesture system** (`hooks/useGestures.ts`) — pointer-event-based drag, pan, tap, double-tap detection
- **Zones** (`components/board/Zone.tsx`) — 4 swim-lane columns (inbox, todo, in-progress, done); notes snap to zone on drop
- **Note editing** — inline editing on notes + bottom sheet editor (`NoteEditor.tsx`)

### Testing

- Tests use `fake-indexeddb` and MSW (`mocks/server.ts`) for API mocking
- Setup in `src/test-setup.ts` (imports fake-indexeddb polyfill + jest-dom matchers)
- Vitest with jsdom environment, global test APIs enabled

### Key Conventions

- **Biome** for linting/formatting: 2-space indent, single quotes, semicolons as-needed, 100-char line width
- **Soft deletes** via `deletedAt` timestamp
- **nanoid** for ID generation
- **Vite base path** is `/retold/` (GitHub Pages deployment)
- CI runs `bun run lint` then `bun run test` before deploying to GitHub Pages
