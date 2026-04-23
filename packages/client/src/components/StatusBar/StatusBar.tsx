import { useFileStore } from '../../store/fileStore';
import { SaveIndicator } from './SaveIndicator';
import { ConnectionIndicator } from './ConnectionIndicator';
import styles from './StatusBar.module.css';

import { useCursorStore } from '../../store/cursorStore';

export function StatusBar() {
  const activeFileId = useFileStore((s) => s.activeFileId);
  const activeFile = useFileStore((s) => (s.activeFileId ? s.files[s.activeFileId] : null));
  const cursorLine = useCursorStore((s) => s.line);
  const cursorColumn = useCursorStore((s) => s.column);

  return (
    <div className={styles.statusBar} role="status" aria-label="Editor status bar">
      <div className={styles.left}>
        {cursorLine !== undefined && cursorColumn !== undefined && (
          <span className={styles.item} aria-label={`Line ${cursorLine}, Column ${cursorColumn}`}>
            Ln {cursorLine}, Col {cursorColumn}
          </span>
        )}
        {activeFile && (
          <span className={styles.item} aria-label={`Language: ${activeFile.language}`}>
            {activeFile.language}
          </span>
        )}
        <span className={styles.item}>UTF-8</span>
      </div>
      <div className={styles.right} aria-live="polite">
        <SaveIndicator fileId={activeFileId} />
        <ConnectionIndicator />
      </div>
    </div>
  );
}
