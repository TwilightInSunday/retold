# RETRO.DO — Engineering Reference

This document is the definitive engineering reference for the RETRO.DO codebase. It covers architecture decisions, data flows, code walkthroughs, type definitions, and conventions at the level of detail needed to onboard, maintain, or extend the project. For a quick-start guide, see `docs/README.md`. For the product specification and deliverable checklist, see `docs/spec.md`.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Tech Stack & Rationale](#2-tech-stack--rationale)
3. [Project Structure](#3-project-structure)
4. [Data Models](#4-data-models)
5. [Architecture Overview](#5-architecture-overview)
6. [State Management (Zustand Stores)](#6-state-management-zustand-stores)
7. [Database Layer (IndexedDB)](#7-database-layer-indexeddb)
8. [Sync Engine](#8-sync-engine)
9. [API Layer](#9-api-layer)
10. [UI Components](#10-ui-components)
11. [Hooks](#11-hooks)
12. [Gesture System](#12-gesture-system)
13. [Styling System](#13-styling-system)
14. [App Orchestration](#14-app-orchestration)
15. [Offline-First Architecture](#15-offline-first-architecture)
16. [PWA Setup](#16-pwa-setup)
17. [Testing](#17-testing)
18. [CI/CD](#18-cicd)
19. [Conventions](#19-conventions)

---

## 1. Introduction

**RETRO.DO** is a spatial todo/whiteboard Progressive Web App. Users create sticky notes on an infinite pan/zoom canvas and organize them across swim-lane zones (Inbox, Todo, In Progress, Done). The app is fully offline-capable — IndexedDB is the primary data source, with an eventual-consistency sync engine that queues mutations and pushes them to a server when connectivity is available.

The visual style is retro Mac OS: monochrome chrome, thick borders, colored traffic-light dots, and a dot-grid canvas background.

**Audience for this document:** Engineers reading, modifying, or reviewing the code. Assumes familiarity with React, TypeScript, and browser APIs.

---

## 2. Tech Stack & Rationale

| Layer | Choice | Why |
|---|---|---|
| Runtime | **Bun** | Fast, TypeScript-native, runs Vite directly |
| Bundler | **Vite 8** | HMR, ESM-native, fast dev/build cycles |
| UI | **React 19** | SPA with hooks for gesture/state/lifecycle management |
| Styling | **Standard CSS** | CSS custom properties for theming, no build-step preprocessor |
| State | **Zustand 5** | Tiny, TypeScript-first, middleware for persistence |
| Persistence | **IndexedDB** via `idb 8` | Offline storage, large capacity, Promise-based wrapper |
| Mock API | **MSW 2.x** | Service worker intercept in dev, node intercept in tests — real `fetch()` calls |
| Testing | **Vitest 3** | Bun-compatible, fast, jest-compatible API, jsdom environment |
| PWA | **vite-plugin-pwa 1.x** | Workbox service worker generation, asset caching |
| Code quality | **Biome 2.x** | Unified linter + formatter, replaces ESLint + Prettier |
| IDs | **nanoid 5** | Collision-resistant, URL-safe, 21-character IDs |

**Production dependencies** (5 total): `react`, `react-dom`, `zustand`, `idb`, `nanoid`.

---

## 3. Project Structure

```
retold/
├── index.html                         # Vite entry HTML
├── package.json                       # Scripts, deps
├── tsconfig.json                      # References tsconfig.app.json
├── tsconfig.app.json                  # Strict TS: ES2023, react-jsx, bundler resolution
├── vite.config.ts                     # Base /retold/, PWA plugin, font caching
├── vitest.config.ts                   # jsdom env, globals, test-setup.ts
├── biome.json                         # 2-space, single quotes, 100-char lines
│
├── public/
│   ├── manifest.json                  # PWA manifest (custom, not auto-generated)
│   └── mockServiceWorker.js           # MSW browser service worker
│
├── .github/workflows/
│   └── deploy.yml                     # CI: lint → test → build → GitHub Pages
│
├── docs/
│   ├── README.md                      # Quick-start, feature list
│   ├── spec.md                        # Product spec, deliverable checklist
│   └── engineering.md                 # This document
│
└── src/
    ├── main.tsx                       # Entry: MSW boot (dev only), React root
    ├── App.tsx                        # Root component: board init, drag/drop, CRUD
    ├── App.css                        # Global reset, .app flex column
    ├── test-setup.ts                  # Imports fake-indexeddb/auto + jest-dom
    │
    ├── api/                           # API contract layer
    │   ├── types.ts                   # Note, Board, Zone, SyncOperation, Conflict
    │   ├── client.ts                  # fetch wrapper, ApiError class
    │   └── endpoints.ts               # URL builder functions
    │
    ├── db/                            # IndexedDB persistence
    │   ├── schema.ts                  # DB schema (idb), singleton getDB()
    │   └── operations.ts              # 15 CRUD functions across 3 object stores
    │
    ├── store/                         # Zustand runtime state
    │   ├── notes.ts                   # NotesState: Map<id, Note>, CRUD methods
    │   ├── board.ts                   # BoardState: viewport + board selection
    │   ├── sync.ts                    # SyncState: operation queue, status
    │   └── middleware/
    │       └── persist.ts             # Write-through middleware for IndexedDB
    │
    ├── sync/                          # Offline-first sync engine
    │   ├── queue.ts                   # enqueueOperation, drainQueue
    │   ├── engine.ts                  # startSyncEngine, scheduleDrain, backoff
    │   └── conflict.ts               # LWW resolution, merge functions
    │
    ├── hooks/
    │   ├── useGestures.ts             # Pointer-event state machine
    │   ├── useViewport.ts             # Screen/world coordinate transforms
    │   └── useOnlineStatus.ts         # useSyncExternalStore for navigator.onLine
    │
    ├── components/
    │   ├── board/
    │   │   ├── Canvas.tsx             # Pan/zoom container, wheel handler
    │   │   ├── Note.tsx               # Draggable post-it note
    │   │   ├── NoteEditor.tsx         # Textarea, bottom sheet on mobile
    │   │   ├── Zone.tsx               # Swim-lane area + collision utilities
    │   │   └── CreateButton.tsx       # FAB for creating notes
    │   ├── shared/
    │   │   ├── Checkbox.tsx           # Styled checkbox with hidden input
    │   │   └── ColorPicker.tsx        # Radio group of 5 color swatches
    │   └── shell/
    │       ├── TitleBar.tsx           # Retro window chrome with traffic-light dots
    │       ├── Toolbar.tsx            # Actions bar with hamburger menu on mobile
    │       └── StatusBar.tsx          # Sync indicator + per-status note counts
    │
    ├── styles/
    │   ├── tokens.css                 # CSS custom properties: palette, fonts, spacing, z-index
    │   ├── shell.css                  # Title bar, toolbar, status bar + responsive
    │   ├── board.css                  # Canvas, world transform, zones
    │   └── note.css                   # Post-it, editor, FAB, color picker, checkbox
    │
    ├── mocks/
    │   ├── browser.ts                 # setupWorker() for dev
    │   ├── server.ts                  # setupServer() for tests
    │   ├── handlers.ts                # MSW HTTP handlers for all endpoints
    │   └── db.ts                      # In-memory MockDatabase class
    │
    └── __tests__/                     # 18 test files
        ├── stores.test.ts             # Zustand store unit tests
        ├── sync.test.ts               # Sync queue, backoff, conflict resolution
        ├── db.test.ts                 # IndexedDB CRUD via fake-indexeddb
        ├── client.test.ts             # HTTP client + ApiError
        ├── gestures.test.ts           # State machine transitions, thresholds
        ├── viewport.test.ts           # Coordinate transforms, zoom-at-point
        ├── online-status.test.ts      # useSyncExternalStore hook
        ├── note.test.tsx              # Note component interactions
        ├── zone.test.tsx              # Collision detection, snapping
        ├── canvas.test.tsx            # Canvas pan/zoom
        ├── shell.test.tsx             # TitleBar, Toolbar, StatusBar
        ├── accessibility.test.tsx     # ARIA, keyboard nav, focus management
        ├── responsive.test.tsx        # Mobile layout, touch targets
        ├── lifecycle.test.tsx         # App mount, sync engine lifecycle
        ├── app.test.tsx               # Root component renders
        ├── mock-api.test.ts           # MSW handler integration
        ├── pwa.test.ts                # Manifest, service worker
        └── tokens.test.ts            # CSS custom properties exist
```

---

## 4. Data Models

All types are defined in `src/api/types.ts`. The file exports 6 interfaces.

### Note

```typescript
interface Note {
  id: string              // nanoid (21 chars)
  boardId: string         // FK to Board
  text: string            // user content; empty string for new notes
  status: 'inbox' | 'todo' | 'in-progress' | 'done'
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'white'
  x: number              // world-space horizontal position (px)
  y: number              // world-space vertical position (px)
  width: number           // pixel width, default 160
  rotation: number        // CSS rotation in degrees, randomized -3 to +3
  createdAt: string       // ISO 8601 timestamp
  updatedAt: string       // ISO 8601; used as tie-breaker for LWW conflict resolution
  deletedAt: string | null // ISO 8601 when soft-deleted, null when active
}
```

**Design notes:**
- `status` drives both the visual badge color and the zone the note belongs to.
- `rotation` gives each note a slightly askew look, set once at creation via `Math.random() * 6 - 3`.
- `deletedAt` implements soft deletes — the note stays in IndexedDB and the sync queue, but is excluded from UI rendering via `!n.deletedAt` filters.
- `updatedAt` is the sole field used for whole-entity last-write-wins conflict resolution.

### Board

```typescript
interface Board {
  id: string
  name: string            // display name, default "My Board"
  zones: Zone[]           // ordered list of swim-lane columns
  createdAt: string
  updatedAt: string
}
```

A board contains its zone definitions inline. Currently the app creates a single default board on first launch.

### Zone

```typescript
interface Zone {
  id: string              // e.g., "zone-inbox"
  label: string           // display label, e.g., "In Progress"
  status?: Note['status'] // maps to note status; when a note is dropped in this zone, its status changes
  x: number              // world-space position
  y: number
  width: number
  height: number
  color: string           // border color, e.g., "#3b82f6"
}
```

Zone positions are recomputed responsively in `App.tsx` based on viewport width and zone count.

### SyncOperation

```typescript
interface SyncOperation {
  id: string                                    // nanoid
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: 'note' | 'board'
  entityId: string                              // the note or board ID this op targets
  payload: Partial<Note> | Partial<Board>       // the data to sync
  timestamp: string                             // ISO; when the operation was enqueued
  retryCount: number                            // incremented on each failed sync attempt
  status: 'pending' | 'syncing' | 'failed' | 'synced'
}
```

**Status lifecycle:** `pending` → `syncing` → `synced` (removed from queue) or `failed` (retried).

### SyncPushResponse / SyncPullResponse / Conflict

```typescript
interface SyncPushResponse {
  synced: string[]         // IDs of SyncOperations the server accepted
  conflicts: Conflict[]    // entities where server had a different version
}

interface SyncPullResponse {
  notes: Note[]
  boards: Board[]
}

interface Conflict {
  entityId: string
  entity: 'note' | 'board'
  serverVersion: Note | Board
  clientVersion: Partial<Note> | Partial<Board>
}
```

---

## 5. Architecture Overview

### Layered Architecture

```
┌─────────────────────────────────────────────┐
│                  UI Layer                    │
│  Shell (TitleBar, Toolbar, StatusBar)        │
│  Board (Canvas, Note, NoteEditor, Zone)     │
│  Hooks (useViewport, useGestures,           │
│         useOnlineStatus)                    │
├─────────────────────────────────────────────┤
│              State Layer                     │
│  Zustand Stores (notes, board, sync)        │
│  Persist Middleware (write-through)          │
├─────────────────────────────────────────────┤
│            Persistence Layer                 │
│  IndexedDB (primary data source)            │
│  Sync Engine (queue → API)                  │
├─────────────────────────────────────────────┤
│              API Layer                       │
│  HTTP Client (fetch wrapper)                │
│  MSW Handlers (dev/test)                    │
└─────────────────────────────────────────────┘
```

### Data Flow (User Creates a Note)

```
1. User clicks "+ Note" button
2. App.handleNewNote() runs
3. Zustand notesStore.createNote() → Map updated immediately (optimistic UI)
4. putNote(note) writes to IndexedDB asynchronously
5. enqueueOperation('CREATE', 'note', ...) creates a pending SyncOperation
6. If online → scheduleDrain() → drainQueue() → POST /api/sync/push
7. If offline → operation stays in queue until next 'online' event
```

---

## 6. State Management (Zustand Stores)

All three stores are defined in `src/store/` using `create<State>()((set, get) => ({...}))` — the double-invocation pattern required by Zustand 5's TypeScript support. Entity collections use `Map<string, T>` for O(1) lookups.

### NotesStore (`src/store/notes.ts`)

**State:**
- `notes: Map<string, Note>` — all notes in memory (including soft-deleted)

**Methods:**

| Method | Signature | Behavior |
|--------|-----------|----------|
| `createNote` | `(boardId, x, y, color?) => Note` | Creates note with nanoid, `status: 'inbox'`, `width: 160`, random rotation, empty text. Returns the created note. |
| `updateNote` | `(id, updates) => void` | Shallow merges updates into existing note, auto-updates `updatedAt`. No-op if ID not found. |
| `moveNote` | `(id, x, y) => void` | Updates only x/y and `updatedAt`. Does not change status (unlike drag-drop, which may also update status). |
| `deleteNote` | `(id) => void` | Soft delete: sets `deletedAt` and `updatedAt` to current timestamp. Note remains in the Map. |
| `setNotes` | `(notes[]) => void` | Replaces the entire Map. Used for hydration from IndexedDB on boot. |
| `getNote` | `(id) => Note \| undefined` | Direct Map lookup. |
| `getNotesByBoard` | `(boardId) => Note[]` | Filters by `boardId` and `!deletedAt`. Returns array. |

**Immutability pattern:** Every mutation creates a new `Map` via `new Map(state.notes)` before calling `set()`, ensuring React re-renders.

### BoardStore (`src/store/board.ts`)

**State:**
- `panX: number`, `panY: number` — viewport translation in screen pixels
- `zoom: number` — viewport scale factor (clamped 0.25–4)
- `currentBoard: Board | null` — the active board
- `boards: Map<string, Board>` — all boards

**Methods:**

| Method | Signature | Behavior |
|--------|-----------|----------|
| `setPan` | `(x, y) => void` | Directly sets panX/panY. |
| `setZoom` | `(zoom) => void` | Sets zoom, clamped to `[0.25, 4]` via `Math.max/min`. |
| `resetViewport` | `() => void` | Resets to `panX=0, panY=0, zoom=1`. |
| `setCurrentBoard` | `(board) => void` | Sets the active board. |
| `setBoards` | `(boards[]) => void` | Hydrates the board map. Auto-selects the first board if `currentBoard` is null. |
| `updateBoard` | `(id, updates) => void` | Merges updates, auto-updates `updatedAt`. Also updates `currentBoard` if it matches the updated ID. |

### SyncStore (`src/store/sync.ts`)

**State:**
- `queue: SyncOperation[]` — the ordered operation queue
- `status: SyncStatus` — one of `'idle' | 'syncing' | 'offline' | 'error'`
- `lastSyncedAt: string | null` — ISO timestamp of the last successful sync

**Methods:**

| Method | Signature | Behavior |
|--------|-----------|----------|
| `enqueue` | `(op) => SyncOperation` | Accepts an op without `id`, `timestamp`, `retryCount`, or `status`. Fills those in (nanoid, ISO now, 0, 'pending'). Appends to queue. Returns the complete SyncOperation. |
| `dequeue` | `(id) => void` | Removes by ID (filter). |
| `markSyncing` | `(id) => void` | Sets `status: 'syncing'` on the matching op. |
| `markSynced` | `(id) => void` | Sets `status: 'synced'`. |
| `markFailed` | `(id) => void` | Sets `status: 'failed'`. |
| `incrementRetry` | `(id) => void` | Increments `retryCount` by 1. |
| `setStatus` | `(status) => void` | Sets the global sync status. |
| `setLastSyncedAt` | `(timestamp) => void` | Records when sync last succeeded. |
| `getPending` | `() => SyncOperation[]` | Returns queue items with `status === 'pending'`. |
| `setQueue` | `(ops[]) => void` | Replaces the entire queue (used for hydration). |
| `clearSynced` | `() => void` | Removes all ops with `status === 'synced'` from the queue. |

### Persist Middleware (`src/store/middleware/persist.ts`)

The persist middleware is a Zustand middleware that intercepts every `set()` call and writes the current state to IndexedDB. It wraps the store creator function.

**How it works:**

1. The middleware wraps the `set` function passed to the store creator.
2. On every call to `set()`, it first applies the state change normally.
3. Then it reads the updated state via `get()` and extracts entities using the `getEntities` config function.
4. For each entity type present (notes, boards, syncOps), it calls the corresponding `put*()` DB operation.
5. DB writes are fire-and-forget (`putNote(note).catch(console.error)`) — they do not block the UI.

**Config interface:**

```typescript
interface PersistConfig<T> {
  getEntities: (state: T) => {
    notes?: Map<string, Note>
    boards?: Map<string, Board>
    syncOps?: SyncOperation[]
  }
}
```

**Important:** The middleware is typed but currently **not wired** into any store — the stores in `src/store/*.ts` use plain `create()` without the middleware. Instead, persistence is handled explicitly in `App.tsx` (calling `putNote()`, `putBoard()` directly after mutations). The middleware exists as infrastructure for potential future use.

---

## 7. Database Layer (IndexedDB)

### Schema (`src/db/schema.ts`)

**Database:** `retro-do`, **Version:** 1

```typescript
interface RetroDBSchema extends DBSchema {
  notes: {
    key: string           // Note.id
    value: Note
    indexes: { 'by-board': string }   // indexed on boardId
  }
  boards: {
    key: string           // Board.id
    value: Board
  }
  syncOps: {
    key: string           // SyncOperation.id
    value: SyncOperation
    indexes: { 'by-status': string }  // indexed on status
  }
}
```

**Singleton pattern:** `getDB()` lazily creates a single `Promise<IDBPDatabase>` stored in the module-level `dbPromise` variable. Subsequent calls return the same promise. `resetDBPromise()` exists for test teardown.

**Upgrade handler:** The `upgrade` callback runs on first database creation (version 0 → 1). It creates all three object stores and their indexes:

```typescript
upgrade(db) {
  const noteStore = db.createObjectStore('notes', { keyPath: 'id' })
  noteStore.createIndex('by-board', 'boardId')

  db.createObjectStore('boards', { keyPath: 'id' })

  const syncStore = db.createObjectStore('syncOps', { keyPath: 'id' })
  syncStore.createIndex('by-status', 'status')
}
```

### Operations (`src/db/operations.ts`)

All functions are `async`, returning Promises. Each opens the DB via `getDB()`, performs a single IDB transaction, and returns.

**Notes (5 functions):**

| Function | Signature | IDB Method |
|----------|-----------|------------|
| `putNote` | `(note: Note) => Promise<void>` | `db.put('notes', note)` — upsert |
| `getNote` | `(id: string) => Promise<Note \| undefined>` | `db.get('notes', id)` |
| `getNotesByBoard` | `(boardId: string) => Promise<Note[]>` | `db.getAllFromIndex('notes', 'by-board', boardId)` |
| `deleteNote` | `(id: string) => Promise<void>` | `db.delete('notes', id)` — hard delete from IDB |
| `getAllNotes` | `() => Promise<Note[]>` | `db.getAll('notes')` |

**Boards (4 functions):**

| Function | Signature | IDB Method |
|----------|-----------|------------|
| `putBoard` | `(board: Board) => Promise<void>` | `db.put('boards', board)` |
| `getBoard` | `(id: string) => Promise<Board \| undefined>` | `db.get('boards', id)` |
| `getAllBoards` | `() => Promise<Board[]>` | `db.getAll('boards')` |
| `deleteBoard` | `(id: string) => Promise<void>` | `db.delete('boards', id)` |

**SyncOps (6 functions):**

| Function | Signature | IDB Method |
|----------|-----------|------------|
| `putSyncOp` | `(op: SyncOperation) => Promise<void>` | `db.put('syncOps', op)` |
| `getSyncOp` | `(id: string) => Promise<SyncOperation \| undefined>` | `db.get('syncOps', id)` |
| `getPendingSyncOps` | `() => Promise<SyncOperation[]>` | `db.getAllFromIndex('syncOps', 'by-status', 'pending')` |
| `getAllSyncOps` | `() => Promise<SyncOperation[]>` | `db.getAll('syncOps')` |
| `deleteSyncOp` | `(id: string) => Promise<void>` | `db.delete('syncOps', id)` |
| `clearSyncOps` | `() => Promise<void>` | `db.clear('syncOps')` — removes all sync ops |

**Note:** `deleteNote` in the DB layer performs a *hard* delete (removes the record). This is distinct from the store's `deleteNote` which does a *soft* delete (sets `deletedAt`). The hard delete is used for cleanup; the soft delete preserves the record for sync.

---

## 8. Sync Engine

The sync engine is split across three files: queue management, engine lifecycle, and conflict resolution.

### Queue (`src/sync/queue.ts`)

**`enqueueOperation(type, entity, entityId, payload)`**

Convenience wrapper that calls `useSyncStore.getState().enqueue()` to add a pending operation. Called from `App.tsx` after every create/update/delete action.

**`drainQueue()`**

Processes all pending operations in a single batch:

1. Gets all pending ops via `store.getPending()`
2. Returns early if queue is empty
3. Marks all as `'syncing'`
4. Sets global status to `'syncing'`
5. POSTs all ops to `/api/sync/push`
6. On success:
   - Marks returned `synced` IDs as `'synced'`
   - Marks any ops not in the response as `'failed'`, increments retry
   - Calls `clearSynced()` to remove completed ops
   - Sets status to `'idle'`, updates `lastSyncedAt`
7. On error (network failure):
   - Marks all ops as `'failed'`, increments retry
   - Sets status to `'error'`
8. Returns `{ synced: string[], failed: string[] }`

### Engine (`src/sync/engine.ts`)

**Constants:**

```typescript
const MAX_RETRIES = 5
const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 30000
```

**`getBackoffDelay(retryCount)`**

Computes exponential backoff: `min(1000 * 2^retryCount, 30000)`.

| retryCount | Delay |
|---|---|
| 0 | 0ms (immediate) |
| 1 | 2000ms |
| 2 | 4000ms |
| 3 | 8000ms |
| 4 | 16000ms |
| 5+ | gives up (MAX_RETRIES) |

**`scheduleDrain(retryCount = 0)`**

1. Clears any existing drain timeout
2. If `retryCount >= MAX_RETRIES` → sets status to `'error'`, returns
3. If `!navigator.onLine` → sets status to `'offline'`, returns
4. Computes delay (0 for first attempt, exponential thereafter)
5. Sets a timeout to call `drainQueue()`
6. If drain returns failed ops → recursively calls `scheduleDrain(retryCount + 1)`

**`startSyncEngine()`**

Sets up the online/offline lifecycle:

1. Registers `'online'` listener → sets status to `'idle'`, calls `scheduleDrain()`
2. Registers `'offline'` listener → sets status to `'offline'`, clears drain timeout
3. Checks initial `navigator.onLine` state
4. Returns a cleanup function that removes listeners and clears timeouts

### Conflict Resolution (`src/sync/conflict.ts`)

**Strategy:** Whole-entity last-write-wins (LWW) using `updatedAt` timestamps.

**`resolveNoteConflict(local, server)`**

Compares `updatedAt` timestamps. If `local >= server`, returns local (local wins on tie). Otherwise returns server.

**`resolveBoardConflict(local, server)`**

Same logic as notes.

**`mergeNotes(local: Map, serverNotes[])`**

Iterates server notes. For each:
- If not in local map → add it (new from server)
- If in local map → resolve conflict via `resolveNoteConflict()`

Returns a new merged Map.

**`mergeBoards(local: Map, serverBoards[])`**

Same pattern as `mergeNotes`.

**Design trade-off:** Per-field LWW would be more precise (e.g., one user changes text, another changes position — both could win their respective field). However, that requires per-field timestamps, which the current schema doesn't support. Whole-entity LWW is simpler and correct for single-user or low-contention scenarios.

---

## 9. API Layer

### HTTP Client (`src/api/client.ts`)

A thin `fetch` wrapper with 5 exported functions:

```typescript
get<T>(url: string): Promise<T>
post<T>(url: string, body: unknown): Promise<T>
put<T>(url: string, body: unknown): Promise<T>
patch<T>(url: string, body: unknown): Promise<T>
del<T = void>(url: string): Promise<T>
```

All delegate to an internal `request<T>()` function that:
1. Sets `Content-Type: application/json` header
2. Throws `ApiError(status, message)` on non-2xx responses
3. Returns `undefined` for 204 No Content responses
4. Parses JSON body for all other responses

**`ApiError`** extends `Error` with a `status: number` property and `name: 'ApiError'`.

### Endpoints (`src/api/endpoints.ts`)

URL builder functions organized by entity:

```typescript
const BASE = '/api'

endpoints.boards.list()           // GET    /api/boards
endpoints.boards.create()         // POST   /api/boards
endpoints.boards.get(id)          // GET    /api/boards/:id
endpoints.boards.update(id)       // PUT    /api/boards/:id
endpoints.boards.delete(id)       // DELETE /api/boards/:id

endpoints.notes.list(boardId)     // GET    /api/boards/:boardId/notes
endpoints.notes.create(boardId)   // POST   /api/boards/:boardId/notes
endpoints.notes.get(id)           // GET    /api/notes/:id
endpoints.notes.update(id)        // PUT    /api/notes/:id
endpoints.notes.patch(id)         // PATCH  /api/notes/:id
endpoints.notes.delete(id)        // DELETE /api/notes/:id

endpoints.sync.push()             // POST   /api/sync/push
endpoints.sync.pull(since)        // GET    /api/sync/pull?since=<encoded ISO>
```

The `endpoints` object is declared `as const` for type narrowing.

---

## 10. UI Components

### Shell Components

#### TitleBar (`src/components/shell/TitleBar.tsx`)

Renders the retro Mac OS window chrome:
- Three colored traffic-light dots (close=red, minimize=yellow, maximize=green)
- Centered title text (default "RETRO.DO"), uppercase, monospace, letter-spaced
- A right spacer div (54px) to balance the dots visually

**Props:** `title?: string`

**Responsive:** At `<480px`, dots and spacer are hidden; title aligns left.

#### Toolbar (`src/components/shell/Toolbar.tsx`)

Action bar with two buttons: "+ Note" and "Reset View".

**Props:** `onNewNote?: () => void`, `onResetView?: () => void`

**Responsive:**
- Desktop: buttons always visible
- Mobile (`<768px`): hamburger button shown, actions hidden in a dropdown that toggles via `menuOpen` state
- Dropdown renders as an absolutely positioned column below the toolbar

#### StatusBar (`src/components/shell/StatusBar.tsx`)

Two-section status bar:
- **Left:** Colored dot indicator + text label showing sync status
- **Right:** Per-status note counts (`0 inbox · 2 todo · 1 in-progress · 3 done`)

**Props:** `syncStatus: SyncStatus`, `notes: Map<string, Note>`, `boardId?: string`

Uses `useMemo` to compute counts, filtering by `!deletedAt` and optional `boardId`.

**Status indicator classes:**

| Status | Class | Color |
|--------|-------|-------|
| idle | `--online` | Green (#28c840) |
| syncing | `--syncing` | Yellow (#ffbd2e), pulsing animation |
| offline | `--offline` | Gray (--retro-mid) |
| error | `--error` | Red (#ff5f57) |

### Board Components

#### Canvas (`src/components/board/Canvas.tsx`)

The pan/zoom viewport container. Renders a `.canvas` div with a nested `.canvas__world` div that receives the CSS transform.

**Pointer events:**
- `pointerdown` on canvas background → starts panning (via ref `isPanning`)
- `pointermove` while panning → calls `useViewport().pan(dx, dy)`
- `pointerup` → stops panning
- Uses `setPointerCapture` for reliable drag tracking

**Wheel events:**
- `Ctrl/Cmd + wheel` → zoom (pinch-to-zoom on trackpad): `delta = -e.deltaY * 0.01`, calls `zoomAt()`
- Regular wheel → pan: `pan(-e.deltaX, -e.deltaY)`

**World transform:** `<div className="canvas__world" style={{ transform: transformCSS }}>` where `transformCSS = translate(panX px, panY px) scale(zoom)`.

**Pointer-events layering:** `.canvas__world` has `pointer-events: none` while its children have `pointer-events: auto`. This ensures background clicks hit the canvas (for panning) while note/zone clicks hit their elements.

**ARIA:** `role="application"`, `aria-label="Whiteboard canvas"`.

#### Note (`src/components/board/Note.tsx`)

Each note is an `<article>` element positioned absolutely in world space.

**Props:**

```typescript
interface NoteProps {
  note: NoteType
  onUpdate: (id: string, updates: Partial<NoteType>) => void
  onDelete: (id: string) => void
  onDragStart?: (id: string, e: React.PointerEvent) => void
  onDragMove?: (id: string, e: React.PointerEvent) => void
  onDragEnd?: (id: string, e: React.PointerEvent) => void
}
```

**Inline styles:** `left`, `top`, `width`, `backgroundColor` (from color map), `transform: rotate(Xdeg)`.

**Interactions:**
- **Double-click** → enters editing mode (shows `NoteEditor`)
- **Keyboard Enter** → enters editing mode
- **Keyboard Delete/Backspace** → deletes note
- **Status badge click** → cycles through `inbox → todo → in-progress → done → inbox`
- **Delete button** (×) → appears on hover/focus, calls `onDelete`
- **Pointer events** → forwarded to drag callbacks (suppressed when editing)

**Status cycling logic:**

```typescript
const STATUS_CYCLE = ['inbox', 'todo', 'in-progress', 'done']
const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length]
```

**Save behavior:** When saving from the editor, if the note's status is `'inbox'`, it auto-promotes to `'todo'`. This ensures newly created notes move out of the inbox once they have content.

**Color mapping:** A `colorMap` record maps color names to CSS variable references (`'yellow' → 'var(--note-yellow)'`).

**ARIA:** `aria-label` describes note text, status, and color. `aria-roledescription="draggable note"`. `tabIndex={0}` for keyboard focus.

#### NoteEditor (`src/components/board/NoteEditor.tsx`)

A controlled `<textarea>` for editing note text.

**Props:** `initialText: string`, `onSave: (text: string) => void`, `onCancel: () => void`

**Behavior:**
- Auto-focuses and selects all text on mount
- **Enter** (without Shift) → saves
- **Shift+Enter** → newline
- **Escape** → cancels
- **Blur** → saves (handles tap-away)

**Mobile:** At `<480px`, the textarea gets the class `note-editor--bottom-sheet` which renders it as a fixed-position panel at the bottom of the screen with a semi-transparent backdrop overlay.

#### Zone (`src/components/board/Zone.tsx`)

Renders a swim-lane area as a `<section>` with a dashed border and label.

**Props:** `zone: ZoneType`, `isDropTarget?: boolean`

When `isDropTarget` is true, the zone gets a solid border and higher-opacity background to indicate it's the drop target.

**Exported utility functions:**

```typescript
isPointInZone(x, y, zone)         // AABB collision test
findOverlappingZone(x, y, zones)  // returns first matching zone or null
snapToZone(noteX, noteY, noteWidth, zone)  // clamps note position to zone interior
```

**`snapToZone` padding:** Horizontal padding is 8px from each edge. Vertical: 30px from top (below the label), 120px + 8px from bottom (note height estimate).

#### CreateButton (`src/components/board/CreateButton.tsx`)

A floating action button (FAB) with a "+" label. Fixed position at bottom-right.

**Props:** `onClick: () => void`

**Sizing:** 56x56px circle with minimum touch target of 44x44px. Styled with the yellow note color.

### Shared Components

#### Checkbox (`src/components/shared/Checkbox.tsx`)

A styled checkbox with a hidden native `<input>` and a custom `.checkbox__box` span showing a checkmark character when checked.

**Props:** `checked: boolean`, `onChange: (checked: boolean) => void`, `label: string`

#### ColorPicker (`src/components/shared/ColorPicker.tsx`)

A radio group of 5 color swatch buttons (yellow, pink, blue, green, white).

**Props:** `value: Note['color']`, `onChange: (color: Note['color']) => void`

Each swatch is a `<button>` with `role="radio"` and `aria-checked`. The active swatch gets a double-border effect via `box-shadow` rings.

---

## 11. Hooks

### useViewport (`src/hooks/useViewport.ts`)

Manages the viewport coordinate system — translating between screen pixels and world-space coordinates.

**Coordinate system:**

```
Screen space: pixel coordinates (clientX, clientY from pointer events)
World space:  infinite 2D canvas coordinates (note x/y positions)

screen = world * zoom + pan
world  = (screen - pan) / zoom
```

**Exported pure functions:**

```typescript
screenToWorld(screenX, screenY, transform) → { x, y }
worldToScreen(worldX, worldY, transform)   → { x, y }
getTransformCSS(transform)                 → "translate(Xpx, Ypx) scale(Z)"
```

**Hook return value:**

| Property | Type | Description |
|----------|------|-------------|
| `transform` | `ViewportTransform` | Current `{ panX, panY, zoom }` |
| `pan` | `(dx, dy) => void` | Translates viewport by delta |
| `zoomAt` | `(newZoom, cx, cy) => void` | Zooms toward screen point (cx, cy) |
| `resetViewport` | `() => void` | Resets to origin at 1x zoom |
| `screenToWorld` | `(sx, sy) => {x, y}` | Converts using current transform |
| `worldToScreen` | `(wx, wy) => {x, y}` | Converts using current transform |
| `transformCSS` | `string` | CSS transform string for the world container |

**Zoom-at-point math:**

```typescript
const ratio = clampedZoom / zoom
const newPanX = cx - ratio * (cx - panX)
const newPanY = cy - ratio * (cy - panY)
```

This keeps the point under the cursor stationary while changing zoom. The cursor position `(cx, cy)` is used as the zoom center.

### useGestures (`src/hooks/useGestures.ts`)

A pointer-event state machine for handling tap, double-tap, long-press, drag, and pan gestures. See [Section 12](#12-gesture-system) for the full state machine diagram.

**Returns:** `{ handlePointerDown, handlePointerMove, handlePointerUp }`

### useOnlineStatus (`src/hooks/useOnlineStatus.ts`)

Uses React 18's `useSyncExternalStore` to subscribe to the browser's online/offline events.

```typescript
function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
```

- **subscribe:** Adds/removes `online` and `offline` event listeners on `window`
- **getSnapshot:** Returns `navigator.onLine`
- **getServerSnapshot:** Returns `true` (SSR assumes online)

This is the idiomatic React way to subscribe to browser APIs — no `useEffect` + `useState`, no stale closures.

---

## 12. Gesture System

The gesture system (`src/hooks/useGestures.ts`) uses a finite state machine to disambiguate between taps, drags, pans, and long-presses from raw pointer events.

### Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `LONG_PRESS_MS` | 400 | Milliseconds held before triggering long-press |
| `DOUBLE_TAP_MS` | 300 | Max milliseconds between taps to count as double-tap |
| `DRAG_THRESHOLD_PX` | 8 | Pixels moved before a press becomes a drag |
| `PINCH_THRESHOLD` | 0.01 | Scale delta before zoom starts (for pinch gestures) |

### State Machine

```
                    ┌──────────────────────┐
                    │                      │
                    ▼                      │
               ┌────────┐                 │
               │  idle   │                 │
               └────┬────┘                 │
                    │                      │
          ┌─────────┼──────────┐           │
          │ down    │ down     │           │
          │ on note │ on canvas│           │
          ▼         ▼          │           │
   ┌──────────────┐  ┌────────┐           │
   │ waiting_for_ │  │panning │           │
   │ gesture      │  └───┬────┘           │
   └──────┬───────┘      │                │
          │              │ move → onPan    │
     ┌────┼────┐         │ up   → idle ───┘
     │    │    │         │
     │    │    │         └────────────────┘
     │    │    │
     │    │    └── move > 8px → dragging ──┐
     │    │                                │
     │    └── 400ms hold ──→ long_press ──→│ dragging
     │         (no move)     (drag_start)  │
     │                                     │
     │                              move → onDrag
     └── up ──→ tap                 up   → onDrop → idle
          │       │
          │       └── within 300ms of last tap?
          │              yes → double_tap → idle
          │              no  → tap → idle
          │
          └── (records lastTapTime for next double-tap check)
```

### GestureContext (ref)

```typescript
interface GestureContext {
  state: GestureState              // current FSM state
  startX: number                   // pointer-down position
  startY: number
  noteId: string | null            // which note is being interacted with
  longPressTimer: ReturnType<typeof setTimeout> | null
  lastTapTime: number              // for double-tap detection
  moved: boolean                   // whether pointer has moved beyond threshold
}
```

### GestureConfig (callbacks)

```typescript
interface GestureConfig {
  onPan:       (dx, dy) => void           // viewport translation
  onZoom:      (scale, cx, cy) => void    // viewport zoom
  onTapNote:   (noteId) => void           // select/toggle note
  onLongPress: (noteId, x, y) => void     // start drag from hold
  onDrag:      (noteId, x, y) => void     // note being dragged
  onDrop:      (noteId, x, y) => void     // note released
  onDoubleTap: (x, y) => void            // create note at position
}
```

### Detection Logic

The `detectGestureTransition()` pure function maps `(currentState, eventType, x, y, isOnNote, noteId)` to `{ newState, action? }`. The hook's event handlers call this function, then execute the corresponding callback.

**Long-press detection:** On pointer-down on a note, a 400ms `setTimeout` is started. If the pointer hasn't moved beyond `DRAG_THRESHOLD_PX` when it fires, the state transitions directly to `'dragging'` and `onLongPress` is called.

**Double-tap detection:** On pointer-up (tap), the current timestamp is compared against `lastTapTime`. If the gap is less than `DOUBLE_TAP_MS`, it's a double-tap. After a double-tap, `lastTapTime` is reset to 0 to prevent triple-tap counting as another double.

---

## 13. Styling System

### CSS Tokens (`src/styles/tokens.css`)

All design tokens are CSS custom properties on `:root`.

**Retro Palette (monochrome):**

| Token | Value | Usage |
|-------|-------|-------|
| `--retro-black` | `#1a1a1a` | Text, borders |
| `--retro-dark` | `#333333` | Box shadows, active states |
| `--retro-mid` | `#888888` | Muted text, dashed borders |
| `--retro-light` | `#d4d4d4` | Title bar, status bar background |
| `--retro-cream` | `#f5f5f0` | Canvas background, toolbar |
| `--retro-white` | `#fafaf8` | Button backgrounds |

**Note Colors:**

| Token | Value |
|-------|-------|
| `--note-yellow` | `#fff3b0` |
| `--note-pink` | `#ffc0cb` |
| `--note-blue` | `#b3d9ff` |
| `--note-green` | `#c1f0c1` |
| `--note-white` | `#ffffff` |

**Typography:**
- `--font-mono`: `'Space Mono', 'Courier New', monospace` — used for chrome/labels
- `--font-sans`: `'DM Sans', 'Chicago', system-ui, sans-serif` — used for note content

Both fonts are loaded from Google Fonts and cached by the service worker.

**Border Tokens:**
- `--border-thick`: `2px solid var(--retro-black)` — notes, FAB
- `--border-thin`: `1px solid var(--retro-black)` — toolbar buttons, status badge
- `--border-dashed`: `2px dashed var(--retro-mid)` — zones

**Spacing Scale:**

| Token | Value |
|-------|-------|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 40px |

**Board:**
- `--board-dot-color`: `#cccccc`
- `--board-dot-size`: `1px`
- `--board-dot-gap`: `24px`

The canvas background uses a `radial-gradient` with these tokens to create a dot-grid pattern.

### Z-Index Layers

| Token | Value | Elements |
|-------|-------|----------|
| `--z-board` | 1 | Canvas container |
| `--z-zone` | 2 | Swim-lane zones |
| `--z-note` | 10 | Notes (resting) |
| `--z-note-dragging` | 100 | Note being dragged (via `:active`) |
| `--z-toolbar` | 200 | Title bar, toolbar, status bar, FAB, mobile dropdown |
| `--z-modal` | 300 | Bottom sheet editor, backdrop overlay |

### Responsive Breakpoints

| Breakpoint | Target | Key Changes |
|------------|--------|-------------|
| `>=1024px` | Desktop | Full toolbar, side-by-side zones |
| `768–1023px` | Tablet | Compact toolbar buttons (smaller font/padding) |
| `<768px` | Mobile | Hamburger menu, hidden toolbar actions (dropdown), 44px touch targets, always-visible delete button, lower FAB position |
| `<480px` | Small phone | Title bar dots/spacer hidden, left-aligned title, bottom-sheet note editor with backdrop overlay |

### Key CSS Patterns

**Canvas dot-grid background:**

```css
.canvas {
  background-image: radial-gradient(
    circle,
    var(--board-dot-color) var(--board-dot-size),
    transparent var(--board-dot-size)
  );
  background-size: var(--board-dot-gap) var(--board-dot-gap);
}
```

**World transform layer:** A 0x0 div with `transform-origin: 0 0` receives the pan/zoom transform. Children are positioned absolutely within it. Setting `pointer-events: none` on the world layer and `auto` on children ensures canvas background clicks pass through for panning.

**Note shadow progression:** Resting notes have `box-shadow: 3px 3px 0 var(--retro-dark)`. On `:active` (dragging), the shadow increases to `6px 6px` and z-index jumps to `--z-note-dragging`.

**Done state:** Notes with status `done` get `opacity: 0.6` and `text-decoration: line-through` on their text.

**Bottom sheet editor:** At `<480px`, the `note-editor--bottom-sheet` class makes the textarea `position: fixed; bottom: 0`, with a semi-transparent backdrop overlay behind it.

---

## 14. App Orchestration

`src/App.tsx` is the root component that ties together all layers.

### Initialization (mount effect)

```typescript
useEffect(() => {
  async function init() {
    const boards = await getAllBoards()
    let board: Board
    if (boards.length === 0) {
      // First launch: create default board with 4 zones
      board = { id: nanoid(), name: 'My Board', zones: DEFAULT_ZONES, ... }
      await putBoard(board)
    } else {
      board = boards[0]
    }
    useBoardStore.getState().setBoards([board])

    const existingNotes = await getNotesByBoard(board.id)
    if (existingNotes.length > 0) {
      useNotesStore.getState().setNotes(existingNotes)
    }
  }
  init()
}, [])
```

**Default zones:** 4 zones at fixed positions: Inbox (gray), Todo (blue), In Progress (amber), Done (green). Each is 280x500px, spaced 300px apart starting at x=20.

### Responsive Zone Layout

Zones are recomputed on every viewport resize:

```typescript
const responsiveZones = useMemo(() => {
  const gap = 20
  const shellHeight = 100  // title bar + toolbar + status bar
  const totalWidth = viewportSize.w - gap
  const zoneWidth = Math.floor((totalWidth - gap) / count) - gap
  const zoneHeight = viewportSize.h - shellHeight - gap * 2
  // clamp minimums: width >= 180, height >= 300
}, [currentBoard?.zones, viewportSize])
```

### Drag-and-Drop System

Drag state is managed via a `useRef` (not state, to avoid re-renders during drag):

```typescript
const dragging = useRef<{
  id: string       // note being dragged
  startX: number   // pointer-down screen position
  startY: number
  noteX: number    // note's original world position
  noteY: number
} | null>(null)
```

**Drag start (`handleDragStart`):**
1. Reads the note's current position from the store
2. Records start positions in the ref
3. Sets pointer capture on the target element
4. Stops event propagation (prevents canvas pan)

**Drag move (`handleDragMove`):**
1. Computes delta in world-space: `dx = (clientX - startX) / zoom`
2. Moves the note to `noteX + dx, noteY + dy`
3. Checks if the note center overlaps any zone → highlights it as drop target

**Drag end (`handleDragEnd`):**
1. Finds overlapping zone at the note's center point
2. If zone found:
   - Snaps note position to zone interior
   - Updates note status to match zone (if zone has a `status`)
   - Enqueues UPDATE sync operation
3. If no zone: enqueues position-only UPDATE
4. Persists to IndexedDB via `putNote()`
5. Clears drag ref and drop-target highlight

### CRUD Handlers

**`handleNewNote()`:** Creates a note at the viewport center with random ±100px offset. The center is computed as `(-panX + window.innerWidth/2 - 80, -panY + window.innerHeight/2 - 60)`. The `-80` and `-60` offsets center the 160px-wide, ~120px-tall note.

**`handleUpdateNote(id, updates)`:** Updates store → persists to IDB → enqueues UPDATE sync op.

**`handleDeleteNote(id)`:** Soft-deletes in store → persists soft-deleted note to IDB → enqueues DELETE sync op.

### Render Tree

```
<div className="app">
  <TitleBar />
  <Toolbar onNewNote={handleNewNote} onResetView={resetViewport} />
  <Canvas>
    {responsiveZones.map(zone => <Zone />)}
    {boardNotes.map(note => <Note />)}
  </Canvas>
  <StatusBar syncStatus={syncStatus} notes={notes} boardId={currentBoard?.id} />
</div>
```

The `.app` div is a flex column filling the full viewport. Canvas flexes to fill remaining space between toolbar and status bar.

---

## 15. Offline-First Architecture

### Design Principle

IndexedDB is the source of truth, not the server. The app works entirely without a backend. The sync engine is additive — it pushes local changes to a server when available, but never blocks on network requests.

### Write Path

```
User action (create/edit/move/delete)
  │
  ├─→ Zustand store update (synchronous, optimistic)
  │     └─→ React re-render (immediate feedback)
  │
  ├─→ putNote() / putBoard() to IndexedDB (async, fire-and-forget)
  │
  └─→ enqueueOperation() → SyncStore queue (pending)
        │
        ├─ Online? → scheduleDrain() → drainQueue() → POST /api/sync/push
        │     ├─ Success → markSynced, clearSynced
        │     └─ Failure → markFailed, incrementRetry, schedule retry with backoff
        │
        └─ Offline? → operation stays queued until 'online' event
```

### Read Path (App Boot)

```
App mounts
  │
  ├─→ getAllBoards() from IndexedDB
  │     ├─ Empty? → create default board, putBoard()
  │     └─ Found? → use first board
  │
  ├─→ setBoards([board]) in BoardStore
  │
  ├─→ getNotesByBoard(board.id) from IndexedDB
  │
  └─→ setNotes(notes) in NotesStore → render
```

There is no server pull on boot currently. The read path is purely local.

### Reconnection Flow

```
Browser fires 'online' event
  │
  ├─→ SyncStore status → 'idle'
  │
  └─→ scheduleDrain(0)
        │
        ├─→ drainQueue() immediately (no delay on first attempt)
        │     │
        │     ├─ All synced → done
        │     │
        │     └─ Some failed → scheduleDrain(1)
        │           └─→ retry after 2s
        │                 └─→ scheduleDrain(2)
        │                       └─→ retry after 4s
        │                             └─→ ... up to MAX_RETRIES (5)
        │                                   └─→ status → 'error'
        │
        └─ Offline again? → status → 'offline', clear timeout
```

### Conflict Resolution Detail

When a `POST /api/sync/push` returns a `conflicts` array (the current MSW mock always returns empty conflicts), the app would:

1. For each conflict, compare `local.updatedAt` vs `server.updatedAt`
2. If local is newer or equal → keep local version
3. If server is newer → accept server version, update local store + IDB

The `mergeNotes()` and `mergeBoards()` functions handle this for the pull path, iterating server entities and resolving against the local map.

---

## 16. PWA Setup

### Manifest (`public/manifest.json`)

```json
{
  "name": "RETRO.DO",
  "short_name": "RETRO.DO",
  "description": "A spatial todo app with whiteboard/post-it UX",
  "start_url": "/retold/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#1a1a1a",
  "theme_color": "#1a1a1a",
  "categories": ["productivity"],
  "icons": [
    { "src": "/retold/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/retold/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

The manifest is custom (not auto-generated by vite-plugin-pwa, which is configured with `manifest: false`).

### Service Worker (vite-plugin-pwa + Workbox)

**Configuration** (`vite.config.ts`):

```typescript
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-cache',
          expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'gstatic-fonts-cache',
          expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
    ],
  },
  manifest: false,
})
```

**Caching strategies:**
- **Build assets** (JS, CSS, HTML, images, fonts): precached by Workbox glob patterns
- **Google Fonts CSS**: `CacheFirst` with 1-year expiration, up to 10 entries
- **Google Fonts files (gstatic)**: `CacheFirst` with 1-year expiration, up to 10 entries
- **`registerType: 'autoUpdate'`**: New service worker activates immediately without user prompt

---

## 17. Testing

### Framework

**Vitest 3** with jsdom environment. Test globals enabled (`describe`, `it`, `expect` available without imports).

### Setup (`src/test-setup.ts`)

```typescript
import 'fake-indexeddb/auto'    // Polyfills IndexedDB in jsdom
import '@testing-library/jest-dom'  // Adds toBeInTheDocument(), toHaveTextContent(), etc.
```

`fake-indexeddb/auto` patches the global scope with a complete IndexedDB implementation, allowing all `idb` operations to work in tests without modification.

### Mock Infrastructure

**MSW Server (`src/mocks/server.ts`):**

```typescript
import { setupServer } from 'msw/node'
import { handlers } from './handlers'
export const server = setupServer(...handlers)
```

Used in integration tests:

```typescript
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

**MSW Browser (`src/mocks/browser.ts`):**

```typescript
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
export const worker = setupWorker(...handlers)
```

Used in dev mode (conditionally loaded in `main.tsx`).

**In-Memory Mock Database (`src/mocks/db.ts`):**

A `MockDatabase` class with `Map<string, Note>` and `Map<string, Board>` backing stores. Provides the same CRUD interface as the real API. Key behaviors:
- `deleteNote()` performs a soft delete (sets `deletedAt`)
- `getNotesByBoard()` filters out soft-deleted notes
- `reset()` clears both maps (called between tests)

**Handlers (`src/mocks/handlers.ts`):**

24 MSW handlers covering all API endpoints. Key conventions:
- POST returns `201`
- DELETE returns `204`
- Not-found returns `404`
- The sync push handler processes all ops and returns all IDs as synced (no conflicts)
- The sync pull handler returns all data from the mock DB

### Test Coverage

| Test File | Lines | Coverage Area |
|-----------|-------|---------------|
| `stores.test.ts` | ~197 | NotesStore CRUD, BoardStore viewport/board selection, SyncStore queue operations |
| `sync.test.ts` | ~129 | Enqueue, drain, empty queue, exponential backoff delays, conflict resolution (LWW), mergeNotes |
| `db.test.ts` | ~165 | All 15 DB operations across notes, boards, syncOps |
| `client.test.ts` | ~2.3k | ApiError class, GET/POST/PUT/PATCH/DELETE methods, JSON serialization |
| `gestures.test.ts` | ~3.7k | FSM state transitions, long-press timing, double-tap timing, drag threshold, pan/zoom |
| `viewport.test.ts` | ~1.8k | screenToWorld, worldToScreen, zoomAt (point remains under cursor) |
| `online-status.test.ts` | ~2.2k | useSyncExternalStore, online/offline event dispatch |
| `note.test.tsx` | ~3.0k | Status cycling, text editing, delete button, color rendering |
| `zone.test.tsx` | ~2.5k | isPointInZone, findOverlappingZone, snapToZone, drop-target highlight |
| `canvas.test.tsx` | ~659 | Pointer-based panning, wheel zoom |
| `shell.test.tsx` | ~4.1k | TitleBar dots/title, Toolbar hamburger/actions, StatusBar counts/indicator |
| `accessibility.test.tsx` | ~4.6k | ARIA labels, keyboard navigation, screen reader semantics, focus management |
| `responsive.test.tsx` | ~1.3k | Mobile layout, 44px touch targets |
| `lifecycle.test.tsx` | ~3.1k | App mount, IndexedDB hydration, sync engine start/cleanup |
| `app.test.tsx` | ~282 | Root component renders without errors |
| `mock-api.test.ts` | ~5.5k | All MSW handlers via actual fetch() calls |
| `pwa.test.ts` | ~1.4k | Manifest content, service worker registration |
| `tokens.test.ts` | ~891 | CSS custom properties defined in DOM |

### Running Tests

```bash
bun run test                          # All tests, single run
bun run test:watch                    # Watch mode
bunx vitest run src/__tests__/db.test.ts  # Single file
```

---

## 18. CI/CD

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)

Triggered on push to `main`. Two jobs:

**Job 1: `test`**

```yaml
runs-on: ubuntu-latest
steps:
  - uses: actions/checkout@v4
  - uses: oven-sh/setup-bun@v2
  - run: bun install
  - run: bun run lint       # Biome check
  - run: bun run test       # Vitest run
```

**Job 2: `deploy`** (depends on `test` passing)

```yaml
runs-on: ubuntu-latest
environment:
  name: github-pages
  url: ${{ steps.deployment.outputs.page_url }}
steps:
  - uses: actions/checkout@v4
  - uses: oven-sh/setup-bun@v2
  - run: bun install
  - run: bun run build      # tsc -b && vite build
  - uses: actions/configure-pages@v5
  - uses: actions/upload-pages-artifact@v3
    with:
      path: dist
  - id: deployment
    uses: actions/deploy-pages@v4
```

**Concurrency:** Group `pages`, `cancel-in-progress: false` — queues deploys rather than canceling in-flight ones.

**Permissions:** `contents: read`, `pages: write`, `id-token: write` (for GitHub Pages OIDC).

### Pipeline Summary

```
Push to main
  │
  ├─→ test job
  │     ├─ bun install
  │     ├─ biome check src (lint)
  │     └─ vitest run (tests)
  │
  └─→ deploy job (only if test passes)
        ├─ bun install
        ├─ tsc -b && vite build
        └─ Upload dist/ → GitHub Pages
```

---

## 19. Conventions

### Biome Configuration (`biome.json`)

| Setting | Value |
|---------|-------|
| Indent style | Spaces |
| Indent width | 2 |
| Line width | 100 |
| Quote style | Single quotes |
| Semicolons | As needed (omitted where optional) |
| Rules | Recommended |
| VCS | Git-based ignore (respects `.gitignore`) |
| Import organization | Auto-organize enabled via `assist.actions.source.organizeImports` |

### Soft Deletes

Notes use a `deletedAt: string | null` field. When "deleted":
- `deletedAt` is set to the current ISO timestamp
- The note remains in IndexedDB and the Zustand store
- UI filters exclude notes where `deletedAt` is truthy
- A DELETE sync operation is enqueued for the server

### ID Generation

All entity IDs use `nanoid()` (21-character, URL-safe, collision-resistant strings). IDs are generated client-side before any persistence or sync.

### Timestamps

All timestamps are ISO 8601 strings (via `new Date().toISOString()`). `updatedAt` is automatically refreshed on every mutation. `createdAt` is set once at creation.

### Vite Base Path

The app is deployed to GitHub Pages under `/retold/`, configured via `base: '/retold/'` in `vite.config.ts`. The PWA manifest's `start_url` matches: `"/retold/"`.

### TypeScript

- **Strict mode** enabled (all strict checks)
- **Target:** ES2023
- **Module:** ESNext
- **JSX:** react-jsx (automatic runtime)
- **Module resolution:** bundler
- **No unused locals/parameters** enforced
- Vite client types included for `import.meta.env`

### Component Patterns

- **Functional components** only (no classes)
- **`useCallback`** on all event handlers passed as props (memoization)
- **`useMemo`** for derived computations that scan collections
- **`useRef`** for mutable values that shouldn't trigger re-renders (drag state, gesture context)
- **Pointer events** used instead of mouse/touch events for unified input handling
- **`setPointerCapture`** ensures drag events are received even when the pointer leaves the element
- **ARIA attributes** on all interactive elements

### CSS Patterns

- **BEM naming:** `.block__element--modifier` (e.g., `note__status-badge`, `zone--drop-target`)
- **CSS custom properties** for all shared values
- **No CSS-in-JS** — standard CSS files imported in components
- **Mobile-first responsive** via `@media (max-width)` breakpoints in each stylesheet
- **44px minimum touch targets** on all interactive elements at mobile breakpoints
