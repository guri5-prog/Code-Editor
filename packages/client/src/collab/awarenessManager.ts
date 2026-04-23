import type { WebsocketProvider } from 'y-websocket';
import type { editor } from 'monaco-editor';
import { useCollabStore } from '../store/collabStore';
import type { CollabUser } from '@code-editor/shared';

interface AwarenessState {
  user?: {
    userId: string;
    displayName: string;
    color: string;
  };
  cursor?: {
    lineNumber: number;
    column: number;
  };
  selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
}

let cursorUpdateDisposable: { dispose: () => void } | null = null;
let selectionUpdateDisposable: { dispose: () => void } | null = null;
let awarenessListener: (() => void) | null = null;
let awarenessProvider: WebsocketProvider | null = null;
let styleElement: HTMLStyleElement | null = null;

export function setupAwareness(
  provider: WebsocketProvider,
  editorInstance: editor.IStandaloneCodeEditor,
  _localUserId: string,
): void {
  cleanupAwareness();

  // Track local cursor position changes and broadcast via awareness
  cursorUpdateDisposable = editorInstance.onDidChangeCursorPosition((e) => {
    provider.awareness.setLocalStateField('cursor', {
      lineNumber: e.position.lineNumber,
      column: e.position.column,
    });
  });

  selectionUpdateDisposable = editorInstance.onDidChangeCursorSelection((e) => {
    const sel = e.selection;
    if (sel.startLineNumber === sel.endLineNumber && sel.startColumn === sel.endColumn) {
      provider.awareness.setLocalStateField('selection', null);
    } else {
      provider.awareness.setLocalStateField('selection', {
        startLineNumber: sel.startLineNumber,
        startColumn: sel.startColumn,
        endLineNumber: sel.endLineNumber,
        endColumn: sel.endColumn,
      });
    }
  });

  // Ensure cursor style element exists
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'collab-cursors';
    document.head.appendChild(styleElement);
  }

  // Listen for remote awareness changes and update the presence panel
  const updateUsers = () => {
    const states = provider.awareness.getStates() as Map<number, AwarenessState>;
    const users: CollabUser[] = [];
    const seen = new Set<string>();

    states.forEach((state, clientId) => {
      if (clientId === provider.awareness.clientID) return;
      const user = state.user;
      if (!user || seen.has(user.userId)) return;
      seen.add(user.userId);

      users.push({
        userId: user.userId,
        displayName: user.displayName,
        color: user.color,
        cursor: state.cursor,
        selection: state.selection,
      });
    });

    useCollabStore.getState().setUsers(users);
    updateCursorStyles(users);
  };

  awarenessProvider = provider;
  awarenessListener = updateUsers;
  provider.awareness.on('change', updateUsers);
  updateUsers();
}

export function cleanupAwareness(): void {
  cursorUpdateDisposable?.dispose();
  cursorUpdateDisposable = null;
  selectionUpdateDisposable?.dispose();
  selectionUpdateDisposable = null;

  if (awarenessListener && awarenessProvider) {
    awarenessProvider.awareness.off('change', awarenessListener);
  }
  awarenessListener = null;
  awarenessProvider = null;

  if (styleElement) {
    styleElement.remove();
    styleElement = null;
  }
}

function updateCursorStyles(users: CollabUser[]): void {
  if (!styleElement) return;

  let css = '';
  users.forEach((user) => {
    const safeId = CSS.escape(user.userId);
    const safeColor = sanitizeCssColor(user.color);
    const safeLabel = escapeCssContent(user.displayName);
    css += `
      .yRemoteSelection-${safeId} {
        background-color: ${safeColor}33;
      }
      .yRemoteSelectionHead-${safeId} {
        border-left: 2px solid ${safeColor};
        border-top: 2px solid ${safeColor};
        position: relative;
      }
      .yRemoteSelectionHead-${safeId}::after {
        content: '${safeLabel}';
        position: absolute;
        top: -18px;
        left: -2px;
        background: ${safeColor};
        color: #fff;
        font-size: 11px;
        padding: 1px 4px;
        border-radius: 2px;
        white-space: nowrap;
        pointer-events: none;
        font-family: system-ui, sans-serif;
        line-height: 14px;
      }
    `;
  });

  styleElement.textContent = css;
}

function sanitizeCssColor(input: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(input) ? input : '#61afef';
}

function escapeCssContent(input: string): string {
  const withoutControlChars = Array.from(input)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 0x20 && code !== 0x7f;
    })
    .join('');

  return withoutControlChars.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
}
