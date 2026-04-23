import { create } from 'zustand';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface SaveState {
  statuses: Record<string, SaveStatus>;
  lastSavedAt: Record<string, number>;
  online: boolean;

  setStatus: (fileId: string, status: SaveStatus) => void;
  setLastSavedAt: (fileId: string, timestamp: number) => void;
  setOnline: (online: boolean) => void;
  removeFile: (fileId: string) => void;
}

export const useSaveStore = create<SaveState>((set) => ({
  statuses: {},
  lastSavedAt: {},
  online: navigator.onLine,

  setStatus: (fileId, status) => {
    set((state) => ({
      statuses: { ...state.statuses, [fileId]: status },
    }));
  },

  setLastSavedAt: (fileId, timestamp) => {
    set((state) => ({
      lastSavedAt: { ...state.lastSavedAt, [fileId]: timestamp },
    }));
  },

  setOnline: (online) => set({ online }),

  removeFile: (fileId) => {
    set((state) => {
      const { [fileId]: _s, ...statuses } = state.statuses;
      const { [fileId]: _l, ...lastSavedAt } = state.lastSavedAt;
      return { statuses, lastSavedAt };
    });
  },
}));
