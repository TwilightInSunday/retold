import { nanoid } from 'nanoid'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Board, Note as NoteType, Zone as ZoneType } from './api/types'
import { Canvas } from './components/board/Canvas'
import { Note } from './components/board/Note'
import { findOverlappingZone, snapToZone, Zone } from './components/board/Zone'
import { StatusBar } from './components/shell/StatusBar'
import { TitleBar } from './components/shell/TitleBar'
import { Toolbar } from './components/shell/Toolbar'
import { getAllBoards, getNotesByBoard, putBoard, putNote } from './db/operations'
import { useBoardStore } from './store/board'
import { useNotesStore } from './store/notes'
import { useSyncStore } from './store/sync'
import { enqueueOperation } from './sync/queue'
import './App.css'
import './styles/shell.css'
import './styles/board.css'

const DEFAULT_ZONES: ZoneType[] = (() => {
  const statuses: ZoneType['status'][] = ['inbox', 'todo', 'in-progress', 'done']
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
})()

function App() {
  const syncStatus = useSyncStore((s) => s.status)
  const notes = useNotesStore((s) => s.notes)

  const currentBoard = useBoardStore((s) => s.currentBoard)
  const resetViewport = useBoardStore((s) => s.resetViewport)
  const panX = useBoardStore((s) => s.panX)
  const panY = useBoardStore((s) => s.panY)

  // Track viewport size for responsive zones
  const [viewportSize, setViewportSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const onResize = () => setViewportSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Compute responsive zone dimensions from board zones
  const responsiveZones = useMemo((): ZoneType[] => {
    const zones = currentBoard?.zones
    if (!zones || zones.length === 0) return []
    const count = zones.length
    const gap = 20
    const shellHeight = 100 // title bar + toolbar + status bar
    const totalWidth = viewportSize.w - gap
    const zoneWidth = Math.floor((totalWidth - gap) / count) - gap
    const zoneHeight = viewportSize.h - shellHeight - gap * 2
    return zones.map((z, i) => ({
      ...z,
      x: gap + i * (zoneWidth + gap),
      y: 0,
      width: Math.max(zoneWidth, 180),
      height: Math.max(zoneHeight, 300),
    }))
  }, [currentBoard?.zones, viewportSize])

  // Initialize board from IndexedDB on mount
  useEffect(() => {
    async function init() {
      const boards = await getAllBoards()
      let board: Board
      if (boards.length === 0) {
        const now = new Date().toISOString()
        board = {
          id: nanoid(),
          name: 'My Board',
          zones: DEFAULT_ZONES,
          createdAt: now,
          updatedAt: now,
        }
        await putBoard(board)
      } else {
        board = boards[0]
      }
      useBoardStore.getState().setBoards([board])

      const existingNotes = await getNotesByBoard(board.id)
      if (existingNotes.length > 0) {
        useNotesStore.getState().setNotes(existingNotes)
      }
    }
    init()
  }, [])

  // Drag state
  const [activeDropZoneId, setActiveDropZoneId] = useState<string | null>(null)
  const dragging = useRef<{
    id: string
    startX: number
    startY: number
    noteX: number
    noteY: number
  } | null>(null)

  const handleDragStart = useCallback((id: string, e: React.PointerEvent) => {
    const note = useNotesStore.getState().getNote(id)
    if (!note) return
    dragging.current = { id, startX: e.clientX, startY: e.clientY, noteX: note.x, noteY: note.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    e.stopPropagation()
  }, [])

  const handleDragMove = useCallback(
    (id: string, e: React.PointerEvent) => {
      if (!dragging.current || dragging.current.id !== id) return
      e.stopPropagation()
      const zoom = useBoardStore.getState().zoom
      const dx = (e.clientX - dragging.current.startX) / zoom
      const dy = (e.clientY - dragging.current.startY) / zoom
      const newX = dragging.current.noteX + dx
      const newY = dragging.current.noteY + dy
      useNotesStore.getState().moveNote(id, newX, newY)

      // Zone hover detection
      const note = useNotesStore.getState().getNote(id)
      if (note && responsiveZones.length > 0) {
        const centerX = newX + note.width / 2
        const centerY = newY + 60
        const zone = findOverlappingZone(centerX, centerY, responsiveZones)
        setActiveDropZoneId(zone?.id ?? null)
      }
    },
    [responsiveZones],
  )

  const handleDragEnd = useCallback(
    (id: string, e: React.PointerEvent) => {
      if (!dragging.current || dragging.current.id !== id) return
      e.stopPropagation()
      const note = useNotesStore.getState().getNote(id)
      if (note && responsiveZones.length > 0) {
        const centerX = note.x + note.width / 2
        const centerY = note.y + 60
        const zone = findOverlappingZone(centerX, centerY, responsiveZones)
        if (zone) {
          const snapped = snapToZone(note.x, note.y, note.width, zone)
          useNotesStore.getState().moveNote(id, snapped.x, snapped.y)
          const updates: Partial<NoteType> = { x: snapped.x, y: snapped.y }
          if (zone.status) {
            updates.status = zone.status
            useNotesStore.getState().updateNote(id, { status: zone.status })
          }
          enqueueOperation('UPDATE', 'note', id, updates)
        } else {
          enqueueOperation('UPDATE', 'note', id, { x: note.x, y: note.y })
        }
        const movedNote = useNotesStore.getState().getNote(id)
        if (movedNote) putNote(movedNote)
      } else if (note) {
        enqueueOperation('UPDATE', 'note', id, { x: note.x, y: note.y })
        putNote(note)
      }
      setActiveDropZoneId(null)
      dragging.current = null
    },
    [responsiveZones],
  )

  // Create note handler
  const handleNewNote = useCallback(() => {
    if (!currentBoard) return
    const offsetX = (Math.random() - 0.5) * 200
    const offsetY = (Math.random() - 0.5) * 200
    const x = -panX + window.innerWidth / 2 - 80 + offsetX
    const y = -panY + window.innerHeight / 2 - 60 + offsetY
    const note = useNotesStore.getState().createNote(currentBoard.id, x, y)
    putNote(note)
    enqueueOperation('CREATE', 'note', note.id, note)
  }, [currentBoard, panX, panY])

  // Update note handler
  const handleUpdateNote = useCallback((id: string, updates: Partial<NoteType>) => {
    useNotesStore.getState().updateNote(id, updates)
    const updatedNote = useNotesStore.getState().getNote(id)
    if (updatedNote) putNote(updatedNote)
    enqueueOperation('UPDATE', 'note', id, updates)
  }, [])

  // Delete note handler
  const handleDeleteNote = useCallback((id: string) => {
    useNotesStore.getState().deleteNote(id)
    const deletedNote = useNotesStore.getState().getNote(id)
    if (deletedNote) putNote(deletedNote)
    enqueueOperation('DELETE', 'note', id, {})
  }, [])

  // Get visible notes for current board
  const boardNotes = currentBoard
    ? Array.from(notes.values()).filter((n) => n.boardId === currentBoard.id && !n.deletedAt)
    : []

  return (
    <div className="app">
      <TitleBar />
      <Toolbar onNewNote={handleNewNote} onResetView={resetViewport} />
      <Canvas>
        {responsiveZones.map((zone) => (
          <Zone key={zone.id} zone={zone} isDropTarget={activeDropZoneId === zone.id} />
        ))}
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
