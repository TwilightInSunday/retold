import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Note, Board, SyncOperation } from '../api/types'

export interface RetroDBSchema extends DBSchema {
  notes: {
    key: string;
    value: Note;
    indexes: { 'by-board': string };
  };
  boards: {
    key: string;
    value: Board;
  };
  syncOps: {
    key: string;
    value: SyncOperation;
    indexes: { 'by-status': string };
  };
}

const DB_NAME = 'retro-do';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<RetroDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<RetroDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<RetroDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
        noteStore.createIndex('by-board', 'boardId');

        db.createObjectStore('boards', { keyPath: 'id' });

        const syncStore = db.createObjectStore('syncOps', { keyPath: 'id' });
        syncStore.createIndex('by-status', 'status');
      },
    });
  }
  return dbPromise;
}

export function resetDBPromise() {
  dbPromise = null;
}
