# RETRO.DO

A spatial todo app with a whiteboard/post-it UX, offline-first architecture, and retro Mac OS visual style.

## Tech Stack

| Layer       | Choice                |
|-------------|-----------------------|
| Runtime     | Bun                   |
| Bundler     | Vite (via Bun)        |
| UI          | React 19              |
| State       | Zustand               |
| Persistence | IndexedDB (via `idb`) |
| Mock API    | MSW 2.x               |
| Testing     | Vitest                |
| PWA         | vite-plugin-pwa       |

## Getting Started

```bash
bun install
bun run dev
```

## Available Scripts

| Command            | Description                    |
|--------------------|--------------------------------|
| `bun run dev`      | Start dev server with HMR      |
| `bun run build`    | Type-check and build for prod  |
| `bun run preview`  | Preview production build       |
| `bun run test`     | Run tests once                 |
| `bun run test:watch` | Run tests in watch mode      |

## Project Structure

```
src/
├── api/                  # Types, fetch client, endpoint constants
├── components/
│   ├── board/            # Canvas, Note, NoteEditor, Zone, CreateButton
│   ├── shared/           # Checkbox, ColorPicker
│   └── shell/            # TitleBar, Toolbar, StatusBar
├── db/                   # IndexedDB schema + CRUD operations
├── hooks/                # useGestures, useOnlineStatus, useViewport
├── mocks/                # MSW browser/server setup, handlers, in-memory DB
├── store/                # Zustand stores (notes, board, sync) + persist middleware
├── styles/               # CSS tokens, shell, board, note styles
├── sync/                 # Queue, engine, conflict resolution
├── __tests__/            # All test files
├── App.tsx               # Root component
└── main.tsx              # Entry point, MSW init
```

## Features

- **CRUD notes** — create, read, update, and delete post-it notes
- **Drag-and-drop canvas** — freely position notes on a whiteboard
- **Pan & zoom** — navigate the board with mouse/touch gestures
- **Status cycling** — tap to cycle notes through draft → todo → in-progress → done
- **Per-status counts** — status bar shows counts for each status category
- **Offline-first sync** — optimistic UI with IndexedDB persistence and background sync
- **PWA** — installable with service worker asset caching
- **Keyboard & accessibility** — ARIA labels, keyboard navigation, screen reader support
- **Retro Mac OS style** — CSS design tokens for a classic aesthetic

## Architecture Overview

```
User interaction
  → React components (board/shell)
    → Zustand stores (notes, board, sync)
      → API client (fetch wrappers)
        → MSW service worker (mock backend)
      → IndexedDB persistence (via idb)
      → Sync engine (queue → drain on reconnect)
```

The app follows an offline-first pattern: all writes go to the Zustand store and IndexedDB immediately (optimistic UI), then a sync queue pushes changes to the API when online. On reconnect, queued operations drain with exponential backoff. Conflict resolution uses whole-entity last-write-wins based on `updatedAt` timestamps.
