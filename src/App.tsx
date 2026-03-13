import { useEffect, useCallback, useRef } from 'react'
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

  // Drag state
  const dragging = useRef<{ id: string; startX: number; startY: number; noteX: number; noteY: number } | null>(null)

  const handleDragStart = useCallback((id: string, e: React.PointerEvent) => {
    const note = useNotesStore.getState().getNote(id)
    if (!note) return
    dragging.current = { id, startX: e.clientX, startY: e.clientY, noteX: note.x, noteY: note.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    e.stopPropagation()
  }, [])

  const handleDragMove = useCallback((id: string, e: React.PointerEvent) => {
    if (!dragging.current || dragging.current.id !== id) return
    e.stopPropagation()
    const zoom = useBoardStore.getState().zoom
    const dx = (e.clientX - dragging.current.startX) / zoom
    const dy = (e.clientY - dragging.current.startY) / zoom
    useNotesStore.getState().moveNote(id, dragging.current.noteX + dx, dragging.current.noteY + dy)
  }, [])

  const handleDragEnd = useCallback((id: string, e: React.PointerEvent) => {
    if (!dragging.current || dragging.current.id !== id) return
    e.stopPropagation()
    const note = useNotesStore.getState().getNote(id)
    if (note) enqueueOperation('UPDATE', 'note', id, { x: note.x, y: note.y })
    dragging.current = null
  }, [])

  // Create note handler
  const handleNewNote = useCallback(() => {
    if (!currentBoard) return
    const offsetX = (Math.random() - 0.5) * 200
    const offsetY = (Math.random() - 0.5) * 200
    const x = -panX + window.innerWidth / 2 - 80 + offsetX
    const y = -panY + window.innerHeight / 2 - 60 + offsetY
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
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          />
        ))}
      </Canvas>
      <StatusBar syncStatus={syncStatus} notes={notes} boardId={currentBoard?.id} />
    </div>
  )
}

export default App
