import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { server } from '../mocks/server'
import { db } from '../mocks/db'

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  db.reset()
})
afterAll(() => server.close())

describe('MSW Mock API', () => {
  describe('Boards', () => {
    it('creates and lists boards', async () => {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'b1', name: 'Test Board' }),
      })
      expect(res.status).toBe(201)
      const board = await res.json()
      expect(board.name).toBe('Test Board')

      const listRes = await fetch('/api/boards')
      const boards = await listRes.json()
      expect(boards).toHaveLength(1)
      expect(boards[0].id).toBe('b1')
    })

    it('gets a single board', async () => {
      await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'b2', name: 'Board 2' }),
      })

      const res = await fetch('/api/boards/b2')
      expect(res.ok).toBe(true)
      const board = await res.json()
      expect(board.name).toBe('Board 2')
    })

    it('returns 404 for missing board', async () => {
      const res = await fetch('/api/boards/nope')
      expect(res.status).toBe(404)
    })

    it('updates a board', async () => {
      await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'b3', name: 'Old' }),
      })

      const res = await fetch('/api/boards/b3', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New' }),
      })
      const board = await res.json()
      expect(board.name).toBe('New')
    })

    it('deletes a board', async () => {
      await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'b4', name: 'Delete Me' }),
      })

      const res = await fetch('/api/boards/b4', { method: 'DELETE' })
      expect(res.status).toBe(204)

      const listRes = await fetch('/api/boards')
      const boards = await listRes.json()
      expect(boards).toHaveLength(0)
    })
  })

  describe('Notes', () => {
    it('creates and lists notes for a board', async () => {
      const res = await fetch('/api/boards/b1/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'n1', text: 'Hello' }),
      })
      expect(res.status).toBe(201)
      const note = await res.json()
      expect(note.text).toBe('Hello')
      expect(note.boardId).toBe('b1')

      const listRes = await fetch('/api/boards/b1/notes')
      const notes = await listRes.json()
      expect(notes).toHaveLength(1)
    })

    it('patches a note', async () => {
      await fetch('/api/boards/b1/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'n2', text: 'Original' }),
      })

      const res = await fetch('/api/notes/n2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Updated' }),
      })
      const note = await res.json()
      expect(note.text).toBe('Updated')
    })

    it('soft-deletes a note', async () => {
      await fetch('/api/boards/b1/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'n3', text: 'Delete me' }),
      })

      const res = await fetch('/api/notes/n3', { method: 'DELETE' })
      expect(res.status).toBe(204)

      // Soft deleted — not in board list
      const listRes = await fetch('/api/boards/b1/notes')
      const notes = await listRes.json()
      expect(notes).toHaveLength(0)
    })
  })

  describe('Sync', () => {
    it('pushes sync operations', async () => {
      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          {
            id: 'op1',
            type: 'CREATE',
            entity: 'note',
            entityId: 'n10',
            payload: {
              id: 'n10',
              boardId: 'b1',
              text: 'Synced',
              status: 'todo',
              color: 'yellow',
              x: 0, y: 0,
              width: 160,
              rotation: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              deletedAt: null,
            },
            timestamp: new Date().toISOString(),
            retryCount: 0,
            status: 'pending',
          },
        ]),
      })
      const result = await res.json()
      expect(result.synced).toContain('op1')
      expect(result.conflicts).toHaveLength(0)
    })

    it('pulls all data', async () => {
      await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'b1', name: 'Pull Board' }),
      })

      const res = await fetch('/api/sync/pull?since=2020-01-01T00:00:00Z')
      const data = await res.json()
      expect(data.boards).toHaveLength(1)
      expect(Array.isArray(data.notes)).toBe(true)
    })
  })
})
