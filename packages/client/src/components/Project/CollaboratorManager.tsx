interface Collaborator {
  userId: string;
  permission: 'edit' | 'view' | 'execute';
}

interface CollaboratorManagerProps {
  collaborators: Collaborator[];
  userId: string;
  permission: 'edit' | 'view' | 'execute';
  onUserIdChange: (value: string) => void;
  onPermissionChange: (value: 'edit' | 'view' | 'execute') => void;
  onAdd: () => void;
  onRemove: (userId: string) => void;
  onChangePermission: (userId: string, permission: 'edit' | 'view' | 'execute') => void;
}

export function CollaboratorManager({
  collaborators,
  userId,
  permission,
  onUserIdChange,
  onPermissionChange,
  onAdd,
  onRemove,
  onChangePermission,
}: CollaboratorManagerProps) {
  return (
    <section style={panelStyle}>
      <h2 style={panelTitleStyle}>Collaborators</h2>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input
          value={userId}
          onChange={(e) => onUserIdChange(e.target.value)}
          placeholder="User ID"
          style={inputStyle}
        />
        <select
          value={permission}
          onChange={(e) => onPermissionChange(e.target.value as 'edit' | 'view' | 'execute')}
          style={{ ...inputStyle, width: '140px' }}
        >
          <option value="view">View</option>
          <option value="execute">Execute</option>
          <option value="edit">Edit</option>
        </select>
        <button type="button" onClick={onAdd} style={primaryBtnStyle}>
          Add
        </button>
      </div>
      <ul style={listStyle}>
        {collaborators.map((c) => (
          <li key={c.userId} style={listItemStyle}>
            <span>{c.userId}</span>
            <select
              value={c.permission}
              onChange={(e) =>
                onChangePermission(c.userId, e.target.value as 'edit' | 'view' | 'execute')
              }
              style={rowSelectStyle}
            >
              <option value="view">View</option>
              <option value="execute">Execute</option>
              <option value="edit">Edit</option>
            </select>
            <button type="button" style={subtleBtnStyle} onClick={() => onRemove(c.userId)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const panelStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '10px',
  backgroundColor: 'var(--bg-surface)',
  padding: '14px',
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: '15px',
  marginBottom: '10px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  marginBottom: '8px',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: 'var(--accent)',
  color: 'var(--accent-text)',
  fontWeight: 700,
  cursor: 'pointer',
};

const subtleBtnStyle: React.CSSProperties = {
  ...primaryBtnStyle,
  backgroundColor: 'transparent',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border)',
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const listItemStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto auto',
  gap: '8px',
  alignItems: 'center',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '8px 10px',
  fontSize: '12px',
};

const rowSelectStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '6px',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '12px',
  padding: '6px 8px',
};
