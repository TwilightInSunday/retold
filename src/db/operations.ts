import type { Board, Note, SyncOperation } from '../api/types'
import { getDB } from './schema'

// Notes
export async function putNote(note: Note): Promise<void> {
  const db = await getDB()
  await db.put('notes', note)
}

export async function getNote(id: string): Promise<Note | undefined> {
  const db = await getDB()
  return db.get('notes', id)
}

export async function getNotesByBoard(boardId: string): Promise<Note[]> {
  const db = await getDB()
  return db.getAllFromIndex('notes', 'by-board', boardId)
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('notes', id)
}

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDB()
  return db.getAll('notes')
}

// Boards
export async function putBoard(board: Board): Promise<void> {
  const db = await getDB()
  await db.put('boards', board)
}

export async function getBoard(id: string): Promise<Board | undefined> {
  const db = await getDB()
  return db.get('boards', id)
}

export async function getAllBoards(): Promise<Board[]> {
  const db = await getDB()
  return db.getAll('boards')
}

export async function deleteBoard(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('boards', id)
}

// Sync Operations
export async function putSyncOp(op: SyncOperation): Promise<void> {
  const db = await getDB()
  await db.put('syncOps', op)
}

export async function getSyncOp(id: string): Promise<SyncOperation | undefined> {
  const db = await getDB()
  return db.get('syncOps', id)
}

export async function getPendingSyncOps(): Promise<SyncOperation[]> {
  const db = await getDB()
  return db.getAllFromIndex('syncOps', 'by-status', 'pending')
}

export async function getAllSyncOps(): Promise<SyncOperation[]> {
  const db = await getDB()
  return db.getAll('syncOps')
}

export async function deleteSyncOp(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('syncOps', id)
}

export async function clearSyncOps(): Promise<void> {
  const db = await getDB()
  await db.clear('syncOps')
}
