import { describe, it, expect, beforeEach } from 'vitest'
import { useNotesStore } from '../store/notes'
import { useBoardStore } from '../store/board'
import { useSyncStore } from '../store/sync'
import type { Board } from '../api/types'

describe('NotesStore', () => {
  beforeEach(() => {
    useNotesStore.setState({ notes: new Map() });
  })

  it('creates a note', () => {
    const note = useNotesStore.getState().createNote('b1', 100, 200, 'pink')
    expect(note.boardId).toBe('b1')
    expect(note.x).toBe(100)
    expect(note.y).toBe(200)
    expect(note.color).toBe('pink')
    expect(note.status).toBe('draft')
    expect(useNotesStore.getState().notes.size).toBe(1)
  })

  it('updates a note', () => {
    const note = useNotesStore.getState().createNote('b1', 0, 0)
    useNotesStore.getState().updateNote(note.id, { text: 'Hello', status: 'todo' })
    const updated = useNotesStore.getState().getNote(note.id)
    expect(updated?.text).toBe('Hello')
    expect(updated?.status).toBe('todo')
  })

  it('moves a note', () => {
    const note = useNotesStore.getState().createNote('b1', 0, 0)
    useNotesStore.getState().moveNote(note.id, 50, 75)
    const moved = useNotesStore.getState().getNote(note.id)
    expect(moved?.x).toBe(50)
    expect(moved?.y).toBe(75)
  })

  it('soft-deletes a note', () => {
    const note = useNotesStore.getState().createNote('b1', 0, 0)
    useNotesStore.getState().deleteNote(note.id)
    const deleted = useNotesStore.getState().getNote(note.id)
    expect(deleted?.deletedAt).not.toBeNull()
  })

  it('getNotesByBoard filters by board and excludes deleted', () => {
    const n1 = useNotesStore.getState().createNote('b1', 0, 0)
    useNotesStore.getState().createNote('b1', 0, 0)
    useNotesStore.getState().createNote('b2', 0, 0)
    useNotesStore.getState().deleteNote(n1.id)

    const notes = useNotesStore.getState().getNotesByBoard('b1')
    expect(notes).toHaveLength(1)
  })

  it('setNotes replaces all notes', () => {
    useNotesStore.getState().createNote('b1', 0, 0)
    useNotesStore.getState().setNotes([
      { id: 'x1', boardId: 'b1', text: 'A', status: 'todo', color: 'yellow', x: 0, y: 0, width: 160, rotation: 0, createdAt: '', updatedAt: '', deletedAt: null },
    ])
    expect(useNotesStore.getState().notes.size).toBe(1)
    expect(useNotesStore.getState().getNote('x1')?.text).toBe('A')
  })
})

describe('BoardStore', () => {
  beforeEach(() => {
    useBoardStore.setState({ panX: 0, panY: 0, zoom: 1, currentBoard: null, boards: new Map() });
  })

  it('sets pan', () => {
    useBoardStore.getState().setPan(100, 200)
    expect(useBoardStore.getState().panX).toBe(100)
    expect(useBoardStore.getState().panY).toBe(200)
  })

  it('clamps zoom', () => {
    useBoardStore.getState().setZoom(0.1)
    expect(useBoardStore.getState().zoom).toBe(0.25)
    useBoardStore.getState().setZoom(10)
    expect(useBoardStore.getState().zoom).toBe(4)
  })

  it('resets viewport', () => {
    useBoardStore.getState().setPan(100, 200)
    useBoardStore.getState().setZoom(2)
    useBoardStore.getState().resetViewport()
    expect(useBoardStore.getState().panX).toBe(0)
    expect(useBoardStore.getState().zoom).toBe(1)
  })

  it('sets boards and auto-selects first', () => {
    const board: Board = { id: 'b1', name: 'Board', zones: [], createdAt: '', updatedAt: '' }
    useBoardStore.getState().setBoards([board])
    expect(useBoardStore.getState().boards.size).toBe(1)
    expect(useBoardStore.getState().currentBoard?.id).toBe('b1')
  })

  it('updates a board', () => {
    const board: Board = { id: 'b1', name: 'Old', zones: [], createdAt: '', updatedAt: '' }
    useBoardStore.getState().setBoards([board])
    useBoardStore.getState().setCurrentBoard(board)
    useBoardStore.getState().updateBoard('b1', { name: 'New' })
    expect(useBoardStore.getState().boards.get('b1')?.name).toBe('New')
    expect(useBoardStore.getState().currentBoard?.name).toBe('New')
  })
})

describe('SyncStore', () => {
  beforeEach(() => {
    useSyncStore.setState({ queue: [], status: 'idle', lastSyncedAt: null });
  })

  it('enqueues an operation', () => {
    const op = useSyncStore.getState().enqueue({
      type: 'CREATE',
      entity: 'note',
      entityId: 'n1',
      payload: {},
    })
    expect(op.status).toBe('pending')
    expect(op.retryCount).toBe(0)
    expect(useSyncStore.getState().queue).toHaveLength(1)
  })

  it('dequeues an operation', () => {
    const op = useSyncStore.getState().enqueue({
      type: 'CREATE',
      entity: 'note',
      entityId: 'n1',
      payload: {},
    })
    useSyncStore.getState().dequeue(op.id)
    expect(useSyncStore.getState().queue).toHaveLength(0)
  })

  it('marks syncing/synced/failed', () => {
    const op = useSyncStore.getState().enqueue({
      type: 'UPDATE',
      entity: 'note',
      entityId: 'n1',
      payload: {},
    })

    useSyncStore.getState().markSyncing(op.id)
    expect(useSyncStore.getState().queue[0].status).toBe('syncing')

    useSyncStore.getState().markSynced(op.id)
    expect(useSyncStore.getState().queue[0].status).toBe('synced')
  })

  it('increments retry count', () => {
    const op = useSyncStore.getState().enqueue({
      type: 'DELETE',
      entity: 'note',
      entityId: 'n1',
      payload: {},
    })
    useSyncStore.getState().incrementRetry(op.id)
    useSyncStore.getState().incrementRetry(op.id)
    expect(useSyncStore.getState().queue[0].retryCount).toBe(2)
  })

  it('getPending returns only pending ops', () => {
    useSyncStore.getState().enqueue({ type: 'CREATE', entity: 'note', entityId: 'n1', payload: {} })
    const op2 = useSyncStore.getState().enqueue({ type: 'UPDATE', entity: 'note', entityId: 'n2', payload: {} })
    useSyncStore.getState().markSynced(op2.id)

    const pending = useSyncStore.getState().getPending()
    expect(pending).toHaveLength(1)
  })

  it('clearSynced removes synced ops', () => {
    const op1 = useSyncStore.getState().enqueue({ type: 'CREATE', entity: 'note', entityId: 'n1', payload: {} })
    useSyncStore.getState().enqueue({ type: 'UPDATE', entity: 'note', entityId: 'n2', payload: {} })
    useSyncStore.getState().markSynced(op1.id)
    useSyncStore.getState().clearSynced()
    expect(useSyncStore.getState().queue).toHaveLength(1)
  })
})
