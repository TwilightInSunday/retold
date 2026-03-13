import { useState, useRef, useCallback } from 'react'
import type { Note as NoteType } from '../../api/types'
import { NoteEditor } from './NoteEditor'
import '../../styles/note.css'

interface NoteProps {
  note: NoteType;
  onUpdate: (id: string, updates: Partial<NoteType>) => void;
  onDelete: (id: string) => void;
  onDragStart?: (id: string, e: React.PointerEvent) => void;
  onDragMove?: (id: string, e: React.PointerEvent) => void;
  onDragEnd?: (id: string, e: React.PointerEvent) => void;
}

const colorMap: Record<NoteType['color'], string> = {
  yellow: 'var(--note-yellow)',
  pink: 'var(--note-pink)',
  blue: 'var(--note-blue)',
  green: 'var(--note-green)',
  white: 'var(--note-white)',
};

export function Note({ note, onUpdate, onDelete, onDragStart, onDragMove, onDragEnd }: NoteProps) {
  const [editing, setEditing] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);

  const handleDoubleClick = useCallback(() => {
    setEditing(true);
  }, []);

  const handleSave = useCallback(
    (text: string) => {
      onUpdate(note.id, { text, status: note.status === 'draft' ? 'todo' : note.status });
      setEditing(false);
    },
    [note.id, note.status, onUpdate],
  );

  const handleCancel = useCallback(() => {
    setEditing(false);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (editing) return;
      onDragStart?.(note.id, e);
    },
    [editing, note.id, onDragStart],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (editing) return;
      onDragMove?.(note.id, e);
    },
    [editing, note.id, onDragMove],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (editing) return;
      onDragEnd?.(note.id, e);
    },
    [editing, note.id, onDragEnd],
  );

  const statusClass = `note--${note.status}`;

  return (
    <div
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
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="article"
      aria-label={`Note: ${note.text || 'empty'}`}
      tabIndex={0}
      data-note-id={note.id}
    >
      <div className="note__header">
        <span className="note__status-badge">{note.status}</span>
        <button
          className="note__delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
          aria-label="Delete note"
        >
          ×
        </button>
      </div>
      <div className="note__body">
        {editing ? (
          <NoteEditor
            initialText={note.text}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : (
          <p className="note__text">{note.text || 'Double-click to edit'}</p>
        )}
      </div>
    </div>
  );
}
