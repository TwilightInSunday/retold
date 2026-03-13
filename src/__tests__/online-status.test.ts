import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { useSyncStore } from '../store/sync'
import { server } from '../mocks/server'
import { db } from '../mocks/db'
import { enqueueOperation, drainQueue } from '../sync/queue'
import type { Note } from '../api/types'

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  db.reset()
})
afterAll(() => server.close())

describe('Online/Offline sync flow', () => {
  beforeEach(() => {
    useSyncStore.setState({ queue: [], status: 'idle', lastSyncedAt: null });
  })

  it('queues operations when offline and syncs when online', async () => {
    // Simulate: enqueue while "offline" (just don't drain)
    const payload: Note = {
      id: 'n1',
      boardId: 'b1',
      text: 'Created offline',
      status: 'todo',
      color: 'yellow',
      x: 50, y: 50,
      width: 160,
      rotation: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };

    enqueueOperation('CREATE', 'note', 'n1', payload);
    enqueueOperation('UPDATE', 'note', 'n1', { text: 'Edited offline' });

    expect(useSyncStore.getState().queue).toHaveLength(2);
    expect(useSyncStore.getState().getPending()).toHaveLength(2);

    // "Come online" — drain
    const result = await drainQueue();
    expect(result.synced).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
    expect(useSyncStore.getState().queue).toHaveLength(0);
    expect(useSyncStore.getState().status).toBe('idle');
    expect(useSyncStore.getState().lastSyncedAt).not.toBeNull();
  })

  it('sets status on sync operations', async () => {
    enqueueOperation('CREATE', 'note', 'n2', {
      id: 'n2', boardId: 'b1', text: 'Test', status: 'todo', color: 'yellow',
      x: 0, y: 0, width: 160, rotation: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    } as Note);

    const drainPromise = drainQueue();
    // Status should be syncing during drain
    expect(useSyncStore.getState().status).toBe('syncing');

    await drainPromise;
    expect(useSyncStore.getState().status).toBe('idle');
  })
})
