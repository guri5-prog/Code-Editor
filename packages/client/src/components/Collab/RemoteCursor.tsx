import type { CollabUser } from '@code-editor/shared';

interface RemoteCursorProps {
  user: CollabUser;
}

export function RemoteCursorLabel({ user }: RemoteCursorProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '-18px',
        left: '-2px',
        backgroundColor: user.color,
        color: '#fff',
        fontSize: '11px',
        padding: '1px 4px',
        borderRadius: '2px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        fontFamily: 'system-ui, sans-serif',
        lineHeight: '14px',
        zIndex: 10,
      }}
    >
      {user.displayName}
    </div>
  );
}
