import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest'
import { server } from '../../src/mocks/server'
import { db } from '../../src/mocks/db'
import { useNotesStore } from '../../src/store/notes'
import { useBoardStore } from '../../src/store/board'
import { useSyncStore } from '../../src/store/sync'
import { enqueueOperation, drainQueue } from '../../src/sync/queue'
import { mergeNotes } from '../../src/sync/conflict'
import { get, post } from '../../src/api/client'
import { endpoints } from '../../src/api/endpoints'
import type { Note, Board, SyncPullResponse } from '../../src/api/types'

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  db.reset()
  useNotesStore.setState({ notes: new Map() })
  useBoardStore.setState({ panX: 0, panY: 0, zoom: 1, currentBoard: null, boards: new Map() })
  useSyncStore.setState({ queue: [], status: 'idle', lastSyncedAt: null })
})
afterAll(() => server.close())

describe('CRUD Flow Integration', () => {
  it('creates a board and notes via MSW, syncs to store', async () => {
    // Create board via API
    const board = await post<Board>(endpoints.boards.create(), {
      id: 'b1',
      name: 'Test Board',
    })
    expect(board.id).toBe('b1')

    // Set board in store
    useBoardStore.getState().setBoards([board])
    expect(useBoardStore.getState().currentBoard?.id).toBe('b1')

    // Create note via API
    const note = await post<Note>(endpoints.notes.create('b1'), {
      id: 'n1',
      text: 'Hello world',
      status: 'todo',
      color: 'yellow',
    })
    expect(note.boardId).toBe('b1')
    expect(note.text).toBe('Hello world')

    // Sync note to store
    useNotesStore.getState().setNotes([note])
    expect(useNotesStore.getState().notes.size).toBe(1)

    // List notes from API
    const notes = await get<Note[]>(endpoints.notes.list('b1'))
    expect(notes).toHaveLength(1)
    expect(notes[0].text).toBe('Hello world')
  })

  it('updates a note via store and syncs', async () => {
    // Create note in store
    const note = useNotesStore.getState().createNote('b1', 100, 200)

    // Update text
    useNotesStore.getState().updateNote(note.id, { text: 'Updated', status: 'todo' })

    // Enqueue sync op
    const updated = useNotesStore.getState().getNote(note.id)!
    enqueueOperation('CREATE', 'note', note.id, updated)
    enqueueOperation('UPDATE', 'note', note.id, { text: 'Updated' })

    expect(useSyncStore.getState().queue).toHaveLength(2)

    // Drain queue (sync with server)
    const result = await drainQueue()
    expect(result.synced).toHaveLength(2)
    expect(useSyncStore.getState().queue).toHaveLength(0)
  })

  it('deletes a note and syncs', async () => {
    // Create and delete in store
    const note = useNotesStore.getState().createNote('b1', 50, 50)
    useNotesStore.getState().deleteNote(note.id)

    const deleted = useNotesStore.getState().getNote(note.id)
    expect(deleted?.deletedAt).not.toBeNull()

    // Board view should not include deleted notes
    const boardNotes = useNotesStore.getState().getNotesByBoard('b1')
    expect(boardNotes).toHaveLength(0)
  })
})

describe('Offline Flow Integration', () => {
  it('queues operations offline and syncs on reconnect', async () => {
    // Create note in store (offline)
    const note = useNotesStore.getState().createNote('b1', 100, 100, 'pink')
    useNotesStore.getState().updateNote(note.id, { text: 'Offline note', status: 'todo' })

    const fullNote = useNotesStore.getState().getNote(note.id)!

    // Enqueue both operations
    enqueueOperation('CREATE', 'note', note.id, fullNote)
    enqueueOperation('UPDATE', 'note', note.id, { text: 'Offline note' })

    expect(useSyncStore.getState().queue).toHaveLength(2)
    expect(useSyncStore.getState().getPending()).toHaveLength(2)

    // "Come online" — drain the queue
    const result = await drainQueue()
    expect(result.synced).toHaveLength(2)
    expect(result.failed).toHaveLength(0)
    expect(useSyncStore.getState().status).toBe('idle')
    expect(useSyncStore.getState().lastSyncedAt).not.toBeNull()

    // Queue should be empty
    expect(useSyncStore.getState().queue).toHaveLength(0)

    // Note should be accessible via API
    const serverNote = await get<Note>(`/api/notes/${note.id}`)
    expect(serverNote.text).toBe('Offline note')
  })

  it('handles multiple offline edits to same note', async () => {
    const note = useNotesStore.getState().createNote('b1', 0, 0)

    // Multiple edits offline
    useNotesStore.getState().updateNote(note.id, { text: 'Edit 1' })
    useNotesStore.getState().updateNote(note.id, { text: 'Edit 2' })
    useNotesStore.getState().updateNote(note.id, { text: 'Final edit' })

    const finalNote = useNotesStore.getState().getNote(note.id)!
    enqueueOperation('CREATE', 'note', note.id, finalNote)

    const result = await drainQueue()
    expect(result.synced).toHaveLength(1)

    // Final state in store
    expect(useNotesStore.getState().getNote(note.id)?.text).toBe('Final edit')
  })
})

