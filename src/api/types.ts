export interface Note {
  id: string
  boardId: string
  text: string
  status: 'inbox' | 'todo' | 'in-progress' | 'done'
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'white'
  x: number
  y: number
  width: number
  rotation: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface Board {
  id: string
  name: string
  zones: Zone[]
  createdAt: string
  updatedAt: string
}

export interface Zone {
  id: string
  label: string
  status?: Note['status']
  x: number
  y: number
  width: number
  height: number
  color: string
}

export interface SyncOperation {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: 'note' | 'board'
  entityId: string
  payload: Partial<Note> | Partial<Board>
  timestamp: string
  retryCount: number
  status: 'pending' | 'syncing' | 'failed' | 'synced'
}

export interface SyncPushResponse {
  synced: string[]
  conflicts: Conflict[]
}

export interface SyncPullResponse {
  notes: Note[]
  boards: Board[]
}

export interface Conflict {
  entityId: string
  entity: 'note' | 'board'
  serverVersion: Note | Board
  clientVersion: Partial<Note> | Partial<Board>
}
