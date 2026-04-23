import { useEffect, useMemo, useState } from 'react';
import { FileTreeNode } from './FileTreeNode';

export interface ExplorerFile {
  id: string;
  path: string;
  name: string;
  language: string;
  isDirty: boolean;
}

interface FileTreeProps {
  files: ExplorerFile[];
  activeFileId: string | null;
  onOpenFile: (fileId: string) => void;
  onCreateFile: (targetFolder: string) => void;
  onCreateFolder: (targetFolder: string) => void;
  onRenameFile: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onDuplicateFile: (fileId: string) => void;
  onRenameFolder: (folderPath: string) => void;
  onDeleteFolder: (folderPath: string) => void;
  onDuplicateFolder: (folderPath: string) => void;
  onMoveFile: (fileId: string, targetFolder: string) => void;
  onMoveFolder: (folderPath: string, targetFolder: string) => void;
}

type MenuTarget =
  | { type: 'file'; id: string; path: string }
  | { type: 'folder'; path: string }
  | { type: 'root' };

interface MenuState {
  x: number;
  y: number;
  target: MenuTarget;
}

interface FolderNode {
  kind: 'folder';
  path: string;
  name: string;
  folders: FolderNode[];
  files: ExplorerFile[];
}

function normalizePath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '');
}

function parentPath(path: string): string {
  const normalized = normalizePath(path);
  const idx = normalized.lastIndexOf('/');
  return idx >= 0 ? normalized.slice(0, idx) : '';
}

