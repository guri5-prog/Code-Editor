interface FileTreeNodeProps {
  label: string;
  depth: number;
  isActive?: boolean;
  isFolder?: boolean;
  isExpanded?: boolean;
  isDirty?: boolean;
  isDropTarget?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export function FileTreeNode({
  label,
  depth,
  isActive = false,
  isFolder = false,
  isExpanded = false,
  isDirty = false,
  isDropTarget = false,
  onToggle,
  onClick,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
}: FileTreeNodeProps) {
  return (
    <div
      role="treeitem"
      aria-expanded={isFolder ? isExpanded : undefined}
      aria-selected={isActive}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{
        ...nodeStyle,
        paddingLeft: 10 + depth * 14,
        backgroundColor: isActive ? 'rgba(56, 189, 248, 0.14)' : 'transparent',
        border: isDropTarget ? '1px dashed var(--accent)' : '1px solid transparent',
      }}
    >
      {isFolder ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
          aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          style={toggleStyle}
        >
          {isExpanded ? 'v' : '>'}
        </button>
      ) : (
        <span style={spacerStyle} />
      )}
      <span style={iconStyle}>{isFolder ? '[D]' : '[F]'}</span>
      <span style={labelStyle}>{label}</span>
      {!isFolder && isDirty && <span style={dirtyStyle} />}
    </div>
  );
}

const nodeStyle: React.CSSProperties = {
  height: 28,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  userSelect: 'none',
  borderRadius: 6,
  margin: '1px 6px',
  transition: 'background-color 120ms ease, border-color 120ms ease',
};

const toggleStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  border: 'none',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: 0,
  lineHeight: '16px',
  fontSize: 11,
};

const spacerStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 16,
};

const iconStyle: React.CSSProperties = {
  width: 26,
  fontSize: 9,
  letterSpacing: 0.2,
  color: 'var(--accent)',
  fontWeight: 700,
  textAlign: 'center',
  flexShrink: 0,
};

const labelStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const dirtyStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  backgroundColor: 'var(--accent)',
  marginRight: 8,
  flexShrink: 0,
};
