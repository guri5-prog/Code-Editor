interface FileTreeNodeProps {
  name: string;
  language: string;
  isActive: boolean;
  isDirty: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const LANG_ICONS: Record<string, string> = {
  javascript: 'JS',
  typescript: 'TS',
  python: 'PY',
  java: 'JV',
  c: 'C',
  cpp: 'C+',
  go: 'GO',
  rust: 'RS',
  ruby: 'RB',
  php: 'PH',
  html: '<>',
  css: '#',
  json: '{}',
  markdown: 'MD',
};

export function FileTreeNode({
  name,
  language,
  isActive,
  isDirty,
  onClick,
  onContextMenu,
}: FileTreeNodeProps) {
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{
        ...styles.node,
        backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
      }}
      role="treeitem"
      aria-selected={isActive}
    >
      <span style={styles.icon}>{LANG_ICONS[language] ?? '?'}</span>
      <span style={styles.name}>{name}</span>
      {isDirty && <span style={styles.dirty} />}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  node: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  icon: {
    fontSize: '9px',
    fontWeight: 700,
    color: 'var(--accent)',
    width: '18px',
    textAlign: 'center' as const,
    flexShrink: 0,
  },
  name: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dirty: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent)',
    flexShrink: 0,
  },
};
