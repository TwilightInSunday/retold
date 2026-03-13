# RETRO.DO — Project Specification

## Overview

A spatial todo app with a whiteboard/post-it UX, offline-first architecture, retro Mac OS visual style, and mobile-first responsive design.

---

## Tech Stack

| Layer          | Choice              | Why                                      |
|----------------|---------------------|------------------------------------------|
| Runtime        | Bun                 | Fast, TS-native, runs Vite               |
| Bundler        | Vite (via Bun)      | HMR, fast builds, ESM-native             |
| UI             | React 19            | SPA, hooks for gesture/state             |
| Styling        | Standard CSS         | CSS custom properties, no build step     |
| State          | Zustand              | Tiny, TS-first, middleware for persist   |
| Persistence    | IndexedDB (via idb) | Offline storage, large capacity          |
| Mock API       | MSW 2.x             | Service worker intercept, real fetch()   |
| Testing        | Vitest               | Bun-compatible, fast, jest-compatible API|
| Offline cache  | Workbox              | Service worker for asset caching (PWA)   |

---

## Project Structure

```
retro-do/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── public/
│   └── manifest.json          # PWA manifest
│
├── src/
│   ├── main.tsx                # Entry point, MSW init
│   ├── App.tsx                 # Root: shell + canvas
│   ├── App.css                 # Global reset + CSS variables
│   │
│   ├── api/                    # API layer (contract-first)
│   │   ├── types.ts            # Shared types: Note, Board, SyncOp
│   │   ├── client.ts           # fetch wrappers (GET/POST/PUT/DELETE)
│   │   └── endpoints.ts        # URL constants
│   │
│   ├── mocks/                  # MSW setup
│   │   ├── browser.ts          # setupWorker()
│   │   ├── handlers.ts         # REST handlers matching api/types
│   │   └── db.ts               # In-memory mock database
│   │
│   ├── store/                  # Zustand stores
│   │   ├── notes.ts            # Note CRUD + positions
│   │   ├── board.ts            # Viewport state (pan, zoom)
│   │   ├── sync.ts             # Sync queue management
│   │   └── middleware/
│   │       └── persist.ts      # IndexedDB write-through
│   │
│   ├── db/                     # IndexedDB layer
│   │   ├── schema.ts           # DB schema + migrations
│   │   └── operations.ts       # get/put/delete wrappers
│   │
│   ├── sync/                   # Sync engine
│   │   ├── queue.ts            # Operation queue (enqueue, drain)
│   │   ├── engine.ts           # Online/offline detect, retry
│   │   └── conflict.ts         # Last-write-wins per field
│   │
│   ├── components/
│   │   ├── shell/              # Retro window chrome
│   │   │   ├── TitleBar.tsx
│   │   │   ├── Toolbar.tsx
│   │   │   └── StatusBar.tsx
│   │   │
│   │   ├── board/              # Whiteboard canvas
│   │   │   ├── Canvas.tsx       # Pan/zoom viewport
│   │   │   ├── Note.tsx         # Single post-it note
│   │   │   ├── NoteEditor.tsx   # Inline text editing
│   │   │   ├── Zone.tsx         # Swim-lane area
│   │   │   └── CreateButton.tsx # FAB for new note
│   │   │
│   │   └── shared/
│   │       ├── Checkbox.tsx
│   │       └── ColorPicker.tsx
│   │
│   ├── hooks/
│   │   ├── useGestures.ts      # Pan, zoom, drag, long-press
│   │   ├── useOnlineStatus.ts  # Navigator.onLine + events
│   │   └── useViewport.ts      # Transform matrix management
│   │
│   └── styles/
│       ├── tokens.css           # CSS custom properties (retro theme)
│       ├── shell.css            # Title bar, toolbar, status bar
│       ├── board.css            # Canvas, zones, dot grid
│       └── note.css             # Post-it note styles
│
└── tests/
    ├── store/
    │   └── notes.test.ts
    ├── sync/
    │   ├── queue.test.ts
    │   └── engine.test.ts
    ├── hooks/
    │   └── useGestures.test.ts
    └── integration/
        └── crud-flow.test.ts    # MSW + store round-trips
```

