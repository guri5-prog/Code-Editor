import { useState, useRef, useEffect, useCallback } from 'react';
import { useCollabStore } from '../../store/collabStore';
import { sendChatMessage } from '../../collab/collabProvider';

export function Chat() {
  const chatOpen = useCollabStore((s) => s.chatOpen);
  const messages = useCollabStore((s) => s.chatMessages);
  const connected = useCollabStore((s) => s.connected);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendChatMessage(trimmed);
    setInput('');
  }, [input]);

  if (!chatOpen || !connected) return null;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={{ fontSize: '13px', fontWeight: 600 }}>Chat</span>
        <button onClick={() => useCollabStore.getState().setChatOpen(false)} style={closeBtnStyle}>
          x
        </button>
      </div>

      <div style={messagesStyle}>
        {messages.length === 0 && <div style={emptyStyle}>No messages yet</div>}
        {messages.map((msg) => (
          <div key={msg.id} style={messageStyle}>
            <span style={{ ...nameStyle, color: 'var(--accent)' }}>{msg.displayName}</span>
            <span style={contentStyle}>{msg.content}</span>
            <span style={timeStyle}>
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={inputAreaStyle}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message..."
          style={inputFieldStyle}
        />
        <button onClick={handleSend} style={sendBtnStyle} disabled={!input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  right: '12px',
  bottom: '40px',
  width: '320px',
  height: '400px',
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 900,
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 12px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text-primary)',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: '14px',
  cursor: 'pointer',
  padding: '2px 6px',
  fontFamily: 'inherit',
};

const messagesStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '8px 12px',
};

const emptyStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '12px',
  textAlign: 'center',
  padding: '20px 0',
};

const messageStyle: React.CSSProperties = {
  marginBottom: '8px',
  fontSize: '12px',
  lineHeight: '1.4',
};

const nameStyle: React.CSSProperties = {
  fontWeight: 600,
  marginRight: '6px',
};

const contentStyle: React.CSSProperties = {
  color: 'var(--text-primary)',
  wordBreak: 'break-word',
};

const timeStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '10px',
  marginLeft: '6px',
};

const inputAreaStyle: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
  padding: '8px 12px',
  borderTop: '1px solid var(--border)',
};

const inputFieldStyle: React.CSSProperties = {
  flex: 1,
  padding: '6px 10px',
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  color: 'var(--text-primary)',
  fontSize: '12px',
  fontFamily: 'inherit',
};

const sendBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  backgroundColor: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
