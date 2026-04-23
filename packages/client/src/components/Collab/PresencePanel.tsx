import { useCollabStore } from '../../store/collabStore';

export function PresencePanel() {
  const users = useCollabStore((s) => s.users);
  const connected = useCollabStore((s) => s.connected);

  if (!connected) return null;

  return (
    <div style={containerStyle}>
      {users.map((user) => (
        <div key={user.userId} style={userStyle} title={user.displayName}>
          <div
            style={{
              ...avatarStyle,
              backgroundColor: user.color,
            }}
          >
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      ))}
      {users.length === 0 && <span style={emptyStyle}>No other users</span>}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '0 8px',
};

const userStyle: React.CSSProperties = {
  position: 'relative',
};

const avatarStyle: React.CSSProperties = {
  width: '26px',
  height: '26px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'default',
  border: '2px solid var(--bg-primary)',
};

const emptyStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
};
