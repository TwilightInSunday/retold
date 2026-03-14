import { useMemo } from 'react'
import type { Note } from '../../api/types'
import type { SyncStatus } from '../../store/sync'

const STATUSES = ['inbox', 'todo', 'in-progress', 'done'] as const

interface StatusBarProps {
  syncStatus: SyncStatus
  notes: Map<string, Note>
  boardId?: string
}

const statusLabels: Record<SyncStatus, string> = {
  idle: 'Online — synced',
  syncing: 'Syncing...',
  offline: 'Offline',
  error: 'Sync error',
}

const statusIndicators: Record<SyncStatus, string> = {
  idle: 'status-bar__indicator--online',
  syncing: 'status-bar__indicator--syncing',
  offline: 'status-bar__indicator--offline',
  error: 'status-bar__indicator--error',
}

export function StatusBar({ syncStatus, notes, boardId }: StatusBarProps) {
  const counts = useMemo(() => {
    const result: Record<string, number> = { inbox: 0, todo: 0, 'in-progress': 0, done: 0 }
    for (const note of notes.values()) {
      if (!note.deletedAt && (!boardId || note.boardId === boardId)) {
        result[note.status]++
      }
    }
    return result
  }, [notes, boardId])

  return (
    <div className="status-bar" role="status" aria-live="polite">
      <div className="status-bar__left">
        <span
          className={`status-bar__indicator ${statusIndicators[syncStatus]}`}
          aria-hidden="true"
        />
        <span className="status-bar__label">{statusLabels[syncStatus]}</span>
      </div>
      <div className="status-bar__right">
        {STATUSES.map((status, i) => (
          <span key={status}>
            <span className={`status-bar__status-count status-bar__status-count--${status}`}>
              {counts[status]} {status}
            </span>
            {i < STATUSES.length - 1 && <span className="status-bar__separator"> · </span>}
          </span>
        ))}
      </div>
    </div>
  )
}
