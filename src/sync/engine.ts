import { useSyncStore } from '../store/sync'
import { drainQueue } from './queue'

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

export function getBackoffDelay(retryCount: number): number {
  return Math.min(BASE_DELAY_MS * Math.pow(2, retryCount), MAX_DELAY_MS);
}

let drainTimeout: ReturnType<typeof setTimeout> | null = null;

export async function scheduleDrain(retryCount = 0): Promise<void> {
  if (drainTimeout) {
    clearTimeout(drainTimeout);
    drainTimeout = null;
  }

  if (retryCount >= MAX_RETRIES) {
    useSyncStore.getState().setStatus('error');
    return;
  }

  if (!navigator.onLine) {
    useSyncStore.getState().setStatus('offline');
    return;
  }

  const delay = retryCount === 0 ? 0 : getBackoffDelay(retryCount);

  drainTimeout = setTimeout(async () => {
    const result = await drainQueue();
    if (result.failed.length > 0) {
      await scheduleDrain(retryCount + 1);
    }
  }, delay);
}

export function startSyncEngine(): () => void {
  const handleOnline = () => {
    useSyncStore.getState().setStatus('idle');
    scheduleDrain();
  };

  const handleOffline = () => {
    useSyncStore.getState().setStatus('offline');
    if (drainTimeout) {
      clearTimeout(drainTimeout);
      drainTimeout = null;
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Set initial status
  if (!navigator.onLine) {
    useSyncStore.getState().setStatus('offline');
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (drainTimeout) {
      clearTimeout(drainTimeout);
      drainTimeout = null;
    }
  };
}
