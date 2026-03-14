import { useCallback, useRef, useState } from 'react'
import type { Note as NoteType } from '../../api/types'
import { NoteEditor } from './NoteEditor'
import '../../styles/note.css'

interface NoteProps {
  note: NoteType
  onUpdate: (id: string, updates: Partial<NoteType>) => void
  onDelete: (id: string) => void
  onDragStart?: (id: string, e: React.PointerEvent) => void
  onDragMove?: (id: string, e: React.PointerEvent) => void
  onDragEnd?: (id: string, e: React.PointerEvent) => void
}

const STATUS_CYCLE: NoteType['status'][] = ['inbox', 'todo', 'in-progress', 'done']

const colorMap: Record<NoteType['color'], string> = {
  yellow: 'var(--note-yellow)',
  pink: 'var(--note-pink)',
  blue: 'var(--note-blue)',
  green: 'var(--note-green)',
  white: 'var(--note-white)',
}

export function Note({ note, onUpdate, onDelete, onDragStart, onDragMove, onDragEnd }: NoteProps) {
  const [editing, setEditing] = useState(false)
  const noteRef = useRef<HTMLDivElement>(null)

  const handleDoubleClick = useCallback(() => {
    setEditing(true)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (editing) return
      if (e.key === 'Enter') {
        e.preventDefault()
        setEditing(true)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        onDelete(note.id)
      }
    },
    [editing, note.id, onDelete],
  )

  const handleSave = useCallback(
    (text: string) => {
      onUpdate(note.id, { text, status: note.status === 'inbox' ? 'todo' : note.status })
      setEditing(false)
    },
    [note.id, note.status, onUpdate],
  )

  const handleCancel = useCallback(() => {
    setEditing(false)
    // Return focus to the note container
    noteRef.current?.focus()
  }, [])

  const handleStatusCycle = useCallback(() => {
    const currentIndex = STATUS_CYCLE.indexOf(note.status)
    const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length]
    onUpdate(note.id, { status: nextStatus })
  }, [note.id, note.status, onUpdate])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (editing) return
      e.stopPropagation()
      onDragStart?.(note.id, e)
    },
    [editing, note.id, onDragStart],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (editing) return
      e.stopPropagation()
      onDragMove?.(note.id, e)
    },
    [editing, note.id, onDragMove],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (editing) return
      e.stopPropagation()
      onDragEnd?.(note.id, e)
    },
    [editing, note.id, onDragEnd],
  )

  const statusClass = `note--${note.status}`

  return (
    <article
      ref={noteRef}
      className={`note ${statusClass}`}
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        backgroundColor: colorMap[note.color],
        transform: `rotate(${note.rotation}deg)`,
      }}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      aria-label={`Note: ${note.text || 'empty'}, status: ${note.status}, color: ${note.color}`}
      aria-roledescription="draggable note"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: notes are draggable and need keyboard focus
      tabIndex={0}
      data-note-id={note.id}
    >
      <div className="note__header">
        <button
          type="button"
          className="note__status-badge"
          onClick={(e) => {
            e.stopPropagation()
            handleStatusCycle()
          }}
          aria-label={`Status: ${note.status}. Click to change.`}
        >
          {note.status}
        </button>
        <button
          type="button"
          className="note__delete"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(note.id)
          }}
          aria-label="Delete note"
        >
          ×
        </button>
      </div>
      {editing && (
        // biome-ignore lint/a11y/useSemanticElements: backdrop overlay needs to be a div for full-screen coverage
        <div
          className="note-editor-backdrop"
          role="button"
          tabIndex={-1}
          aria-label="Close editor"
          onClick={() => noteRef.current?.querySelector('textarea')?.blur()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              noteRef.current?.querySelector('textarea')?.blur()
            }
          }}
        />
      )}
      <div className="note__body">
        {editing ? (
          <NoteEditor initialText={note.text} onSave={handleSave} onCancel={handleCancel} />
        ) : (
          <p className="note__text">{note.text || 'Double-click to edit'}</p>
        )}
      </div>
    </article>
  )
}
