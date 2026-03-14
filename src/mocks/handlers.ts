import { HttpResponse, http } from 'msw'
import type { Board, Note, SyncOperation, Zone } from '../api/types'
import { db } from './db'

function createDefaultZones(): Zone[] {
  const statuses: Zone['status'][] = ['inbox', 'todo', 'in-progress', 'done']
  const labels = ['Inbox', 'Todo', 'In Progress', 'Done']
  const colors = ['#888888', '#3b82f6', '#f59e0b', '#22c55e']
  return statuses.map((status, i) => ({
    id: `zone-${status}`,
    label: labels[i],
    status,
    x: 20 + i * 300,
    y: 0,
    width: 280,
    height: 500,
    color: colors[i],
  }))
}

export const handlers = [
  // Boards
  http.get('/api/boards', () => {
    return HttpResponse.json(db.getBoards())
  }),

  http.post('/api/boards', async ({ request }) => {
    const body = (await request.json()) as Partial<Board>
    const now = new Date().toISOString()
    const board: Board = {
      id: body.id || crypto.randomUUID(),
      name: body.name || 'Untitled',
      zones: body.zones || createDefaultZones(),
      createdAt: now,
      updatedAt: now,
    }
    return HttpResponse.json(db.createBoard(board), { status: 201 })
  }),

  http.get('/api/boards/:id', ({ params }) => {
    const board = db.getBoard(params.id as string)
    if (!board) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(board)
  }),

  http.put('/api/boards/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<Board>
    const updated = db.updateBoard(params.id as string, body)
    if (!updated) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.delete('/api/boards/:id', ({ params }) => {
    const deleted = db.deleteBoard(params.id as string)
    if (!deleted) return new HttpResponse(null, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  // Notes
  http.get('/api/boards/:boardId/notes', ({ params }) => {
    return HttpResponse.json(db.getNotesByBoard(params.boardId as string))
  }),

  http.post('/api/boards/:boardId/notes', async ({ params, request }) => {
    const body = (await request.json()) as Partial<Note>
    const now = new Date().toISOString()
    const note: Note = {
      id: body.id || crypto.randomUUID(),
      boardId: params.boardId as string,
      text: body.text || '',
      status: body.status || 'inbox',
      color: body.color || 'yellow',
      x: body.x || 0,
      y: body.y || 0,
      width: body.width || 160,
      rotation: body.rotation || Math.random() * 6 - 3,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    return HttpResponse.json(db.createNote(note), { status: 201 })
  }),

  http.get('/api/notes/:id', ({ params }) => {
    const note = db.getNote(params.id as string)
    if (!note) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(note)
  }),

  http.put('/api/notes/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<Note>
    const updated = db.updateNote(params.id as string, body)
    if (!updated) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.patch('/api/notes/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<Note>
    const updated = db.updateNote(params.id as string, body)
    if (!updated) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.delete('/api/notes/:id', ({ params }) => {
    const deleted = db.deleteNote(params.id as string)
    if (!deleted) return new HttpResponse(null, { status: 404 })
    return new HttpResponse(null, { status: 204 })
  }),

  // Sync
  http.post('/api/sync/push', async ({ request }) => {
    const ops = (await request.json()) as SyncOperation[]
    const synced: string[] = []

    for (const op of ops) {
      if (op.entity === 'note') {
        switch (op.type) {
          case 'CREATE':
            db.createNote(op.payload as Note)
            break
          case 'UPDATE':
            db.updateNote(op.entityId, op.payload as Partial<Note>)
            break
          case 'DELETE':
            db.deleteNote(op.entityId)
            break
        }
      } else if (op.entity === 'board') {
        switch (op.type) {
          case 'CREATE':
            db.createBoard(op.payload as Board)
            break
          case 'UPDATE':
            db.updateBoard(op.entityId, op.payload as Partial<Board>)
            break
          case 'DELETE':
            db.deleteBoard(op.entityId)
            break
        }
      }
      synced.push(op.id)
    }

    return HttpResponse.json({ synced, conflicts: [] })
  }),

  http.get('/api/sync/pull', () => {
    return HttpResponse.json({
      notes: Array.from(db.notes.values()),
      boards: Array.from(db.boards.values()),
    })
  }),
]
