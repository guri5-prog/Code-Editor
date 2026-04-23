import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useCollabStore } from '../../store/collabStore';
import { startCollabSession, stopCollabSession } from '../../collab/collabProvider';
import { PresencePanel } from './PresencePanel';
import type { CollabPermission } from '@code-editor/shared';
import { getAccessToken } from '../../services/auth';
import { getApiUrl } from '../../config/runtime';

type AuthTokenPayload = { userId?: string; email?: string };

function getUserInfoFromToken(displayName: string): { userId: string; displayName: string } | null {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const [, payloadBase64] = token.split('.');
    if (!payloadBase64) return null;
    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const payloadJson = atob(padded);
    const payload = JSON.parse(payloadJson) as AuthTokenPayload;
    if (!payload.userId) return null;
    return { userId: payload.userId, displayName };
  } catch {
    return null;
  }
}

export function CollabToolbar() {
  const connected = useCollabStore((s) => s.connected);
  const connecting = useCollabStore((s) => s.connecting);
  const chatOpen = useCollabStore((s) => s.chatOpen);
  const toggleChat = useCollabStore((s) => s.toggleChat);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div style={toolbarStyle}>
      {connected && <PresencePanel />}

      {connected && (
        <button onClick={toggleChat} style={chatBtnStyle} title="Toggle chat">
          {chatOpen ? 'Close Chat' : 'Chat'}
        </button>
      )}

      <button
        onClick={() => {
          if (connected) {
            stopCollabSession();
            toast.success('Disconnected from session');
          } else {
            setDialogOpen(true);
          }
        }}
        disabled={connecting}
        style={{
          ...collabBtnStyle,
          backgroundColor: connected ? 'var(--error)' : 'var(--accent)',
          opacity: connecting ? 0.6 : 1,
        }}
      >
        {connecting ? 'Connecting...' : connected ? 'Disconnect' : 'Collaborate'}
      </button>

      {dialogOpen && <CollabDialog onClose={() => setDialogOpen(false)} />}
    </div>
  );
}

function CollabDialog({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [projectId, setProjectId] = useState('');
  const [fileId, setFileId] = useState('');
  const [permission, setPermission] = useState<CollabPermission>('edit');
  const [shareToken, setShareToken] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [displayName, setDisplayName] = useState(
    localStorage.getItem('collab_displayName') || 'Anonymous',
  );

  const handleCreate = useCallback(async () => {
    if (!projectId.trim() || !fileId.trim()) {
      toast.error('Project ID and File ID are required');
      return;
    }

    const userInfo = getUserInfoFromToken(displayName);
    if (!userInfo) {
      toast.error('You must be logged in');
      return;
    }

    // Generate share link
    const token = getAccessToken();
    if (token) {
      try {
        const res = await fetch(getApiUrl(`/api/projects/${projectId}/share`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ permission }),
        });
        if (res.ok) {
          const data = await res.json();
          setShareUrl(data.url);
          setShareToken(data.token);
        }
      } catch {
        // Share link generation is optional
      }
    }

    startCollabSession(projectId, fileId, 'edit', {
      userId: userInfo.userId,
      displayName: userInfo.displayName,
    });
    localStorage.setItem('collab_displayName', displayName);
    toast.success('Collaboration session started');
  }, [projectId, fileId, permission, displayName]);

  const handleJoin = useCallback(async () => {
    if (!shareToken.trim()) {
      toast.error('Share token is required');
      return;
    }

    const userInfo = getUserInfoFromToken(displayName);
    const token = getAccessToken();
    if (!token || !userInfo) {
      toast.error('You must be logged in');
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/collab/join'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: shareToken }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error?.message || 'Failed to join');
        return;
      }

      const data = await res.json();
      // Parse project files to get fileId — for now, ask user
      if (!fileId.trim()) {
        toast.error('File ID is required to join');
        return;
      }

      startCollabSession(data.projectId, fileId, data.permission, {
        userId: userInfo.userId,
        displayName: userInfo.displayName,
      });
      localStorage.setItem('collab_displayName', displayName);
      toast.success(data.message);
      onClose();
    } catch {
      toast.error('Network error');
    }
  }, [shareToken, fileId, displayName, onClose]);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={titleStyle}>Collaborate</h3>

        <div style={tabsStyle}>
          <button
            onClick={() => setMode('create')}
            style={{
              ...tabStyle,
              borderBottom: mode === 'create' ? '2px solid var(--accent)' : '2px solid transparent',
              color: mode === 'create' ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            Create Room
          </button>
          <button
            onClick={() => setMode('join')}
            style={{
              ...tabStyle,
              borderBottom: mode === 'join' ? '2px solid var(--accent)' : '2px solid transparent',
              color: mode === 'join' ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            Join Room
          </button>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Display Name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={inputStyle}
            placeholder="Your name"
          />
        </div>

        {mode === 'create' ? (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Project ID</label>
              <input
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                style={inputStyle}
                placeholder="MongoDB ObjectId"
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>File ID</label>
              <input
                value={fileId}
                onChange={(e) => setFileId(e.target.value)}
                style={inputStyle}
                placeholder="MongoDB ObjectId"
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Permission for others</label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as CollabPermission)}
                style={inputStyle}
              >
                <option value="edit">Edit</option>
                <option value="view">View only</option>
                <option value="execute">Execute only</option>
              </select>
            </div>

            {shareUrl && (
              <div style={fieldStyle}>
                <label style={labelStyle}>Share URL</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input value={shareUrl} readOnly style={{ ...inputStyle, flex: 1 }} />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      toast.success('Copied!');
                    }}
                    style={copyBtnStyle}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            <button onClick={handleCreate} style={primaryBtnStyle}>
              Start Session
            </button>
          </>
        ) : (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Share Token</label>
              <input
                value={shareToken}
                onChange={(e) => setShareToken(e.target.value)}
                style={inputStyle}
                placeholder="Paste share token"
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>File ID</label>
              <input
                value={fileId}
                onChange={(e) => setFileId(e.target.value)}
                style={inputStyle}
                placeholder="MongoDB ObjectId of file to edit"
              />
            </div>
            <button onClick={handleJoin} style={primaryBtnStyle}>
              Join Session
            </button>
          </>
        )}

        <button onClick={onClose} style={closeBtnStyle}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const collabBtnStyle: React.CSSProperties = {
  padding: '5px 12px',
  border: 'none',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const chatBtnStyle: React.CSSProperties = {
  padding: '5px 10px',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  backgroundColor: 'transparent',
  color: 'var(--text-primary)',
  fontSize: '12px',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const dialogStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '24px',
  width: '420px',
  maxWidth: '90vw',
  maxHeight: '80vh',
  overflow: 'auto',
};

const titleStyle: React.CSSProperties = {
  margin: '0 0 16px 0',
  fontSize: '16px',
  color: 'var(--text-primary)',
};

const tabsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  marginBottom: '16px',
};

const tabStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '4px 0',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const fieldStyle: React.CSSProperties = {
  marginBottom: '12px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: 'var(--text-muted)',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  backgroundColor: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  marginBottom: '8px',
};

const copyBtnStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  fontSize: '12px',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const closeBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  backgroundColor: 'transparent',
  color: 'var(--text-muted)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  fontSize: '13px',
  cursor: 'pointer',
  fontFamily: 'inherit',
};
