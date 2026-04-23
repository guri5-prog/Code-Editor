import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { editor } from 'monaco-editor';
import type { FileTab } from '../types/file';
import type { FileNode } from '@code-editor/shared';
import { getLanguageByExtension } from '@code-editor/shared';
import { useSaveStore } from './saveStore';
import { cancelPendingSave } from '../services/autoSave';

const MAX_FILES = 50;

interface FileState {
  files: Record<string, FileTab>;
  activeFileId: string | null;
  tabOrder: string[];

  createFile: (path: string, language: string, content?: string) => string | null;
  renameFile: (id: string, newPath: string) => void;
  deleteFile: (id: string) => void;
  setActiveFile: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  saveViewState: (id: string, viewState: editor.ICodeEditorViewState | null) => void;
  markSaved: (id: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  closeTab: (id: string) => boolean;
  cycleTab: (direction: 1 | -1) => void;
  hasUnsavedChanges: (id: string) => boolean;
  loadProjectFiles: (files: FileNode[]) => void;
  upsertFileFromServer: (file: FileNode) => void;
}

const DEFAULT_FILE_NAME = 'untitled.ts';
const DEFAULT_LANGUAGE = 'typescript';
const DEFAULT_CONTENT = `// Start coding here\n`;

function detectLanguage(filename: string): string {
  return getLanguageByExtension(filename)?.monacoId ?? DEFAULT_LANGUAGE;
}

function fileNameFromPath(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || path;
}

export const useFileStore = create<FileState>((set, get) => {
  const initialId = nanoid();
  const initialFile: FileTab = {
    id: initialId,
    path: DEFAULT_FILE_NAME,
    name: DEFAULT_FILE_NAME,
    language: DEFAULT_LANGUAGE,
    content: DEFAULT_CONTENT,
    viewState: null,
    isDirty: false,
  };

  return {
    files: { [initialId]: initialFile },
    activeFileId: initialId,
    tabOrder: [initialId],

    createFile: (path, language, content = '') => {
      const { tabOrder } = get();
      if (tabOrder.length >= MAX_FILES) return null;

      const id = nanoid();
      const file: FileTab = {
        id,
        path,
        name: fileNameFromPath(path),
        language,
        content,
        viewState: null,
        isDirty: false,
      };
      set((state) => ({
        files: { ...state.files, [id]: file },
        activeFileId: id,
        tabOrder: [...state.tabOrder, id],
      }));
      return id;
    },

    renameFile: (id, newPath) => {
      set((state) => {
        const file = state.files[id];
        if (!file) return state;
        return {
          files: {
            ...state.files,
            [id]: {
              ...file,
              path: newPath,
              name: fileNameFromPath(newPath),
              language: detectLanguage(newPath),
            },
          },
        };
      });
    },

    deleteFile: (id) => {
      cancelPendingSave(id);
      useSaveStore.getState().removeFile(id);

      set((state) => {
        const { [id]: _removed, ...rest } = state.files;
        const tabOrder = state.tabOrder.filter((tid) => tid !== id);

        let activeFileId = state.activeFileId;
        if (activeFileId === id) {
          const oldIndex = state.tabOrder.indexOf(id);
          activeFileId = tabOrder[Math.min(oldIndex, tabOrder.length - 1)] ?? null;
        }

        return { files: rest, tabOrder, activeFileId };
      });
    },

    setActiveFile: (id) => {
      const { files, activeFileId: currentId } = get();
      if (!files[id] || currentId === id) return;
      set({ activeFileId: id });
    },

    updateContent: (id, content) => {
      set((state) => {
        const file = state.files[id];
        if (!file) return state;
        return { files: { ...state.files, [id]: { ...file, content, isDirty: true } } };
      });
    },

    saveViewState: (id, viewState) => {
      set((state) => {
        const file = state.files[id];
        if (!file) return state;
        return { files: { ...state.files, [id]: { ...file, viewState } } };
      });
    },

    markSaved: (id) => {
      set((state) => {
        const file = state.files[id];
        if (!file) return state;
        return { files: { ...state.files, [id]: { ...file, isDirty: false } } };
      });
    },

    reorderTabs: (fromIndex, toIndex) => {
      set((state) => {
        const tabOrder = [...state.tabOrder];
        const [moved] = tabOrder.splice(fromIndex, 1);
        tabOrder.splice(toIndex, 0, moved);
        return { tabOrder };
      });
    },

    closeTab: (id) => {
      const file = get().files[id];
      if (file?.isDirty) return false;
      get().deleteFile(id);
      return true;
    },

    cycleTab: (direction) => {
      const { tabOrder, activeFileId } = get();
      if (tabOrder.length <= 1 || !activeFileId) return;
      const currentIndex = tabOrder.indexOf(activeFileId);
      const nextIndex = (currentIndex + direction + tabOrder.length) % tabOrder.length;
      set({ activeFileId: tabOrder[nextIndex] });
    },

    hasUnsavedChanges: (id) => {
      return get().files[id]?.isDirty ?? false;
    },

    loadProjectFiles: (projectFiles) => {
      const entries = projectFiles.map((file) => {
        const tab: FileTab = {
          id: file.id,
          path: file.path,
          name: fileNameFromPath(file.path),
          language: file.language,
          content: file.content,
          viewState: null,
          isDirty: false,
        };
        return [file.id, tab] as const;
      });
      const files = Object.fromEntries(entries);
      const tabOrder = projectFiles.map((f) => f.id);

      set({
        files,
        tabOrder,
        activeFileId: tabOrder[0] ?? null,
      });
    },

    upsertFileFromServer: (file) => {
      set((state) => {
        const existing = state.files[file.id];
        const tab: FileTab = {
          id: file.id,
          path: file.path,
          name: fileNameFromPath(file.path),
          language: file.language,
          content: file.content,
          viewState: existing?.viewState ?? null,
          isDirty: false,
        };

        const tabOrder = state.tabOrder.includes(file.id)
          ? state.tabOrder
          : [...state.tabOrder, file.id];

        return {
          files: { ...state.files, [file.id]: tab },
          tabOrder,
          activeFileId: state.activeFileId ?? file.id,
        };
      });
    },
  };
});
