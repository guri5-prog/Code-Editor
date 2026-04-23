import { create } from 'zustand';
import type { CollabUser, CollabPermission, ChatMessage } from '@code-editor/shared';

interface CollabState {
  connected: boolean;
  connecting: boolean;
  projectId: string | null;
  fileId: string | null;
  permission: CollabPermission | null;
  users: CollabUser[];
  chatMessages: ChatMessage[];
  chatOpen: boolean;

  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setSession: (projectId: string, fileId: string, permission: CollabPermission) => void;
  clearSession: () => void;
  setUsers: (users: CollabUser[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;
}

export const useCollabStore = create<CollabState>((set) => ({
  connected: false,
  connecting: false,
  projectId: null,
  fileId: null,
  permission: null,
  users: [],
  chatMessages: [],
  chatOpen: false,

  setConnected: (connected) => set({ connected, connecting: false }),
  setConnecting: (connecting) => set({ connecting }),
  setSession: (projectId, fileId, permission) => set({ projectId, fileId, permission }),
  clearSession: () =>
    set({
      connected: false,
      connecting: false,
      projectId: null,
      fileId: null,
      permission: null,
      users: [],
      chatMessages: [],
      chatOpen: false,
    }),
  setUsers: (users) => set({ users }),
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages.slice(-99), message],
    })),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  toggleChat: () => set((state) => ({ chatOpen: !state.chatOpen })),
  setChatOpen: (open) => set({ chatOpen: open }),
}));
