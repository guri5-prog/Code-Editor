interface QueuedSave {
  fileId: string;
  content: string;
  timestamp: number;
}

const STORAGE_KEY = 'offline_saves';

function loadQueue(): QueuedSave[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistQueue(queue: QueuedSave[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
}

export function enqueue(fileId: string, content: string): boolean {
  const queue = loadQueue();
  const existing = queue.findIndex((q) => q.fileId === fileId);
  const entry: QueuedSave = { fileId, content, timestamp: Date.now() };

  if (existing >= 0) {
    queue[existing] = entry;
  } else {
    queue.push(entry);
  }
  return persistQueue(queue);
}

export function dequeueAll(): QueuedSave[] {
  const queue = loadQueue();
  localStorage.removeItem(STORAGE_KEY);
  return queue;
}

export function hasQueued(): boolean {
  return loadQueue().length > 0;
}
