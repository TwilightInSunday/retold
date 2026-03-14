import type { Board, Note } from '../api/types'

class MockDatabase {
  notes: Map<string, Note> = new Map()
  boards: Map<string, Board> = new Map()

  // Boards
  getBoards(): Board[] {
    return Array.from(this.boards.values())
  }

  getBoard(id: string): Board | undefined {
    return this.boards.get(id)
  }

  createBoard(board: Board): Board {
    this.boards.set(board.id, board)
    return board
  }

  updateBoard(id: string, data: Partial<Board>): Board | undefined {
    const board = this.boards.get(id)
    if (!board) return undefined
    const updated = { ...board, ...data, updatedAt: new Date().toISOString() }
    this.boards.set(id, updated)
    return updated
  }

  deleteBoard(id: string): boolean {
    return this.boards.delete(id)
  }

  // Notes
  getNotesByBoard(boardId: string): Note[] {
    return Array.from(this.notes.values()).filter((n) => n.boardId === boardId && !n.deletedAt)
  }

  getNote(id: string): Note | undefined {
    return this.notes.get(id)
  }

  createNote(note: Note): Note {
    this.notes.set(note.id, note)
    return note
  }

  updateNote(id: string, data: Partial<Note>): Note | undefined {
    const note = this.notes.get(id)
    if (!note) return undefined
    const updated = { ...note, ...data, updatedAt: new Date().toISOString() }
    this.notes.set(id, updated)
    return updated
  }

  deleteNote(id: string): boolean {
    const note = this.notes.get(id)
    if (!note) return false
    this.notes.set(id, { ...note, deletedAt: new Date().toISOString() })
    return true
  }

  reset() {
    this.notes.clear()
    this.boards.clear()
  }
}

export const db = new MockDatabase()
