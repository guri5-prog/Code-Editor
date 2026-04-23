import { create } from 'zustand';

interface CursorState {
  line: number | undefined;
  column: number | undefined;
  setPosition: (line: number, column: number) => void;
}

export const useCursorStore = create<CursorState>((set) => ({
  line: undefined,
  column: undefined,
  setPosition: (line, column) => set({ line, column }),
}));
