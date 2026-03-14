import { create } from 'zustand'
import type { Board } from '../api/types'

export interface BoardState {
  // Viewport
  panX: number
  panY: number
  zoom: number

  // Current board
  currentBoard: Board | null
  boards: Map<string, Board>

  // Viewport actions
  setPan: (x: number, y: number) => void
  setZoom: (zoom: number) => void
  resetViewport: () => void

  // Board actions
  setCurrentBoard: (board: Board) => void
  setBoards: (boards: Board[]) => void
  updateBoard: (id: string, updates: Partial<Board>) => void
}

export const useBoardStore = create<BoardState>()((set, get) => ({
  panX: 0,
  panY: 0,
  zoom: 1,
  currentBoard: null,
  boards: new Map(),

  setPan: (x, y) => set({ panX: x, panY: y }),

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(4, zoom)) }),

  resetViewport: () => set({ panX: 0, panY: 0, zoom: 1 }),

  setCurrentBoard: (board) => set({ currentBoard: board }),

  setBoards: (boardsList) => {
    const boards = new Map<string, Board>()
    for (const board of boardsList) {
      boards.set(board.id, board)
    }
    set({ boards })
    if (!get().currentBoard && boardsList.length > 0) {
      set({ currentBoard: boardsList[0] })
    }
  },

  updateBoard: (id, updates) => {
    set((state) => {
      const board = state.boards.get(id)
      if (!board) return state
      const updated = { ...board, ...updates, updatedAt: new Date().toISOString() }
      const boards = new Map(state.boards)
      boards.set(id, updated)
      return {
        boards,
        currentBoard: state.currentBoard?.id === id ? updated : state.currentBoard,
      }
    })
  },
}))
