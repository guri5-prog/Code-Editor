import DiffMatchPatch from 'diff-match-patch';
import { useFileStore } from '../store/fileStore';
import { useSaveStore } from '../store/saveStore';
import * as offlineQueue from './offlineQueue';
import { getAccessToken } from './auth';

const DEBOUNCE_MS = 1500;
const HARD_SAVE_INTERVAL_MS = 30_000;

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
let hardSaveTimer: ReturnType<typeof setInterval> | null = null;
const dmp = new DiffMatchPatch();
const lastSavedContent = new Map<string, string>();
const lastSavedVersion = new Map<string, number>();

type SaveResult = 'ok' | 'conflict' | 'network-error' | 'server-error';

async function patchToServer(
  fileId: string,
  patchText: string,
  baseVersion: number,
): Promise<{ result: SaveResult; newVersion?: number }> {
  try {
    const token = getAccessToken();
    const res = await fetch(`/api/files/${fileId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ patch: patchText, baseVersion }),
    });
    if (res.ok) {
      const data = (await res.json()) as { version: number };
      return { result: 'ok', newVersion: data.version };
    }
    if (res.status === 409) return { result: 'conflict' };
    return { result: res.status >= 400 && res.status < 500 ? 'server-error' : 'network-error' };
  } catch {
    return { result: 'network-error' };
  }
}

async function saveToServer(fileId: string, content: string): Promise<SaveResult> {
  try {
    const token = getAccessToken();
    const res = await fetch(`/api/files/${fileId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const data = (await res.json()) as { version: number };
      lastSavedVersion.set(fileId, data.version);
      return 'ok';
    }
    return res.status >= 400 && res.status < 500 ? 'server-error' : 'network-error';
  } catch {
    return 'network-error';
  }
}

async function performSave(fileId: string): Promise<void> {
  const file = useFileStore.getState().files[fileId];
  if (!file || !file.isDirty) return;

  const { setStatus, setLastSavedAt } = useSaveStore.getState();

  if (!navigator.onLine) {
    const queued = offlineQueue.enqueue(fileId, file.content);
    setStatus(fileId, queued ? 'offline' : 'error');
    return;
  }

  setStatus(fileId, 'saving');

  const base = lastSavedContent.get(fileId);
  const baseVersion = lastSavedVersion.get(fileId);

  if (base !== undefined && baseVersion !== undefined) {
    const diffs = dmp.diff_main(base, file.content);
    dmp.diff_cleanupEfficiency(diffs);
    const patches = dmp.patch_make(base, diffs);
    const patchText = dmp.patch_toText(patches);

    const { result, newVersion } = await patchToServer(fileId, patchText, baseVersion);

    if (result === 'ok') {
      lastSavedContent.set(fileId, file.content);
      if (newVersion !== undefined) lastSavedVersion.set(fileId, newVersion);
      useFileStore.getState().markSaved(fileId);
      setStatus(fileId, 'saved');
      setLastSavedAt(fileId, Date.now());
      return;
    }

    if (result === 'conflict') {
      const fallback = await saveToServer(fileId, file.content);
      if (fallback === 'ok') {
        lastSavedContent.set(fileId, file.content);
        useFileStore.getState().markSaved(fileId);
        setStatus(fileId, 'saved');
        setLastSavedAt(fileId, Date.now());
        return;
      }
    }

    if (result === 'network-error') {
      offlineQueue.enqueue(fileId, file.content);
      setStatus(fileId, 'error');
      return;
    }

    setStatus(fileId, 'error');
    return;
  }

  const result = await saveToServer(fileId, file.content);
  if (result === 'ok') {
    lastSavedContent.set(fileId, file.content);
    useFileStore.getState().markSaved(fileId);
    setStatus(fileId, 'saved');
    setLastSavedAt(fileId, Date.now());
  } else if (result === 'network-error') {
    offlineQueue.enqueue(fileId, file.content);
    setStatus(fileId, 'error');
  } else {
    setStatus(fileId, 'error');
  }
}

export function scheduleSave(fileId: string): void {
  const existing = debounceTimers.get(fileId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    debounceTimers.delete(fileId);
    performSave(fileId);
  }, DEBOUNCE_MS);

  debounceTimers.set(fileId, timer);
}

export function saveNow(fileId: string): void {
  const existing = debounceTimers.get(fileId);
  if (existing) {
    clearTimeout(existing);
    debounceTimers.delete(fileId);
  }
  performSave(fileId);
}

const MAX_FLUSH_RETRIES = 3;
const FLUSH_BASE_DELAY_MS = 1000;
let flushRetryCount = 0;
let flushing = false;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function flushOfflineQueue(): Promise<void> {
  if (flushing) return;
  flushing = true;

  try {
    const queued = offlineQueue.dequeueAll();
    if (queued.length === 0) return;

    const { setStatus, setLastSavedAt } = useSaveStore.getState();

    for (const entry of queued) {
      const result = await saveToServer(entry.fileId, entry.content);
      if (result === 'ok') {
        lastSavedContent.set(entry.fileId, entry.content);
        const file = useFileStore.getState().files[entry.fileId];
        if (file && file.content === entry.content) {
          useFileStore.getState().markSaved(entry.fileId);
        }
        setStatus(entry.fileId, 'saved');
        setLastSavedAt(entry.fileId, Date.now());
        flushRetryCount = 0;
      } else if (result === 'network-error') {
        offlineQueue.enqueue(entry.fileId, entry.content);
        setStatus(entry.fileId, 'error');

        if (flushRetryCount < MAX_FLUSH_RETRIES) {
          flushRetryCount++;
          const backoff = FLUSH_BASE_DELAY_MS * Math.pow(2, flushRetryCount - 1);
          await delay(backoff);
          flushing = false;
          flushOfflineQueue();
        }
        return;
      } else {
        setStatus(entry.fileId, 'error');
      }
    }
    flushRetryCount = 0;
  } finally {
    flushing = false;
  }
}

async function hardSaveTick(): Promise<void> {
  const { files } = useFileStore.getState();
  for (const [id, file] of Object.entries(files)) {
    if (file.isDirty && !debounceTimers.has(id)) {
      await performSave(id);
    }
  }
}

export function startAutoSave(): () => void {
  hardSaveTimer = setInterval(hardSaveTick, HARD_SAVE_INTERVAL_MS);

  const onOnline = () => {
    useSaveStore.getState().setOnline(true);
    flushOfflineQueue();
  };
  const onOffline = () => {
    useSaveStore.getState().setOnline(false);
  };

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    if (hardSaveTimer) {
      clearInterval(hardSaveTimer);
      hardSaveTimer = null;
    }
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

export function initFileBaseline(fileId: string, content: string, version: number): void {
  lastSavedContent.set(fileId, content);
  lastSavedVersion.set(fileId, version);
}

export function cancelPendingSave(fileId: string): void {
  const timer = debounceTimers.get(fileId);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(fileId);
  }
  lastSavedContent.delete(fileId);
  lastSavedVersion.delete(fileId);
}