describe('Conflict Flow Integration', () => {
  it('resolves local edit wins over older server edit', async () => {
    const now = new Date()
    const earlier = new Date(now.getTime() - 60000)

    const localNote: Note = {
      id: 'n1', boardId: 'b1', text: 'Local edit',
      status: 'todo', color: 'yellow', x: 100, y: 100,
      width: 160, rotation: 0,
      createdAt: earlier.toISOString(),
      updatedAt: now.toISOString(),
      deletedAt: null,
    }

    const serverNote: Note = {
      id: 'n1', boardId: 'b1', text: 'Server edit',
      status: 'todo', color: 'yellow', x: 200, y: 200,
      width: 160, rotation: 0,
      createdAt: earlier.toISOString(),
      updatedAt: earlier.toISOString(),
      deletedAt: null,
    }

    // Local has the note
    const localNotes = new Map<string, Note>()
    localNotes.set('n1', localNote)

    // Merge with server data
    const merged = mergeNotes(localNotes, [serverNote])

    // Local wins because it has a newer updatedAt
    expect(merged.get('n1')?.text).toBe('Local edit')
    expect(merged.get('n1')?.x).toBe(100) // local position wins too
  })

  it('resolves server edit wins over older local edit', async () => {
    const now = new Date()
    const earlier = new Date(now.getTime() - 60000)

    const localNote: Note = {
      id: 'n1', boardId: 'b1', text: 'Old local',
      status: 'todo', color: 'yellow', x: 0, y: 0,
      width: 160, rotation: 0,
      createdAt: earlier.toISOString(),
      updatedAt: earlier.toISOString(),
      deletedAt: null,
    }

    const serverNote: Note = {
      id: 'n1', boardId: 'b1', text: 'New server',
      status: 'in-progress', color: 'pink', x: 300, y: 300,
      width: 160, rotation: 0,
      createdAt: earlier.toISOString(),
      updatedAt: now.toISOString(),
      deletedAt: null,
    }

    const localNotes = new Map<string, Note>()
    localNotes.set('n1', localNote)

    const merged = mergeNotes(localNotes, [serverNote])

    // Server wins
    expect(merged.get('n1')?.text).toBe('New server')
    expect(merged.get('n1')?.status).toBe('in-progress')
  })

  it('adds notes that only exist on server', async () => {
    const serverNote: Note = {
      id: 'n2', boardId: 'b1', text: 'From another device',
      status: 'todo', color: 'blue', x: 500, y: 500,
      width: 160, rotation: -2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    }

    const localNotes = new Map<string, Note>()
    const merged = mergeNotes(localNotes, [serverNote])

    expect(merged.size).toBe(1)
    expect(merged.get('n2')?.text).toBe('From another device')
  })

  it('end-to-end: pull from server and merge with local', async () => {
    // Set up server data
    await post<Board>(endpoints.boards.create(), { id: 'b1', name: 'Board' })
    await post<Note>(endpoints.notes.create('b1'), {
      id: 'server-n1', text: 'Server note', status: 'todo', color: 'green',
    })

    // Local has its own note
    const localNote = useNotesStore.getState().createNote('b1', 50, 50)

    // Pull from server
    const pullData = await get<SyncPullResponse>(endpoints.sync.pull('2020-01-01T00:00:00Z'))
    expect(pullData.notes.length).toBeGreaterThanOrEqual(1)

    // Merge
    const merged = mergeNotes(useNotesStore.getState().notes, pullData.notes)

    // Should have both local and server notes
    expect(merged.has(localNote.id)).toBe(true)
    expect(merged.has('server-n1')).toBe(true)

    // Update store
    useNotesStore.getState().setNotes(Array.from(merged.values()))
    expect(useNotesStore.getState().notes.size).toBe(2)
  })
})
