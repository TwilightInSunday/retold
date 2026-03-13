import type { StateCreator, StoreMutatorIdentifier } from 'zustand'
import { putNote, putBoard, putSyncOp } from '../../db/operations'
import type { Note, Board, SyncOperation } from '../../api/types'

type PersistImpl = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  f: StateCreator<T, Mps, Mcs>,
  config: PersistConfig<T>,
) => StateCreator<T, Mps, Mcs>

interface PersistConfig<T> {
  getEntities: (state: T) => {
    notes?: Map<string, Note>;
    boards?: Map<string, Board>;
    syncOps?: SyncOperation[];
  };
}

const persistImpl: PersistImpl = (f, config) => (set, get, api) => {
  const wrappedSet: typeof set = (...args) => {
    // Apply state change
    (set as (...a: unknown[]) => void)(...args);

    // Write through to IndexedDB
    const state = get();
    const entities = config.getEntities(state);

    if (entities.notes) {
      for (const note of entities.notes.values()) {
        putNote(note).catch(console.error);
      }
    }
    if (entities.boards) {
      for (const board of entities.boards.values()) {
        putBoard(board).catch(console.error);
      }
    }
    if (entities.syncOps) {
      for (const op of entities.syncOps) {
        putSyncOp(op).catch(console.error);
      }
    }
  };

  return f(wrappedSet, get, api);
};

export const persistMiddleware = persistImpl as unknown as PersistImpl;