---

## Data Models

```typescript
// src/api/types.ts

export interface Note {
  id: string;                    // nanoid
  boardId: string;
  text: string;
  status: 'draft' | 'todo' | 'in-progress' | 'done';
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'white';
  x: number;                    // world-space position
  y: number;
  width: number;                // default 160
  rotation: number;             // slight random tilt (-3 to 3 deg)
  createdAt: string;            // ISO timestamp
  updatedAt: string;            // ISO timestamp — used for LWW
  deletedAt: string | null;     // soft delete
}

export interface Board {
  id: string;
  name: string;
  zones: Zone[];
  createdAt: string;
  updatedAt: string;
}

export interface Zone {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;                // border color hint
}

// Sync operation (queued when offline)
export interface SyncOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'note' | 'board';
  entityId: string;
  payload: Partial<Note> | Partial<Board>;
  timestamp: string;            // ISO — used for conflict resolution
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
}
```

---

## API Contract

All endpoints are RESTful. MSW implements these day 1, real server replaces later.

```
GET    /api/boards                    → Board[]
POST   /api/boards                    → Board
GET    /api/boards/:id                → Board
PUT    /api/boards/:id                → Board
DELETE /api/boards/:id                → void

GET    /api/boards/:boardId/notes     → Note[]
POST   /api/boards/:boardId/notes     → Note
GET    /api/notes/:id                 → Note
PUT    /api/notes/:id                 → Note
PATCH  /api/notes/:id                 → Note  (partial update: position, text, status)
DELETE /api/notes/:id                 → void

POST   /api/sync/push                 → { synced: string[], conflicts: Conflict[] }
GET    /api/sync/pull?since=<ISO>     → { notes: Note[], boards: Board[] }
```

---

## CSS Design Tokens (Retro Theme)

```css
/* src/styles/tokens.css */

:root {
  /* Retro palette — monochrome with accents */
  --retro-black:     #1a1a1a;
  --retro-dark:      #333333;
  --retro-mid:       #888888;
  --retro-light:     #d4d4d4;
  --retro-cream:     #f5f5f0;
  --retro-white:     #fafaf8;

  /* Post-it note colors */
  --note-yellow:     #fff3b0;
  --note-pink:       #ffc0cb;
  --note-blue:       #b3d9ff;
  --note-green:      #c1f0c1;
  --note-white:      #ffffff;

  /* Typography */
  --font-mono:       'Space Mono', 'Courier New', monospace;
  --font-sans:       'DM Sans', 'Chicago', system-ui, sans-serif;

  /* Borders — thick, deliberate */
  --border-thick:    2px solid var(--retro-black);
  --border-thin:     1px solid var(--retro-black);
  --border-dashed:   2px dashed var(--retro-mid);

  /* Spacing */
  --space-xs:        4px;
  --space-sm:        8px;
  --space-md:        16px;
  --space-lg:        24px;
  --space-xl:        40px;

  /* Board */
  --board-dot-color: #cccccc;
  --board-dot-size:  1px;
  --board-dot-gap:   24px;

  /* Z-index layers */
  --z-board:         1;
  --z-zone:          2;
  --z-note:          10;
  --z-note-dragging: 100;
  --z-toolbar:       200;
  --z-modal:         300;
}
```

---

## Offline-First Strategy

### Write Path
1. User creates/edits/moves/deletes a note
2. Zustand store updates immediately (optimistic UI)
3. `persist` middleware writes to IndexedDB
4. Sync queue enqueues a `SyncOperation`
5. If online → sync engine POSTs to API immediately
6. If offline → operation stays queued in IndexedDB

### Read Path (App Boot)
1. Open IndexedDB → hydrate Zustand store
2. Render immediately from local data
3. In background: `GET /api/sync/pull?since=lastSyncTimestamp`
4. Merge server data with local (LWW per field)
5. Update store + IndexedDB with merged result

### Conflict Resolution
- **Last-write-wins per field** using `updatedAt` timestamps
- Example: Phone edits `text` at T1, Desktop moves `x,y` at T2
  - Server sees: text from T1, position from T2 — both win
