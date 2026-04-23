import { useState } from 'react';
import { useFileStore } from '../../store/fileStore';
import { FileTreeNode } from './FileTreeNode';

interface FileExplorerProps {
  onNewFile: () => void;
  onRenameFile: (id: string) => void;
  onDeleteFile: (id: string) => void;
}

export function FileExplorer({ onNewFile, onRenameFile, onDeleteFile }: FileExplorerProps) {
  const tabOrder = useFileStore((s) => s.tabOrder);
  const files = useFileStore((s) => s.files);
  const activeFileId = useFileStore((s) => s.activeFileId);
  const setActiveFile = useFileStore((s) => s.setActiveFile);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>FILES</span>
        <button onClick={onNewFile} style={styles.newBtn} aria-label="New file" title="New file">
          +
        </button>
      </div>
      <div style={styles.list}>
        {tabOrder.map((id) => {
          const file = files[id];
          if (!file) return null;
          return (
            <FileTreeNode
              key={id}
              name={file.name}
              language={file.language}
              isActive={id === activeFileId}
              isDirty={file.isDirty}
              onClick={() => setActiveFile(id)}
              onContextMenu={(e) => {
                e.preventDefault();
                const menuW = 140;
                const menuH = 80;
                const x = Math.min(e.clientX, window.innerWidth - menuW);
                const y = Math.min(e.clientY, window.innerHeight - menuH);
                setContextMenuId(id);
                setContextMenuPos({ x, y });
              }}
            />
          );
        })}
      </div>

      {contextMenuId && (
        <>
          <div
            style={styles.backdrop}
            onClick={() => setContextMenuId(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenuId(null);
            }}
          />
          <div
            style={{ ...styles.contextMenu, left: contextMenuPos.x, top: contextMenuPos.y }}
            role="menu"
          >
            <button
              style={styles.menuItem}
              role="menuitem"
              onClick={() => {
                onRenameFile(contextMenuId);
                setContextMenuId(null);
              }}
            >
              Rename
            </button>
            <button
              style={styles.menuItem}
              role="menuitem"
              onClick={() => {
                onDeleteFile(contextMenuId);
                setContextMenuId(null);
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid var(--border)',
  },
  title: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '0.5px',
  },
  newBtn: {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'none',
    color: 'var(--text-secondary)',
    fontSize: '16px',
    cursor: 'pointer',
    borderRadius: '3px',
    padding: 0,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 0',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 199,
  },
  contextMenu: {
    position: 'fixed',
    zIndex: 200,
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    boxShadow: '0 4px 12px var(--shadow-color)',
    padding: '4px',
    minWidth: '120px',
  },
  menuItem: {
    display: 'block',
    width: '100%',
    padding: '6px 12px',
    border: 'none',
    background: 'none',
    color: 'var(--text-primary)',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    borderRadius: '3px',
    fontFamily: 'inherit',
  },
};
