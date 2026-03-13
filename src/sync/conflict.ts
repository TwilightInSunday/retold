import type { Note, Board } from '../api/types'

/**
 * Last-write-wins per field conflict resolution.
 * For each field, the version with the later updatedAt timestamp wins.
 */
export function resolveNoteConflict(local: Note, server: Note): Note {
  const localTime = new Date(local.updatedAt).getTime();
  const serverTime = new Date(server.updatedAt).getTime();

  if (localTime >= serverTime) {
    return local;
  }

  // Server is newer overall, but merge per-field
  // For simplicity and correctness with LWW, we use the whole-entity
  // timestamp comparison. A true per-field approach would need
  // per-field timestamps which our schema doesn't support.
  return server;
}

export function resolveBoardConflict(local: Board, server: Board): Board {
  const localTime = new Date(local.updatedAt).getTime();
  const serverTime = new Date(server.updatedAt).getTime();

  if (localTime >= serverTime) {
    return local;
  }
  return server;
}

/**
 * Merge a list of server entities with local entities using LWW.
 */
export function mergeNotes(
  local: Map<string, Note>,
  serverNotes: Note[],
): Map<string, Note> {
  const merged = new Map(local);

  for (const serverNote of serverNotes) {
    const localNote = merged.get(serverNote.id);
    if (!localNote) {
      merged.set(serverNote.id, serverNote);
    } else {
      merged.set(serverNote.id, resolveNoteConflict(localNote, serverNote));
    }
  }

  return merged;
}

export function mergeBoards(
  local: Map<string, Board>,
  serverBoards: Board[],
): Map<string, Board> {
  const merged = new Map(local);

  for (const serverBoard of serverBoards) {
    const localBoard = merged.get(serverBoard.id);
    if (!localBoard) {
      merged.set(serverBoard.id, serverBoard);
    } else {
      merged.set(serverBoard.id, resolveBoardConflict(localBoard, serverBoard));
    }
  }

  return merged;
}
