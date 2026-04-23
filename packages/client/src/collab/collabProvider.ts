import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useCollabStore } from '../store/collabStore';
import type { CollabPermission, ChatMessage } from '@code-editor/shared';

let activeSession: {
  doc: Y.Doc;
  provider: WebsocketProvider;
  projectId: string;
  fileId: string;
  nativeWs: WebSocket | null;
} | null = null;

export function getActiveDoc(): Y.Doc | null {
  return activeSession?.doc ?? null;
}

export function getActiveProvider(): WebsocketProvider | null {
  return activeSession?.provider ?? null;
}

export function startCollabSession(
  projectId: string,
  fileId: string,
  permission: CollabPermission,
  userInfo: { userId: string; displayName: string },
): void {
  if (activeSession) {
    stopCollabSession();
  }

  const store = useCollabStore.getState();
  store.setConnecting(true);
  store.setSession(projectId, fileId, permission);

  const doc = new Y.Doc();

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const serverUrl = `${protocol}//${window.location.host}/ws/collab`;
  const roomName = `${projectId}/${fileId}`;

  const provider = new WebsocketProvider(serverUrl, roomName, doc, {
    connect: true,
  });

  provider.on('status', (event: { status: string }) => {
    const connected = event.status === 'connected';
    useCollabStore.getState().setConnected(connected);
  });

  // Set local awareness state
  const colors = [
    '#e06c75',
    '#61afef',
    '#98c379',
    '#e5c07b',
    '#c678dd',
    '#56b6c2',
    '#d19a66',
    '#be5046',
    '#7ec699',
    '#e6db74',
  ];
  const colorIdx = Math.abs(hashCode(userInfo.userId)) % colors.length;

  provider.awareness.setLocalStateField('user', {
    userId: userInfo.userId,
    displayName: userInfo.displayName,
    color: colors[colorIdx],
  });

  // Listen for text-frame messages (chat) on the underlying WebSocket
  const setupChatListener = () => {
    const ws = (provider as unknown as { ws: WebSocket | null }).ws;
    if (!ws) return;

    if (activeSession) {
      activeSession.nativeWs = ws;
    }

    const originalOnMessage = ws.onmessage;
    ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'chat' && msg.message) {
            useCollabStore.getState().addChatMessage(msg.message as ChatMessage);
            return;
          }
          if (msg.type === 'chat-history' && Array.isArray(msg.messages)) {
            useCollabStore.getState().setChatMessages(msg.messages as ChatMessage[]);
            return;
          }
        } catch {
          // Not a JSON chat message
        }
      }
      if (originalOnMessage) {
        originalOnMessage.call(ws, event);
      }
    };
  };

  provider.on('status', (event: { status: string }) => {
    if (event.status === 'connected') {
      setTimeout(setupChatListener, 50);
    }
  });

  activeSession = { doc, provider, projectId, fileId, nativeWs: null };
}

export function stopCollabSession(): void {
  if (!activeSession) return;

  activeSession.provider.awareness.setLocalState(null);
  activeSession.provider.disconnect();
  activeSession.provider.destroy();
  activeSession.doc.destroy();
  activeSession = null;

  useCollabStore.getState().clearSession();
}

export function sendChatMessage(content: string): void {
  if (!activeSession) return;

  const ws =
    activeSession.nativeWs ?? (activeSession.provider as unknown as { ws: WebSocket | null }).ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  ws.send(JSON.stringify({ type: 'chat', content }));
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}
