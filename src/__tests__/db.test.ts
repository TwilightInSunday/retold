import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Board, Note, SyncOperation } from '../api/types'
import {
  clearSyncOps,
  deleteBoard,
  deleteNote,
  deleteSyncOp,
  getAllBoards,
  getAllNotes,
  getBoard,
  getNote,
  getNotesByBoard,
  getPendingSyncOps,
  getSyncOp,
  putBoard,
  putNote,
  putSyncOp,
} from '../db/operations'
import { getDB, resetDBPromise } from '../db/schema'

beforeEach(async () => {
  // Clear all stores between tests
  resetDBPromise()
  const db = await getDB()
  const tx = db.transaction(['notes', 'boards', 'syncOps'], 'readwrite')
  await Promise.all([
    tx.objectStore('notes').clear(),
    tx.objectStore('boards').clear(),
    tx.objectStore('syncOps').clear(),
    tx.done,
  ])
})

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    boardId: 'b1',
    text: 'Test',
    status: 'todo',
    color: 'yellow',
    x: 0,
    y: 0,
    width: 160,
    rotation: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    deletedAt: null,
    ...overrides,
  }
}

function makeBoard(overrides: Partial<Board> = {}): Board {
  return {
    id: 'b1',
    name: 'Test Board',
    zones: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('IndexedDB operations', () => {
  describe('Notes', () => {
    it('puts and gets a note', async () => {
      const note = makeNote()
      await putNote(note)
      const result = await getNote('n1')
      expect(result).toEqual(note)
    })

    it('gets notes by board', async () => {
      await putNote(makeNote({ id: 'n1', boardId: 'b1' }))
      await putNote(makeNote({ id: 'n2', boardId: 'b1' }))
      await putNote(makeNote({ id: 'n3', boardId: 'b2' }))

      const notes = await getNotesByBoard('b1')
      expect(notes).toHaveLength(2)
    })

    it('deletes a note', async () => {
      await putNote(makeNote())
      await deleteNote('n1')
      const result = await getNote('n1')
      expect(result).toBeUndefined()
    })

    it('gets all notes', async () => {
      await putNote(makeNote({ id: 'n1' }))
      await putNote(makeNote({ id: 'n2' }))
      const all = await getAllNotes()
      expect(all).toHaveLength(2)
    })
  })

  describe('Boards', () => {
    it('puts and gets a board', async () => {
      const board = makeBoard()
      await putBoard(board)
      const result = await getBoard('b1')
      expect(result).toEqual(board)
    })

    it('gets all boards', async () => {
      await putBoard(makeBoard({ id: 'b1' }))
      await putBoard(makeBoard({ id: 'b2' }))
      const all = await getAllBoards()
      expect(all).toHaveLength(2)
    })

    it('deletes a board', async () => {
      await putBoard(makeBoard())
      await deleteBoard('b1')
      const result = await getBoard('b1')
      expect(result).toBeUndefined()
    })
  })

  describe('Sync Operations', () => {
    const makeSyncOp = (overrides: Partial<SyncOperation> = {}): SyncOperation => ({
      id: 'op1',
      type: 'CREATE',
      entity: 'note',
      entityId: 'n1',
      payload: {},
      timestamp: '2024-01-01T00:00:00Z',
      retryCount: 0,
      status: 'pending',
      ...overrides,
    })

    it('puts and gets a sync op', async () => {
      const op = makeSyncOp()
      await putSyncOp(op)
      const result = await getSyncOp('op1')
      expect(result).toEqual(op)
    })

    it('gets pending sync ops', async () => {
      await putSyncOp(makeSyncOp({ id: 'op1', status: 'pending' }))
      await putSyncOp(makeSyncOp({ id: 'op2', status: 'synced' }))
      await putSyncOp(makeSyncOp({ id: 'op3', status: 'pending' }))

      const pending = await getPendingSyncOps()
      expect(pending).toHaveLength(2)
    })

    it('deletes a sync op', async () => {
      await putSyncOp(makeSyncOp())
      await deleteSyncOp('op1')
      const result = await getSyncOp('op1')
      expect(result).toBeUndefined()
    })

    it('clears all sync ops', async () => {
      await putSyncOp(makeSyncOp({ id: 'op1' }))
      await putSyncOp(makeSyncOp({ id: 'op2' }))
      await clearSyncOps()
      const pending = await getPendingSyncOps()
      expect(pending).toHaveLength(0)
    })
  })
})