function baseName(path: string): string {
  const normalized = normalizePath(path);
  const idx = normalized.lastIndexOf('/');
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

function buildFolderTree(files: ExplorerFile[]): FolderNode {
  const root: FolderNode = { kind: 'folder', path: '', name: '', folders: [], files: [] };
  const folderMap = new Map<string, FolderNode>([['', root]]);

  for (const file of files) {
    const normalized = normalizePath(file.path);
    const segments = normalized.split('/').filter(Boolean);
    let current = root;
    let currentPath = '';
    for (let i = 0; i < segments.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${segments[i]}` : segments[i];
      let folder = folderMap.get(currentPath);
      if (!folder) {
        folder = {
          kind: 'folder',
          path: currentPath,
          name: segments[i],
          folders: [],
          files: [],
        };
        folderMap.set(currentPath, folder);
        current.folders.push(folder);
      }
      current = folder;
    }
    current.files.push(file);
  }

  const sortTree = (node: FolderNode) => {
    node.folders.sort((a, b) => a.name.localeCompare(b.name));
    node.files.sort((a, b) => a.path.localeCompare(b.path));
    node.folders.forEach(sortTree);
  };
  sortTree(root);
  return root;
}

function collectFolderPaths(files: ExplorerFile[]): string[] {
  const set = new Set<string>(['']);
  for (const file of files) {
    let current: string | null = parentPath(file.path);
    while (current !== null) {
      set.add(current);
      current = current ? parentPath(current) : null;
    }
  }
  return Array.from(set);
}

export function FileTree({
  files,
  activeFileId,
  onOpenFile,
  onCreateFile,
  onCreateFolder,
  onRenameFile,
  onDeleteFile,
  onDuplicateFile,
  onRenameFolder,
  onDeleteFolder,
  onDuplicateFolder,
  onMoveFile,
  onMoveFolder,
}: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['']));
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const allFolders = collectFolderPaths(files);
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const folderPath of allFolders) next.add(folderPath);
      return next;
    });
  }, [files]);

  const closeMenu = () => setMenu(null);

  const filteredFiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return files;
    return files.filter((file) => file.path.toLowerCase().includes(needle));
  }, [files, query]);

  const filteredTree = useMemo(() => buildFolderTree(filteredFiles), [filteredFiles]);

  const renderFolder = (folder: FolderNode, depth: number) => {
    const isRoot = folder.path === '';
    const isExpanded = expanded.has(folder.path);

    return (
      <div key={folder.path || '__root'}>
        {!isRoot && (
          <FileTreeNode
            label={folder.name}
            depth={depth}
            isFolder
            isExpanded={isExpanded}
            isDropTarget={dropTargetKey === `folder:${folder.path}`}
            onToggle={() => {
              setExpanded((prev) => {
                const next = new Set(prev);
                if (next.has(folder.path)) next.delete(folder.path);
                else next.add(folder.path);
                return next;
              });
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({
                x: Math.min(e.clientX, window.innerWidth - 220),
                y: Math.min(e.clientY, window.innerHeight - 260),
                target: { type: 'folder', path: folder.path },
              });
            }}
            onDragStart={(e) => {
              e.dataTransfer.setData(
                'text/plain',
                JSON.stringify({ type: 'folder', path: folder.path }),
              );
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDropTargetKey(`folder:${folder.path}`);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDropTargetKey(null);
              const raw = e.dataTransfer.getData('text/plain');
              if (!raw) return;
              try {
                const data = JSON.parse(raw) as
                  | { type: 'file'; id: string; path: string }
                  | { type: 'folder'; path: string };
                if (data.type === 'file') {
                  onMoveFile(data.id, folder.path);
                  return;
                }
                if (!data.path || data.path === folder.path) return;
                if (folder.path.startsWith(`${data.path}/`)) return;
                onMoveFolder(data.path, folder.path);
              } catch {
                // ignore malformed drag payload
              }
            }}
          />
        )}
        {(isRoot || isExpanded) && (
          <>
            {folder.folders.map((child) => renderFolder(child, isRoot ? depth : depth + 1))}
            {folder.files.map((file) => (
              <FileTreeNode
                key={file.id}
                label={file.name}
                depth={isRoot ? depth : depth + 1}
                isActive={file.id === activeFileId}
                isDirty={file.isDirty}
                isDropTarget={dropTargetKey === `file:${file.id}`}
                onClick={() => onOpenFile(file.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({
                    x: Math.min(e.clientX, window.innerWidth - 220),
                    y: Math.min(e.clientY, window.innerHeight - 240),
                    target: { type: 'file', id: file.id, path: file.path },
                  });
                }}
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    'text/plain',
                    JSON.stringify({ type: 'file', id: file.id, path: file.path }),
                  );
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropTargetKey(`file:${file.id}`);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDropTargetKey(null);
                  const raw = e.dataTransfer.getData('text/plain');
                  if (!raw) return;
                  try {
                    const data = JSON.parse(raw) as
                      | { type: 'file'; id: string; path: string }
                      | { type: 'folder'; path: string };
                    const destinationFolder = parentPath(file.path);
                    if (data.type === 'file') {
                      onMoveFile(data.id, destinationFolder);
                      return;
                    }
                    if (!data.path) return;
                    if (
                      destinationFolder.startsWith(`${data.path}/`) ||
                      destinationFolder === data.path
                    )
                      return;
                    onMoveFolder(data.path, destinationFolder);
                  } catch {
                    // ignore malformed drag payload
                  }
                }}
              />
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={titleStyle}>PROJECT FILES</span>
        <div style={headerActionsStyle}>
          <button
            type="button"
            style={iconButtonStyle}
            onClick={() => setExpanded(new Set(collectFolderPaths(files)))}
            title="Expand all"
          >
            ++
          </button>
          <button
            type="button"
            style={iconButtonStyle}
            onClick={() => setExpanded(new Set(['']))}
            title="Collapse all"
          >
            --
          </button>
          <button
            type="button"
            style={iconButtonStyle}
            onClick={() => onCreateFile('')}
            title="New file"
          >
            +F
          </button>
          <button
            type="button"
            style={iconButtonStyle}
            onClick={() => onCreateFolder('')}
            title="New folder"
          >
            +D
          </button>
        </div>
      </div>

      <div style={searchWrapStyle}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files..."
          style={searchInputStyle}
        />
      </div>

      <div
        role="tree"
        style={listStyle}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({
            x: Math.min(e.clientX, window.innerWidth - 220),
            y: Math.min(e.clientY, window.innerHeight - 220),
            target: { type: 'root' },
          });
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDropTargetKey('root');
        }}
        onDragLeave={() => setDropTargetKey(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDropTargetKey(null);
          const raw = e.dataTransfer.getData('text/plain');
          if (!raw) return;
          try {
            const data = JSON.parse(raw) as
              | { type: 'file'; id: string; path: string }
              | { type: 'folder'; path: string };
            if (data.type === 'file') onMoveFile(data.id, '');
            else onMoveFolder(data.path, '');
          } catch {
            // ignore malformed drag payload
          }
        }}
      >
        {dropTargetKey === 'root' && (
          <div style={rootDropStyle}>Drop to move into project root</div>
        )}
        {filteredFiles.length === 0 ? (
          <p style={emptyStyle}>No files match your search.</p>
        ) : (
          renderFolder(filteredTree, 0)
        )}
      </div>

      {menu &&
        (() => {
          const targetFolder = menu.target.type === 'folder' ? menu.target.path : '';
          const targetFileId = menu.target.type === 'file' ? menu.target.id : '';
          return (
            <>
              <div
                style={backdropStyle}
                onClick={closeMenu}
                onContextMenu={(e) => e.preventDefault()}
              />
              <div style={{ ...menuStyle, left: menu.x, top: menu.y }} role="menu">
                {menu.target.type !== 'file' && (
                  <>
                    <button
                      type="button"
                      style={menuItemStyle}
                      onClick={() => {
                        onCreateFile(targetFolder);
                        closeMenu();
                      }}
                    >
                      New File
                    </button>
                    <button
                      type="button"
                      style={menuItemStyle}
                      onClick={() => {
                        onCreateFolder(targetFolder);
                        closeMenu();
                      }}
                    >
                      New Folder
                    </button>
                  </>
                )}
                {menu.target.type === 'file' && (
                  <>
                    <button
                      type="button"
                      style={menuItemStyle}
                      onClick={() => {
                        onRenameFile(targetFileId);
                        closeMenu();
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      style={menuItemStyle}
                      onClick={() => {
                        onDuplicateFile(targetFileId);
                        closeMenu();
                      }}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      style={menuDangerStyle}
                      onClick={() => {
                        onDeleteFile(targetFileId);
                        closeMenu();
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
                {menu.target.type === 'folder' && (
                  <>
                    <button
                      type="button"
                      style={menuItemStyle}
                      onClick={() => {
                        onRenameFolder(targetFolder);
                        closeMenu();
                      }}
                    >
                      Rename Folder
                    </button>
                    <button
                      type="button"
                      style={menuItemStyle}
                      onClick={() => {
                        onDuplicateFolder(targetFolder);
                        closeMenu();
                      }}
                    >
                      Duplicate Folder
                    </button>
                    <button
                      type="button"
                      style={menuDangerStyle}
                      onClick={() => {
                        onDeleteFolder(targetFolder);
                        closeMenu();
                      }}
                    >
                      Delete Folder
                    </button>
                  </>
                )}
              </div>
            </>
          );
        })()}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: 'linear-gradient(180deg, rgba(15,23,42,0.24), rgba(15,23,42,0.06))',
};

const headerStyle: React.CSSProperties = {
  height: 38,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 10px',
  borderBottom: '1px solid var(--border)',
};

const titleStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  color: 'var(--text-muted)',
  letterSpacing: 0.8,
};

const headerActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
};

const iconButtonStyle: React.CSSProperties = {
  minWidth: 28,
  height: 22,
  border: '1px solid var(--border)',
  borderRadius: 6,
  background: 'rgba(148,163,184,0.08)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: 10,
  fontWeight: 700,
  padding: '0 6px',
};

const searchWrapStyle: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid var(--border)',
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 6,
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: 12,
  padding: '7px 9px',
};

const listStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  paddingTop: 4,
};

const rootDropStyle: React.CSSProperties = {
  margin: '8px 10px',
  border: '1px dashed var(--accent)',
  borderRadius: 8,
  color: 'var(--accent)',
  fontSize: 11,
  padding: '7px 9px',
};

const emptyStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-muted)',
  padding: '8px 12px',
};

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 199,
};

const menuStyle: React.CSSProperties = {
  position: 'fixed',
  zIndex: 200,
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  boxShadow: '0 14px 34px var(--shadow-color)',
  minWidth: 180,
  padding: 6,
};

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  border: 'none',
  background: 'transparent',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 12,
  color: 'var(--text-primary)',
  cursor: 'pointer',
};

const menuDangerStyle: React.CSSProperties = {
  ...menuItemStyle,
  color: 'var(--error)',
};

export { normalizePath, parentPath, baseName };
