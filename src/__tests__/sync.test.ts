import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach } from 'vitest'
import { useSyncStore } from '../store/sync'
import { enqueueOperation, drainQueue } from '../sync/queue'
import { getBackoffDelay } from '../sync/engine'
import { resolveNoteConflict, mergeNotes } from '../sync/conflict'
import { server } from '../mocks/server'
import { db } from '../mocks/db'
import type { Note } from '../api/types'

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  db.reset()
})
afterAll(() => server.close())

describe('Sync Queue', () => {
  beforeEach(() => {
    useSyncStore.setState({ queue: [], status: 'idle', lastSyncedAt: null });
  })

  it('enqueues operations', () => {
    const op = enqueueOperation('CREATE', 'note', 'n1', { text: 'Hello' })
    expect(op.type).toBe('CREATE')
    expect(op.status).toBe('pending')
    expect(useSyncStore.getState().queue).toHaveLength(1)
  })

  it('drains queue successfully', async () => {
    enqueueOperation('CREATE', 'note', 'n1', {
      id: 'n1', boardId: 'b1', text: 'Hi', status: 'todo', color: 'yellow',
      x: 0, y: 0, width: 160, rotation: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    } as Note)

    const result = await drainQueue()
    expect(result.synced).toHaveLength(1)
    expect(result.failed).toHaveLength(0)
    expect(useSyncStore.getState().status).toBe('idle')
  })

  it('returns empty when queue is empty', async () => {
    const result = await drainQueue()
    expect(result.synced).toHaveLength(0)
    expect(result.failed).toHaveLength(0)
  })
})

describe('Backoff', () => {
  it('computes exponential backoff', () => {
    expect(getBackoffDelay(0)).toBe(1000)
    expect(getBackoffDelay(1)).toBe(2000)
    expect(getBackoffDelay(2)).toBe(4000)
    expect(getBackoffDelay(3)).toBe(8000)
  })

  it('caps at max delay', () => {
    expect(getBackoffDelay(10)).toBe(30000)
  })
})

describe('Conflict Resolution', () => {
  const baseNote: Note = {
    id: 'n1', boardId: 'b1', text: 'Original', status: 'todo', color: 'yellow',
    x: 0, y: 0, width: 160, rotation: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    deletedAt: null,
  }

  it('local wins when local is newer', () => {
    const local = { ...baseNote, text: 'Local', updatedAt: '2024-01-02T00:00:00Z' }
    const server = { ...baseNote, text: 'Server', updatedAt: '2024-01-01T12:00:00Z' }
    const result = resolveNoteConflict(local, server)
    expect(result.text).toBe('Local')
  })

  it('server wins when server is newer', () => {
    const local = { ...baseNote, text: 'Local', updatedAt: '2024-01-01T00:00:00Z' }
    const remote = { ...baseNote, text: 'Server', updatedAt: '2024-01-02T00:00:00Z' }
    const result = resolveNoteConflict(local, remote)
    expect(result.text).toBe('Server')
  })

  it('local wins on tie', () => {
    const local = { ...baseNote, text: 'Local', updatedAt: '2024-01-01T00:00:00Z' }
    const remote = { ...baseNote, text: 'Server', updatedAt: '2024-01-01T00:00:00Z' }
    const result = resolveNoteConflict(local, remote)
    expect(result.text).toBe('Local')
  })

  it('mergeNotes adds new server notes', () => {
    const local = new Map<string, Note>()
    local.set('n1', baseNote)

    const serverNotes = [
      { ...baseNote, id: 'n2', text: 'New from server' },
    ]

    const merged = mergeNotes(local, serverNotes)
    expect(merged.size).toBe(2)
    expect(merged.get('n2')?.text).toBe('New from server')
  })

  it('mergeNotes resolves conflicts', () => {
    const local = new Map<string, Note>()
    local.set('n1', { ...baseNote, text: 'Local edit', updatedAt: '2024-01-02T00:00:00Z' })

    const serverNotes = [
      { ...baseNote, text: 'Server edit', updatedAt: '2024-01-01T00:00:00Z' },
    ]

    const merged = mergeNotes(local, serverNotes)
    expect(merged.get('n1')?.text).toBe('Local edit')
  })
})
