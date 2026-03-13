import { useEffect, useCallback } from 'react'
import { TitleBar } from './components/shell/TitleBar'
import { Toolbar } from './components/shell/Toolbar'
import { StatusBar } from './components/shell/StatusBar'
import { Canvas } from './components/board/Canvas'
import { Note } from './components/board/Note'
import { useSyncStore } from './store/sync'
import { useNotesStore } from './store/notes'
import { useBoardStore } from './store/board'
import { enqueueOperation } from './sync/queue'
import { get, post } from './api/client'
import { endpoints } from './api/endpoints'
import type { Board, Note as NoteType } from './api/types'
import './App.css'
import './styles/shell.css'
import './styles/board.css'

function App() {
  const syncStatus = useSyncStore((s) => s.status)
  const notes = useNotesStore((s) => s.notes)
  const noteCount = useNotesStore((s) => s.notes.size)
  const currentBoard = useBoardStore((s) => s.currentBoard)
  const resetViewport = useBoardStore((s) => s.resetViewport)
  const panX = useBoardStore((s) => s.panX)
  const panY = useBoardStore((s) => s.panY)

  // Initialize board on mount
  useEffect(() => {
    async function init() {
      try {
        const boards = await get<Board[]>(endpoints.boards.list())
        let board: Board
        if (boards.length === 0) {
          board = await post<Board>(endpoints.boards.create(), { name: 'My Board' })
        } else {
          board = boards[0]
        }
        useBoardStore.getState().setBoards([board])

        // Fetch existing notes
        const existingNotes = await get<NoteType[]>(endpoints.notes.list(board.id))
        if (existingNotes.length > 0) {
          useNotesStore.getState().setNotes(existingNotes)
        }
      } catch (e) {
        console.warn('Failed to initialize board:', e)
      }
    }
    init()
  }, [])

  // Create note handler
  const handleNewNote = useCallback(() => {
    if (!currentBoard) return
    const x = -panX + window.innerWidth / 2 - 80
    const y = -panY + window.innerHeight / 2 - 60
    const note = useNotesStore.getState().createNote(currentBoard.id, x, y)
    enqueueOperation('CREATE', 'note', note.id, note)
  }, [currentBoard, panX, panY])

  // Update note handler
  const handleUpdateNote = useCallback((id: string, updates: Partial<NoteType>) => {
    useNotesStore.getState().updateNote(id, updates)
    enqueueOperation('UPDATE', 'note', id, updates)
  }, [])

  // Delete note handler
  const handleDeleteNote = useCallback((id: string) => {
    useNotesStore.getState().deleteNote(id)
    enqueueOperation('DELETE', 'note', id, {})
  }, [])

  // Get visible notes for current board
  const boardNotes = currentBoard
    ? Array.from(notes.values()).filter(
        (n) => n.boardId === currentBoard.id && !n.deletedAt
      )
    : []

  return (
    <div className="app">
      <TitleBar />
      <Toolbar onNewNote={handleNewNote} onResetView={resetViewport} />
      <Canvas>
        {boardNotes.map((note) => (
          <Note
            key={note.id}
            note={note}
            onUpdate={handleUpdateNote}
            onDelete={handleDeleteNote}
          />
        ))}
      </Canvas>
      <StatusBar syncStatus={syncStatus} noteCount={noteCount} />
    </div>
  )
}

export default App
