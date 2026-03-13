import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { SyncOperation, Note, Board } from '../api/types'

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncState {
  queue: SyncOperation[];
  status: SyncStatus;
  lastSyncedAt: string | null;

  enqueue: (op: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>) => SyncOperation;
  dequeue: (id: string) => void;
  markSyncing: (id: string) => void;
  markSynced: (id: string) => void;
  markFailed: (id: string) => void;
  incrementRetry: (id: string) => void;
  setStatus: (status: SyncStatus) => void;
  setLastSyncedAt: (timestamp: string) => void;
  getPending: () => SyncOperation[];
  setQueue: (ops: SyncOperation[]) => void;
  clearSynced: () => void;
}

export const useSyncStore = create<SyncState>()((set, get) => ({
  queue: [],
  status: 'idle',
  lastSyncedAt: null,

  enqueue: (op) => {
    const syncOp: SyncOperation = {
      ...op,
      id: nanoid(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };
    set((state) => ({ queue: [...state.queue, syncOp] }));
    return syncOp;
  },

  dequeue: (id) => {
    set((state) => ({ queue: state.queue.filter((op) => op.id !== id) }));
  },

  markSyncing: (id) => {
    set((state) => ({
      queue: state.queue.map((op) =>
        op.id === id ? { ...op, status: 'syncing' as const } : op
      ),
    }));
  },

  markSynced: (id) => {
    set((state) => ({
      queue: state.queue.map((op) =>
        op.id === id ? { ...op, status: 'synced' as const } : op
      ),
    }));
  },

  markFailed: (id) => {
    set((state) => ({
      queue: state.queue.map((op) =>
        op.id === id ? { ...op, status: 'failed' as const } : op
      ),
    }));
  },

  incrementRetry: (id) => {
    set((state) => ({
      queue: state.queue.map((op) =>
        op.id === id ? { ...op, retryCount: op.retryCount + 1 } : op
      ),
    }));
  },

  setStatus: (status) => set({ status }),

  setLastSyncedAt: (timestamp) => set({ lastSyncedAt: timestamp }),

  getPending: () => get().queue.filter((op) => op.status === 'pending'),

  setQueue: (ops) => set({ queue: ops }),

  clearSynced: () => {
    set((state) => ({
      queue: state.queue.filter((op) => op.status !== 'synced'),
    }));
  },
}));
