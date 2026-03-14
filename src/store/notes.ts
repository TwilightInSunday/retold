import { nanoid } from 'nanoid'
import { create } from 'zustand'
import type { Note } from '../api/types'

export interface NotesState {
  notes: Map<string, Note>
  createNote: (boardId: string, x: number, y: number, color?: Note['color']) => Note
  updateNote: (id: string, updates: Partial<Note>) => void
  moveNote: (id: string, x: number, y: number) => void
  deleteNote: (id: string) => void
  setNotes: (notes: Note[]) => void
  getNote: (id: string) => Note | undefined
  getNotesByBoard: (boardId: string) => Note[]
}

export const useNotesStore = create<NotesState>()((set, get) => ({
  notes: new Map(),

  createNote: (boardId, x, y, color = 'yellow') => {
    const now = new Date().toISOString()
    const note: Note = {
      id: nanoid(),
      boardId,
      text: '',
      status: 'inbox',
      color,
      x,
      y,
      width: 160,
      rotation: Math.random() * 6 - 3,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    set((state) => {
      const notes = new Map(state.notes)
      notes.set(note.id, note)
      return { notes }
    })
    return note
  },

  updateNote: (id, updates) => {
    set((state) => {
      const note = state.notes.get(id)
      if (!note) return state
      const notes = new Map(state.notes)
      notes.set(id, { ...note, ...updates, updatedAt: new Date().toISOString() })
      return { notes }
    })
  },

  moveNote: (id, x, y) => {
    set((state) => {
      const note = state.notes.get(id)
      if (!note) return state
      const notes = new Map(state.notes)
      notes.set(id, { ...note, x, y, updatedAt: new Date().toISOString() })
      return { notes }
    })
  },

  deleteNote: (id) => {
    set((state) => {
      const note = state.notes.get(id)
      if (!note) return state
      const notes = new Map(state.notes)
      notes.set(id, {
        ...note,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      return { notes }
    })
  },

  setNotes: (notesList) => {
    const notes = new Map<string, Note>()
    for (const note of notesList) {
      notes.set(note.id, note)
    }
    set({ notes })
  },

  getNote: (id) => get().notes.get(id),

  getNotesByBoard: (boardId) =>
    Array.from(get().notes.values()).filter((n) => n.boardId === boardId && !n.deletedAt),
}))
