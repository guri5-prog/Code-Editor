import { useState, useMemo } from 'react';
import type { ExecutionHistoryEntry } from '@code-editor/shared';
import { useExecutionStore } from '../../store/executionStore';
import styles from './OutputHistory.module.css';

interface OutputHistoryProps {
  visible: boolean;
  onSelectEntry?: (entry: ExecutionHistoryEntry) => void;
}

export function OutputHistory({ visible, onSelectEntry }: OutputHistoryProps) {
  const history = useExecutionStore((s) => s.history);
  const clearHistory = useExecutionStore((s) => s.clearHistory);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(
      (e) =>
        e.language.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.result.stdout.toLowerCase().includes(q) ||
        e.result.stderr.toLowerCase().includes(q),
    );
  }, [history, searchQuery]);

  if (!visible) return null;

  return (
    <div className={styles.container}>
      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search history..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          className={styles.clearButton}
          type="button"
          onClick={clearHistory}
          disabled={history.length === 0}
        >
          Clear
        </button>
      </div>
      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.emptyHistory}>
            {history.length === 0 ? 'No executions yet' : 'No matching results'}
          </div>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.id}
              className={styles.entry}
              onClick={() => onSelectEntry?.(entry)}
              role={onSelectEntry ? 'button' : undefined}
              tabIndex={onSelectEntry ? 0 : undefined}
              onKeyDown={(event) => {
                if (!onSelectEntry) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectEntry(entry);
                }
              }}
            >
              <div className={styles.entryHeader}>
                <span className={styles.entryLang}>{entry.language}</span>
                <span className={styles.entryTime}>{formatTimestamp(entry.timestamp)}</span>
              </div>
              <div className={styles.entryCode}>{entry.code}</div>
              <div className={styles.entryResult}>
                <span
                  className={entry.result.exitCode === 0 ? styles.exitSuccess : styles.exitError}
                >
                  Exit: {entry.result.exitCode}
                </span>
                <span className={styles.duration}>{entry.result.executionTime}ms</span>
                {entry.result.timedOut && <span className={styles.exitError}>Timed out</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
