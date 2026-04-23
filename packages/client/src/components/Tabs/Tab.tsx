interface TabProps {
  name: string;
  isActive: boolean;
  isDirty: boolean;
  onClick: () => void;
  onClose: () => void;
  onMiddleClick: () => void;
  index: number;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
}

export function Tab({
  name,
  isActive,
  isDirty,
  onClick,
  onClose,
  onMiddleClick,
  index,
  onDragStart,
  onDragOver,
  onDragEnd,
}: TabProps) {
  return (
    <div
      draggable
      onClick={onClick}
      onMouseDown={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          onMiddleClick();
        }
      }}
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(index);
      }}
      onDragEnd={onDragEnd}
      style={{
        ...styles.tab,
        backgroundColor: isActive ? 'var(--bg-primary)' : 'transparent',
        borderBottomColor: isActive ? 'var(--accent)' : 'transparent',
      }}
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
    >
      <span style={styles.name}>
        {isDirty && <span style={styles.dirty} aria-label="unsaved changes" />}
        {name}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={styles.closeBtn}
        aria-label={`Close ${name}`}
      >
        ×
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 12px',
    height: '100%',
    cursor: 'pointer',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    borderBottom: '2px solid transparent',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  name: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  dirty: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent)',
    display: 'inline-block',
    flexShrink: 0,
  },
  closeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    border: 'none',
    background: 'none',
    color: 'var(--text-muted)',
    fontSize: '14px',
    cursor: 'pointer',
    borderRadius: '3px',
    padding: 0,
    lineHeight: 1,
  },
};
