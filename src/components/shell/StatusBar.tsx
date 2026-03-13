import type { SyncStatus } from '../../store/sync'

interface StatusBarProps {
  syncStatus: SyncStatus;
  noteCount?: number;
}

const statusLabels: Record<SyncStatus, string> = {
  idle: 'Online — synced',
  syncing: 'Syncing...',
  offline: 'Offline',
  error: 'Sync error',
};

const statusIndicators: Record<SyncStatus, string> = {
  idle: 'status-bar__indicator--online',
  syncing: 'status-bar__indicator--syncing',
  offline: 'status-bar__indicator--offline',
  error: 'status-bar__indicator--error',
};

export function StatusBar({ syncStatus, noteCount = 0 }: StatusBarProps) {
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
        <span className="status-bar__count">{noteCount} note{noteCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