- Soft deletes (`deletedAt`) prevent data loss

### Reconnection
- Listen to `navigator.onLine` + `window.addEventListener('online')`
- On reconnect: drain queue with exponential backoff (1s, 2s, 4s, max 30s)
- Failed operations retry up to 5 times, then mark as `failed`
- Status bar shows sync state: ● Online — synced / ● Offline / ● Syncing...

---

## Gesture Engine Spec

```typescript
// src/hooks/useGestures.ts

interface GestureConfig {
  onPan:       (dx: number, dy: number) => void;
  onZoom:      (scale: number, cx: number, cy: number) => void;
  onTapNote:   (noteId: string) => void;
  onLongPress: (noteId: string, x: number, y: number) => void;
  onDrag:      (noteId: string, x: number, y: number) => void;
  onDrop:      (noteId: string, x: number, y: number) => void;
  onDoubleTap: (x: number, y: number) => void;
}

// Detection thresholds
const LONG_PRESS_MS = 400;
const DOUBLE_TAP_MS = 300;
const DRAG_THRESHOLD_PX = 8;    // movement before drag starts
const PINCH_THRESHOLD = 0.01;   // scale delta before zoom starts
```

### Touch State Machine
```
idle
  → pointerdown on note  → waiting_for_gesture
  → pointerdown on canvas → panning

waiting_for_gesture
  → 400ms elapsed, no move  → long_press → dragging
  → move > 8px              → panning
  → pointerup < 300ms       → tap (or double_tap if within 300ms of last tap)

dragging
  → pointermove → update note position (world coords)
  → pointerup  → drop note, snap to zone if overlapping

panning
  → pointermove → translate viewport
  → pointerup  → idle
```

---

## Mobile Responsive Strategy

| Breakpoint   | Layout changes                            |
|-------------|-------------------------------------------|
| ≥ 1024px    | Full toolbar, side-by-side zones          |
| 768–1023px  | Compact toolbar, zones still visible      |
| < 768px     | Hamburger menu, stacked zones, FAB bottom |
| < 480px     | Full-screen note editor on tap            |

Key mobile adaptations:
- Toolbar collapses into a hamburger menu
- Status bar becomes a thin indicator strip  
- Note editor opens as a bottom sheet (not inline)
- Zones stack vertically when viewport is narrow
- Touch targets minimum 44×44px everywhere
- FAB (floating action button) for "new note" — always visible

---

## Testing Strategy

```
Unit tests (Vitest):
  ├── Store: note CRUD, board state, sync queue
  ├── Sync: queue operations, drain logic, conflict resolution
  ├── Hooks: gesture math (world↔screen coords, zoom calculations)
  └── Utils: nanoid, timestamp helpers

Integration tests (Vitest + MSW):
  ├── CRUD flow: create note → MSW → store updated
  ├── Offline flow: create offline → queue → reconnect → sync
  └── Conflict flow: local edit + server edit → merged correctly

Manual testing:
  ├── Touch gestures on real iOS/Android devices
  ├── Offline mode: airplane mode → create notes → reconnect → verify sync
  └── Cross-browser: Safari, Chrome, Firefox mobile
```

---

## Deliverable Checklist

- [ ] Bun + Vite + React project scaffold
- [ ] CSS design tokens (retro theme)
- [ ] MSW handlers with in-memory DB
- [ ] IndexedDB schema + persistence layer
- [ ] Zustand stores (notes, board, sync)
- [ ] Whiteboard canvas with pan/zoom
- [ ] Post-it note component with inline editing
- [ ] Gesture engine (touch + mouse)
- [ ] Swim-lane zones with drag-to-zone
- [ ] Note lifecycle (draft → todo → doing → done)
- [ ] Retro shell (title bar, toolbar, status bar)
- [ ] Sync engine with operation queue
- [ ] Online/offline status + reconnection
- [ ] Mobile responsive layout
- [ ] PWA manifest + service worker
- [ ] Vitest unit + integration tests
- [ ] Accessibility: keyboard nav, ARIA labels
