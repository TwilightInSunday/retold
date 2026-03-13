const BASE = '/api';

export const endpoints = {
  boards: {
    list: () => `${BASE}/boards`,
    create: () => `${BASE}/boards`,
    get: (id: string) => `${BASE}/boards/${id}`,
    update: (id: string) => `${BASE}/boards/${id}`,
    delete: (id: string) => `${BASE}/boards/${id}`,
  },
  notes: {
    list: (boardId: string) => `${BASE}/boards/${boardId}/notes`,
    create: (boardId: string) => `${BASE}/boards/${boardId}/notes`,
    get: (id: string) => `${BASE}/notes/${id}`,
    update: (id: string) => `${BASE}/notes/${id}`,
    patch: (id: string) => `${BASE}/notes/${id}`,
    delete: (id: string) => `${BASE}/notes/${id}`,
  },
  sync: {
    push: () => `${BASE}/sync/push`,
    pull: (since: string) => `${BASE}/sync/pull?since=${encodeURIComponent(since)}`,
  },
} as const;
