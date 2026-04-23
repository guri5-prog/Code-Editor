import { useEffect, useState, useCallback } from 'react';
import type { TerminalTabInfo } from '@code-editor/shared';
import styles from './TerminalToolbar.module.css';

interface TerminalToolbarProps {
  tabs: TerminalTabInfo[];
  activeTabId: string | null;
  showHistory: boolean;
  stdinVisible: boolean;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onToggleHistory: () => void;
  onToggleStdin: () => void;
  onClear: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onSearch: (query: string) => void;
}

export function TerminalToolbar({
  tabs,
  activeTabId,
  showHistory,
  stdinVisible,
  onSelectTab,
  onCloseTab,
  onToggleHistory,
  onToggleStdin,
  onClear,
  onCopy,
  onDownload,
  onSearch,
}: TerminalToolbarProps) {
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      onSearch(value);
    },
    [onSearch],
  );

  const toggleSearch = useCallback(() => {
    setSearchVisible((visible) => {
      if (visible) {
        setSearchQuery('');
        onSearch('');
      }
      return !visible;
    });
  }, [onSearch]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'f') return;

      const target = event.target;
      if (target instanceof HTMLElement && target.closest('[data-terminal-panel="true"]')) {
        event.preventDefault();
        setSearchVisible(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.toolbar}>
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={!showHistory && activeTabId === tab.id ? styles.tabActive : styles.tab}
            onClick={() => onSelectTab(tab.id)}
            title={tab.title}
          >
            <span className={tab.type === 'repl' ? styles.tabIconRepl : styles.tabIconExec} />
            <span>{tab.title}</span>
            <span
              className={styles.tabClose}
              role="button"
              aria-label={`Close ${tab.title}`}
              onClick={(event) => {
                event.stopPropagation();
                onCloseTab(tab.id);
              }}
            >
              x
            </span>
          </button>
        ))}
        <button
          className={showHistory ? styles.tabActive : styles.tab}
          onClick={onToggleHistory}
          title="Execution history"
        >
          <span className={styles.tabIconHistory} />
          <span>History</span>
        </button>
        <button
          className={stdinVisible ? styles.tabActive : styles.tab}
          onClick={onToggleStdin}
          title="stdin sent when execution starts"
        >
          <span className={styles.tabIconStdin} />
          <span>stdin</span>
        </button>
      </div>

      <div className={styles.actions}>
        {searchVisible && (
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(event) => handleSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') toggleSearch();
              if (event.key === 'Enter') onSearch(searchQuery);
            }}
            autoFocus
          />
        )}
        <button className={styles.btn} onClick={toggleSearch} title="Search in terminal (Ctrl+F)">
          Search
        </button>
        <button className={styles.btn} onClick={onClear} title="Clear terminal">
          Clear
        </button>
        <button className={styles.btn} onClick={onCopy} title="Copy output">
          Copy
        </button>
        <button className={styles.btn} onClick={onDownload} title="Download as .txt">
          Download
        </button>
      </div>
    </div>
  );
}
