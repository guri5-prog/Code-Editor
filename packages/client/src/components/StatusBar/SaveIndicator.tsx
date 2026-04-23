import { useState, useEffect } from 'react';
import { useSaveStore, type SaveStatus } from '../../store/saveStore';
import styles from './StatusBar.module.css';

interface SaveIndicatorProps {
  fileId: string | null;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

const STATUS_LABELS: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Saving...',
  saved: 'Saved',
  error: 'Save failed',
  offline: 'Saved locally',
};

const STATUS_CLASSES: Record<SaveStatus, string> = {
  idle: '',
  saving: styles.saving,
  saved: styles.saved,
  error: styles.error,
  offline: styles.offline,
};

export function SaveIndicator({ fileId }: SaveIndicatorProps) {
  const status = useSaveStore((s) => (fileId ? s.statuses[fileId] : undefined)) ?? 'idle';
  const lastSaved = useSaveStore((s) => (fileId ? s.lastSavedAt[fileId] : undefined));
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!lastSaved) return;
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, [lastSaved]);

  if (status === 'idle' && !lastSaved) return null;

  const label = STATUS_LABELS[status];
  const timeAgo = lastSaved ? formatTimeAgo(lastSaved) : null;

  const ariaText = `${label}${status === 'saved' && timeAgo ? ` ${timeAgo}` : ''}`;

  return (
    <span className={`${styles.item} ${STATUS_CLASSES[status]}`} aria-label={ariaText}>
      {status === 'saving' && <span className={styles.dotBlue} aria-hidden="true" />}
      {status === 'saved' && <span className={styles.dotGreen} aria-hidden="true" />}
      {status === 'error' && <span className={styles.dotRed} aria-hidden="true" />}
      {status === 'offline' && <span className={styles.dotYellow} aria-hidden="true" />}
      {label}
      {status === 'saved' && timeAgo && ` ${timeAgo}`}
    </span>
  );
}
