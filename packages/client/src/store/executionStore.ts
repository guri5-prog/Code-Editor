import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  ExecutionStatus,
  ExecutionResult,
  ExecutionHistoryEntry,
  TerminalTabInfo,
} from '@code-editor/shared';

const MAX_HISTORY = 50;
const MAX_TERMINAL_TABS = 10;
const HISTORY_STORAGE_KEY = 'execution_history';

interface ExecutionState {
  status: ExecutionStatus;
  currentResult: ExecutionResult | null;
  history: ExecutionHistoryEntry[];
  outputVisible: boolean;
  splitRatio: number;
  stdinVisible: boolean;
  stdinValue: string;

  terminalTabs: TerminalTabInfo[];
  activeTerminalTabId: string | null;
  showHistory: boolean;
  latestExecutionTabId: string | null;

  setStatus: (status: ExecutionStatus) => void;
  setResult: (language: string, code: string, result: ExecutionResult) => void;
  clearOutput: () => void;
  toggleOutput: () => void;
  showOutput: () => void;
  setSplitRatio: (ratio: number) => void;
  setStdinVisible: (visible: boolean) => void;
  setStdinValue: (value: string) => void;
  clearHistory: () => void;

  addTerminalTab: (tab: Omit<TerminalTabInfo, 'id' | 'createdAt' | 'output'>) => string;
  removeTerminalTab: (id: string) => void;
  setActiveTerminalTab: (id: string) => void;
  setShowHistory: (show: boolean) => void;
  appendTabOutput: (id: string, output: string) => void;
  setTabOutput: (id: string, output: string) => void;
  clearTabOutput: (id: string) => void;
  createExecutionTab: (fileName: string, language: string) => string;
}

function loadSplitRatio(): number {
  try {
    const stored = localStorage.getItem('editor_split_ratio');
    if (stored) {
      const val = Number(stored);
      if (val >= 0.2 && val <= 0.8) return val;
    }
  } catch {
    /* ignore */
  }
  return 0.6;
}

function loadHistory(): ExecutionHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Partial<ExecutionHistoryEntry>>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry) =>
          typeof entry.id === 'string' &&
          typeof entry.language === 'string' &&
          typeof entry.code === 'string' &&
          typeof entry.timestamp === 'string' &&
          !!entry.result,
      )
      .map((entry) => {
        const result = entry.result as ExecutionResult;
        return {
          id: entry.id as string,
          language: entry.language as string,
          code: entry.code as string,
          result,
          output: entry.output ?? `${result.stdout}${result.stderr}`,
          exitCode: entry.exitCode ?? result.exitCode,
          duration: entry.duration ?? result.executionTime,
          timestamp: entry.timestamp as string,
        };
      })
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

function persistHistory(history: ExecutionHistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // History persistence is best-effort.
  }
}

function formatTabTimestamp(date = new Date()): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  status: 'idle',
  currentResult: null,
  history: loadHistory(),
  outputVisible: false,
  splitRatio: loadSplitRatio(),
  stdinVisible: false,
  stdinValue: '',

  terminalTabs: [],
  activeTerminalTabId: null,
  showHistory: false,
  latestExecutionTabId: null,

  setStatus: (status) => set({ status }),

  setResult: (language, code, result) =>
    set((state) => {
      const entry: ExecutionHistoryEntry = {
        id: nanoid(),
        language,
        code: code.slice(0, 500),
        output: `${result.stdout}${result.stderr}`,
        exitCode: result.exitCode,
        duration: result.executionTime,
        result,
        timestamp: new Date().toISOString(),
      };
      const history = [entry, ...state.history].slice(0, MAX_HISTORY);
      persistHistory(history);
      return {
        currentResult: result,
        status: result.timedOut ? 'timeout' : result.exitCode === 0 ? 'success' : 'error',
        history,
      };
    }),

  clearOutput: () => set({ currentResult: null, status: 'idle' }),

  toggleOutput: () => set((state) => ({ outputVisible: !state.outputVisible })),

  showOutput: () => set({ outputVisible: true }),

  setSplitRatio: (ratio) => {
    try {
      localStorage.setItem('editor_split_ratio', String(ratio));
    } catch {
      /* ignore */
    }
    set({ splitRatio: ratio });
  },

  setStdinVisible: (visible) => set({ stdinVisible: visible, outputVisible: true }),

  setStdinValue: (value) => set({ stdinValue: value }),

  clearHistory: () => {
    persistHistory([]);
    set({ history: [] });
  },

  addTerminalTab: (tab) => {
    const id = nanoid();
    set((state) => {
      let tabs = [...state.terminalTabs];
      if (tabs.length >= MAX_TERMINAL_TABS) {
        tabs = tabs.slice(1);
      }
      tabs.push({
        ...tab,
        id,
        createdAt: new Date().toISOString(),
        output: '',
      });
      return {
        terminalTabs: tabs,
        activeTerminalTabId: id,
        showHistory: false,
      };
    });
    return id;
  },

  removeTerminalTab: (id) =>
    set((state) => {
      const tabs = state.terminalTabs.filter((t) => t.id !== id);
      let activeId = state.activeTerminalTabId;
      if (activeId === id) {
        activeId = tabs.length > 0 ? tabs[tabs.length - 1].id : null;
      }
      return {
        terminalTabs: tabs,
        activeTerminalTabId: activeId,
        latestExecutionTabId: state.latestExecutionTabId === id ? null : state.latestExecutionTabId,
      };
    }),

  setActiveTerminalTab: (id) => set({ activeTerminalTabId: id, showHistory: false }),

  setShowHistory: (show) => set({ showHistory: show }),

  appendTabOutput: (id, output) =>
    set((state) => ({
      terminalTabs: state.terminalTabs.map((t) =>
        t.id === id ? { ...t, output: t.output + output } : t,
      ),
    })),

  setTabOutput: (id, output) =>
    set((state) => ({
      terminalTabs: state.terminalTabs.map((t) => (t.id === id ? { ...t, output } : t)),
    })),

  clearTabOutput: (id) =>
    set((state) => ({
      terminalTabs: state.terminalTabs.map((t) => (t.id === id ? { ...t, output: '' } : t)),
    })),

  createExecutionTab: (fileName, language) => {
    const state = get();
    const existing = state.terminalTabs.find(
      (t) => t.type === 'execution' && (t.sourceName ?? t.title) === fileName,
    );
    if (existing) {
      set({
        terminalTabs: state.terminalTabs.map((t) =>
          t.id === existing.id
            ? {
                ...t,
                title: `${fileName} ${formatTabTimestamp()}`,
                language,
                output: '',
              }
            : t,
        ),
        activeTerminalTabId: existing.id,
        latestExecutionTabId: existing.id,
        showHistory: false,
      });
      return existing.id;
    }
    const id = state.addTerminalTab({
      type: 'execution',
      title: `${fileName} ${formatTabTimestamp()}`,
      language,
      sourceName: fileName,
    });
    set({ latestExecutionTabId: id });
    return id;
  },
}));
