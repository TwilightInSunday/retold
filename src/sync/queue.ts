import type { SyncOperation, Note, Board } from '../api/types'
import { useSyncStore } from '../store/sync'
import { post } from '../api/client'
import { endpoints } from '../api/endpoints'
import type { SyncPushResponse } from '../api/types'

export function enqueueOperation(
  type: SyncOperation['type'],
  entity: SyncOperation['entity'],
  entityId: string,
  payload: Partial<Note> | Partial<Board>,
): SyncOperation {
  return useSyncStore.getState().enqueue({ type, entity, entityId, payload });
}

export async function drainQueue(): Promise<{ synced: string[]; failed: string[] }> {
  const store = useSyncStore.getState();
  const pending = store.getPending();

  if (pending.length === 0) {
    return { synced: [], failed: [] };
  }

  // Mark all as syncing
  for (const op of pending) {
    store.markSyncing(op.id);
  }

  store.setStatus('syncing');

  try {
    const response = await post<SyncPushResponse>(endpoints.sync.push(), pending);

    for (const id of response.synced) {
      useSyncStore.getState().markSynced(id);
    }

    // Handle any that weren't in the synced list
    const syncedSet = new Set(response.synced);
    const failed: string[] = [];
    for (const op of pending) {
      if (!syncedSet.has(op.id)) {
        useSyncStore.getState().markFailed(op.id);
        useSyncStore.getState().incrementRetry(op.id);
        failed.push(op.id);
      }
    }

    useSyncStore.getState().clearSynced();
    useSyncStore.getState().setStatus('idle');
    useSyncStore.getState().setLastSyncedAt(new Date().toISOString());

    return { synced: response.synced, failed };
  } catch {
    // Revert to pending on network error
    for (const op of pending) {
      useSyncStore.getState().markFailed(op.id);
      useSyncStore.getState().incrementRetry(op.id);
    }
    useSyncStore.getState().setStatus('error');
    return { synced: [], failed: pending.map((op) => op.id) };
  }
}
