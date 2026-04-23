import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { Toaster, toast } from 'react-hot-toast';
import { AppShell } from './components/Layout/AppShell';
import { Editor } from './components/Editor/Editor';
import { LanguageSelector } from './components/Editor/LanguageSelector';
import { TabBar } from './components/Tabs/TabBar';
import { FileTree, baseName, normalizePath, parentPath } from './components/Project/FileTree';
import { NewFileDialog } from './components/Dialogs/NewFileDialog';
import { RenameFileDialog } from './components/Dialogs/RenameFileDialog';
import { ConfirmDeleteDialog } from './components/Dialogs/ConfirmDeleteDialog';
import { UnsavedChangesDialog } from './components/Dialogs/UnsavedChangesDialog';
import { TextPromptDialog } from './components/Dialogs/TextPromptDialog';
import { ConfirmActionDialog } from './components/Dialogs/ConfirmActionDialog';
import { StatusBar } from './components/StatusBar/StatusBar';
import { useFileStore } from './store/fileStore';
import { useThemeStore, selectMonacoTheme } from './store/themeStore';
import { ThemePicker } from './components/Settings/ThemePicker';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import {
  scheduleSave,
  saveNow,
  startAutoSave,
  cancelPendingSave,
  initFileBaseline,
} from './services/autoSave';
import { useSaveStore } from './store/saveStore';
import { useExecutionStore } from './store/executionStore';
import { runCode } from './services/executionService';
import { TerminalPanel } from './components/Terminal/TerminalPanel';
import { SplitPane } from './components/Layout/SplitPane';
import { SUPPORTED_LANGUAGES, type FileNode } from '@code-editor/shared';
import { CollabToolbar } from './components/Collab/CollabToolbar';
import { Chat } from './components/Collab/Chat';
import { useCollabStore } from './store/collabStore';
import { getActiveDoc, getActiveProvider } from './collab/collabProvider';
import { createCollabBinding, destroyCollabBinding } from './collab/monacoBinding';
import { setupAwareness, cleanupAwareness } from './collab/awarenessManager';
import {
  createProjectFile,
  deleteProjectFile,
  fetchProjectFiles,
  renameProjectFile,
  saveProjectFile,
} from './services/projectService';
import { VersionHistory } from './components/Project/VersionHistory';
import { useSettings } from './hooks/useSettings';
import { formatShortcutLabel } from './utils/shortcuts';
import { useCursorStore } from './store/cursorStore';

const REPL_LANGUAGES = ['python', 'javascript'];

type DialogState =
  | { type: 'new'; initialName?: string; initialLanguage?: string }
  | { type: 'rename'; fileId: string }
  | { type: 'delete'; fileId: string }
  | { type: 'rename-folder'; folderPath: string }
  | { type: 'duplicate-folder'; folderPath: string }
  | { type: 'delete-folder'; folderPath: string }
  | { type: 'create-folder'; targetFolder: string }
  | { type: 'unsaved-close'; fileId: string }
  | null;

interface AppProps {
  projectId?: string;
}

interface FileSnapshot {
  path: string;
  language: string;
  content: string;
}

function App({ projectId }: AppProps) {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { settings } = useSettings();

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelsRef = useRef<Map<string, monaco.editor.ITextModel>>(new Map());
  const disposablesRef = useRef<Map<string, monaco.IDisposable>>(new Map());
  const cursorDisposableRef = useRef<monaco.IDisposable | null>(null);
  const prevActiveIdRef = useRef<string | null>(null);

  const files = useFileStore((s) => s.files);
  const activeFileId = useFileStore((s) => s.activeFileId);
  const createFile = useFileStore((s) => s.createFile);
  const renameFile = useFileStore((s) => s.renameFile);
  const deleteFile = useFileStore((s) => s.deleteFile);
  const loadProjectFiles = useFileStore((s) => s.loadProjectFiles);
  const upsertFileFromServer = useFileStore((s) => s.upsertFileFromServer);
  const updateContent = useFileStore((s) => s.updateContent);
  const saveViewState = useFileStore((s) => s.saveViewState);
  const cycleTab = useFileStore((s) => s.cycleTab);

  const monacoTheme = useThemeStore(selectMonacoTheme);

  const outputVisible = useExecutionStore((s) => s.outputVisible);
  const splitRatio = useExecutionStore((s) => s.splitRatio);
  const setSplitRatio = useExecutionStore((s) => s.setSplitRatio);
  const executionStatus = useExecutionStore((s) => s.status);
  const addTerminalTab = useExecutionStore((s) => s.addTerminalTab);
  const showOutput = useExecutionStore((s) => s.showOutput);

  const collabConnected = useCollabStore((s) => s.connected);

  const activeFile = activeFileId ? files[activeFileId] : null;

  useEffect(() => {
    return startAutoSave();
  }, []);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setProjectLoading(true);
    fetchProjectFiles(projectId)
      .then((projectFiles) => {
        if (cancelled) return;
        loadProjectFiles(projectFiles);
        projectFiles.forEach((file) => {
          initFileBaseline(file.id, file.content, file.version);
        });
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : 'Failed to load project files');
      })
      .finally(() => {
        if (!cancelled) setProjectLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, loadProjectFiles]);

  // When collab connects/disconnects, bind/unbind Y.js to Monaco
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (collabConnected) {
      const doc = getActiveDoc();
      const provider = getActiveProvider();
      if (doc && provider) {
        createCollabBinding(doc, editor, provider);
        setupAwareness(provider, editor, 'local-user');
      }
    } else {
      destroyCollabBinding();
      cleanupAwareness();
    }

    return () => {
      destroyCollabBinding();
      cleanupAwareness();
    };
  }, [collabConnected]);

  const getOrCreateModel = useCallback(
    (fileId: string) => {
      const existing = modelsRef.current.get(fileId);
      if (existing && !existing.isDisposed()) return existing;

      const file = useFileStore.getState().files[fileId];
      if (!file) return null;

      const safeName = encodeURIComponent(file.name);
      const uri = monaco.Uri.parse(`file:///${fileId}/${safeName}`);
      const model = monaco.editor.createModel(file.content, file.language, uri);
      modelsRef.current.set(fileId, model);

      const listener = model.onDidChangeContent(() => {
        updateContent(fileId, model.getValue());
        scheduleSave(fileId);
      });
      disposablesRef.current.set(fileId, listener);

      return model;
    },
    [updateContent],
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !activeFileId) return;

    if (prevActiveIdRef.current && prevActiveIdRef.current !== activeFileId) {
      saveViewState(prevActiveIdRef.current, editor.saveViewState());
    }

    const model = getOrCreateModel(activeFileId);
    if (!model) return;

    editor.setModel(model);

    const file = useFileStore.getState().files[activeFileId];
    if (file?.viewState) {
      editor.restoreViewState(file.viewState);
    }

    cursorDisposableRef.current?.dispose();
    cursorDisposableRef.current = editor.onDidChangeCursorPosition((e) => {
      useCursorStore.getState().setPosition(e.position.lineNumber, e.position.column);
    });

    const pos = editor.getPosition();
    if (pos) useCursorStore.getState().setPosition(pos.lineNumber, pos.column);

    editor.focus();
    prevActiveIdRef.current = activeFileId;
  }, [activeFileId, getOrCreateModel, saveViewState]);

  useEffect(() => {
    const currentFileIds = new Set(Object.keys(files));
    for (const [fileId, model] of modelsRef.current) {
      if (!currentFileIds.has(fileId)) {
        cancelPendingSave(fileId);
        useSaveStore.getState().removeFile(fileId);
        disposablesRef.current.get(fileId)?.dispose();
        disposablesRef.current.delete(fileId);
        model.dispose();
        modelsRef.current.delete(fileId);
      }
    }
  }, [files]);

  useEffect(() => {
    if (!activeFile || !activeFileId) return;
    const model = modelsRef.current.get(activeFileId);
    if (model && !model.isDisposed()) {
      const currentLang = model.getLanguageId();
      if (currentLang !== activeFile.language) {
        monaco.editor.setModelLanguage(model, activeFile.language);
      }
    }
  }, [activeFile, activeFileId]);

  const handleEditorReady = useCallback(
    (instance: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = instance;
      const currentActiveId = useFileStore.getState().activeFileId;
      if (currentActiveId) {
        const model = getOrCreateModel(currentActiveId);
        if (model) instance.setModel(model);

        const pos = instance.getPosition();
        if (pos) useCursorStore.getState().setPosition(pos.lineNumber, pos.column);

        cursorDisposableRef.current?.dispose();
        cursorDisposableRef.current = instance.onDidChangeCursorPosition((e) => {
          useCursorStore.getState().setPosition(e.position.lineNumber, e.position.column);
        });
      }
    },
    [getOrCreateModel],
  );

  const handleLanguageChange = useCallback(
    (langId: string) => {
      if (!activeFileId) return;
      const model = modelsRef.current.get(activeFileId);
      if (model && !model.isDisposed()) {
        monaco.editor.setModelLanguage(model, langId);
      }
      useFileStore.setState((state) => {
        const file = state.files[activeFileId];
        if (!file) return state;
        return { files: { ...state.files, [activeFileId]: { ...file, language: langId } } };
      });
    },
    [activeFileId],
  );

  const requestCloseTab = useCallback((id: string) => {
    const closed = useFileStore.getState().closeTab(id);
    if (!closed) {
      setDialog({ type: 'unsaved-close', fileId: id });
    }
  }, []);

  const existingNames = useMemo(() => Object.values(files).map((f) => f.path), [files]);

  const activeExecutableLanguage = useMemo(() => {
    if (!activeFile) return null;
    const lang = SUPPORTED_LANGUAGES.find(
      (l) => l.monacoId === activeFile.language || l.id === activeFile.language,
    );
    return lang && lang.pistonId !== '' ? lang : null;
  }, [activeFile]);

  const activeReplLanguage = useMemo(() => {
    if (!activeFile) return null;
    const lang = SUPPORTED_LANGUAGES.find(
      (l) => l.monacoId === activeFile.language || l.id === activeFile.language,
    );
    return lang && REPL_LANGUAGES.includes(lang.id) ? lang : null;
  }, [activeFile]);

  const runActiveFile = useCallback(() => {
    if (useExecutionStore.getState().status === 'running') return;
    if (!activeFileId) return;

    const file = useFileStore.getState().files[activeFileId];
    if (!file) return;
    const model = modelsRef.current.get(activeFileId);
    if (model && !model.isDisposed()) {
      const blockingMarkers = monaco.editor
        .getModelMarkers({ resource: model.uri })
        .filter((marker) => marker.severity === monaco.MarkerSeverity.Error);
      if (blockingMarkers.length > 0) {
        const first = blockingMarkers[0];
        toast.error(
          `Fix ${blockingMarkers.length} compile error${blockingMarkers.length > 1 ? 's' : ''} before Run (line ${first.startLineNumber})`,
        );
        editorRef.current?.setPosition({
          lineNumber: first.startLineNumber,
          column: first.startColumn,
        });
        editorRef.current?.revealPositionInCenter({
          lineNumber: first.startLineNumber,
          column: first.startColumn,
        });
        editorRef.current?.focus();
        return;
      }
    }
    const lang = SUPPORTED_LANGUAGES.find(
      (l) => l.monacoId === file.language || l.id === file.language,
    );
    if (!lang || lang.pistonId === '') {
      toast.error('This language does not support execution');
      return;
    }

    const stdin = useExecutionStore.getState().stdinValue;
    runCode(lang.id, file.content, stdin, file.name);
  }, [activeFileId]);

  const openRepl = useCallback(() => {
    if (!activeFile) return;
    const lang = SUPPORTED_LANGUAGES.find(
      (l) => l.monacoId === activeFile.language || l.id === activeFile.language,
    );
    if (!lang || !REPL_LANGUAGES.includes(lang.id)) {
      toast.error('REPL not available for this language');
      return;
    }

    const existing = useExecutionStore
      .getState()
      .terminalTabs.find((t) => t.type === 'repl' && t.language === lang.id);
    if (existing) {
      useExecutionStore.getState().setActiveTerminalTab(existing.id);
      showOutput();
      return;
    }

    addTerminalTab({
      type: 'repl',
      title: `${lang.displayName} REPL`,
      language: lang.id,
    });
    showOutput();
  }, [activeFile, addTerminalTab, showOutput]);

  const uniquePath = useCallback((desiredPath: string) => {
    const taken = new Set(
      Object.values(useFileStore.getState().files).map((f) => normalizePath(f.path)),
    );
    const candidate = normalizePath(desiredPath);
    if (!taken.has(candidate)) return candidate;

    const name = baseName(candidate);
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    const folder = parentPath(candidate);

    for (let idx = 1; idx <= 10_000; idx += 1) {
      const nextName = `${stem} copy ${idx}${ext}`;
      const nextPath = folder ? `${folder}/${nextName}` : nextName;
      if (!taken.has(nextPath)) return nextPath;
    }
    return `${candidate}-${Date.now()}`;
  }, []);

  const upsertAndInit = useCallback(
    (file: FileNode) => {
      upsertFileFromServer(file);
      initFileBaseline(file.id, file.content, file.version);
    },
    [upsertFileFromServer],
  );

  const createFileAtPath = useCallback(
    async (path: string, languageHint?: string) => {
      const normalized = normalizePath(path);
      if (!normalized) return;
      const language = detectLanguageFromName(
        normalized,
        languageHint ?? activeFile?.language ?? 'typescript',
      );

      if (projectId) {
        const created = await createProjectFile(projectId, {
          path: normalized,
          language,
          content: '',
        });
        upsertAndInit(created);
        return;
      }

      const id = createFile(normalized, language);
      if (!id) throw new Error('Maximum of 50 files reached');
    },
    [activeFile?.language, createFile, projectId, upsertAndInit],
  );

  const renameFilePath = useCallback(
    async (fileId: string, newPath: string) => {
      const normalized = normalizePath(newPath);
      if (!normalized) return;
      const current = useFileStore.getState().files[fileId];
      if (!current || normalizePath(current.path) === normalized) return;

      if (projectId) {
        const updated = await renameProjectFile(fileId, {
          path: normalized,
          language: detectLanguageFromName(normalized, current.language),
        });
        upsertAndInit(updated);
        return;
      }
      renameFile(fileId, normalized);
    },
    [projectId, renameFile, upsertAndInit],
  );

  const restoreSnapshots = useCallback(
    async (snapshots: FileSnapshot[]) => {
      for (const snapshot of snapshots) {
        const finalPath = uniquePath(snapshot.path);
        await createFileAtPath(finalPath, snapshot.language);
        const created = Object.values(useFileStore.getState().files).find(
          (file) => normalizePath(file.path) === normalizePath(finalPath),
        );
        if (!created) continue;
        if (projectId) {
          const saved = await saveProjectFile(created.id, snapshot.content);
          upsertAndInit(saved);
        } else {
          useFileStore.getState().updateContent(created.id, snapshot.content);
          useFileStore.getState().markSaved(created.id);
        }
      }
    },
    [createFileAtPath, projectId, uniquePath, upsertAndInit],
  );

  const removeFilesWithUndo = useCallback(
    async (fileIds: string[]) => {
      const snapshots: FileSnapshot[] = fileIds
        .map((id) => useFileStore.getState().files[id])
        .filter((file): file is NonNullable<typeof file> => Boolean(file))
        .map((file) => ({ path: file.path, language: file.language, content: file.content }));

      for (const fileId of fileIds) {
        if (projectId) {
          await deleteProjectFile(fileId);
        }
        deleteFile(fileId);
      }

      const label = snapshots.length > 1 ? `${snapshots.length} files deleted` : 'File deleted';
      toast(
        (t) => (
          <div style={undoToastWrapStyle}>
            <span>{label}</span>
            <button
              type="button"
              style={undoToastBtnStyle}
              onClick={() => {
                toast.dismiss(t.id);
                restoreSnapshots(snapshots).catch((err) => {
                  toast.error(err instanceof Error ? err.message : 'Failed to restore files');
                });
              }}
            >
              Undo
            </button>
          </div>
        ),
        { duration: 5000 },
      );
    },
    [deleteFile, projectId, restoreSnapshots],
  );

  const renameFolderByPrefix = useCallback(
    async (folderPath: string, nextFolderPath: string) => {
      const normalizedOld = normalizePath(folderPath);
      const normalizedNew = normalizePath(nextFolderPath);
      if (!normalizedOld || !normalizedNew || normalizedOld === normalizedNew) return;
      const folderFiles = Object.values(useFileStore.getState().files).filter((f) => {
        const p = normalizePath(f.path);
        return p === normalizedOld || p.startsWith(`${normalizedOld}/`);
      });
      for (const file of folderFiles) {
        const suffix = normalizePath(file.path).slice(normalizedOld.length).replace(/^\/+/, '');
        const targetPath = suffix ? `${normalizedNew}/${suffix}` : normalizedNew;
        await renameFilePath(file.id, targetPath);
      }
    },
    [renameFilePath],
  );

  const duplicateFolderByPrefix = useCallback(
    async (folderPath: string, targetFolderPath: string) => {
      const source = normalizePath(folderPath);
      const target = normalizePath(targetFolderPath);
      if (!source || !target) return;
      const folderFiles = Object.values(useFileStore.getState().files).filter((f) => {
        const p = normalizePath(f.path);
        return p === source || p.startsWith(`${source}/`);
      });
      for (const file of folderFiles) {
        const suffix = normalizePath(file.path).slice(source.length).replace(/^\/+/, '');
        const desired = suffix ? `${target}/${suffix}` : target;
        const path = uniquePath(desired);
        await createFileAtPath(path, file.language);
        const created = Object.values(useFileStore.getState().files).find(
          (f) => normalizePath(f.path) === path,
        );
        if (!created) continue;
        if (projectId) {
          const saved = await saveProjectFile(created.id, file.content);
          upsertAndInit(saved);
        } else {
          useFileStore.getState().updateContent(created.id, file.content);
          useFileStore.getState().markSaved(created.id);
        }
      }
    },
    [createFileAtPath, projectId, uniquePath, upsertAndInit],
  );

  const deleteFolderByPrefix = useCallback(
    async (folderPath: string) => {
      const normalized = normalizePath(folderPath);
      if (!normalized) return;
      const folderFileIds = Object.values(useFileStore.getState().files)
        .filter((f) => {
          const p = normalizePath(f.path);
          return p === normalized || p.startsWith(`${normalized}/`);
        })
        .map((file) => file.id);
      await removeFilesWithUndo(folderFileIds);
    },
    [removeFilesWithUndo],
  );

  const shortcuts = useMemo(
    () => ({
      [settings.keybindings.newFile]: () => setDialog({ type: 'new', initialName: '' }),
      'Ctrl+W': () => {
        if (activeFileId) requestCloseTab(activeFileId);
      },
      'Ctrl+B': () => setSidebarVisible((v) => !v),
      'Alt+1': () => cycleTab(-1),
      'Alt+2': () => cycleTab(1),
      [settings.keybindings.save]: () => {
        if (activeFileId) {
          saveNow(activeFileId);
          toast.success('Saved', { duration: 1500 });
        }
      },
      [settings.keybindings.run]: () => {
        runActiveFile();
      },
    }),
    [
      activeFileId,
      cycleTab,
      requestCloseTab,
      runActiveFile,
      saveNow,
      settings.keybindings.newFile,
      settings.keybindings.run,
      settings.keybindings.save,
    ],
  );
  useKeyboardShortcuts(shortcuts);

  const editorOptions = useMemo(
    () => ({
      fontSize: settings.editor.fontSize,
      tabSize: settings.editor.tabSize,
      wordWrap: settings.editor.wordWrap,
      lineNumbers: settings.editor.lineNumbers,
      minimap: { enabled: settings.editor.minimap },
    }),
    [
      settings.editor.fontSize,
      settings.editor.lineNumbers,
      settings.editor.minimap,
      settings.editor.tabSize,
      settings.editor.wordWrap,
    ],
  );
  const runShortcutLabel = useMemo(
    () => formatShortcutLabel(settings.keybindings.run),
    [settings.keybindings.run],
  );

  const header = (
    <>
      <div style={inlineStyles.headerLeft}>
        <span style={inlineStyles.logoIcon}>&lt;/&gt;</span>
        <span style={inlineStyles.logoText}>Code Editor</span>
      </div>
      <div style={inlineStyles.headerRight}>
        {activeFile && (
          <LanguageSelector value={activeFile.language} onChange={handleLanguageChange} />
        )}
        {activeReplLanguage && (
          <button
            onClick={openRepl}
            style={{
              padding: '5px 12px',
              border: '1px solid var(--accent)',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              color: 'var(--accent)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            title={`Open ${activeReplLanguage.displayName} REPL`}
          >
            REPL
          </button>
        )}
        <button
          onClick={runActiveFile}
          disabled={!activeExecutableLanguage || executionStatus === 'running'}
          style={{
            padding: '5px 12px',
            border: '1px solid var(--success)',
            borderRadius: '4px',
            backgroundColor: 'var(--success)',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
            cursor:
              !activeExecutableLanguage || executionStatus === 'running'
                ? 'not-allowed'
                : 'pointer',
            opacity: !activeExecutableLanguage || executionStatus === 'running' ? 0.55 : 1,
            fontFamily: 'inherit',
          }}
          title={`Run code (${runShortcutLabel})`}
        >
          {executionStatus === 'running' ? 'Running...' : 'Run'}
        </button>
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          style={{
            padding: '5px 12px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            backgroundColor: historyOpen ? 'var(--bg-surface)' : 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
          title="Toggle version history"
        >
          History
        </button>
        <CollabToolbar />
        <ThemePicker />
      </div>
    </>
  );

  const sidebar = sidebarVisible ? (
    <FileTree
      files={Object.values(files)}
      activeFileId={activeFileId}
      onOpenFile={(fileId) => useFileStore.getState().setActiveFile(fileId)}
      onCreateFile={(targetFolder) => {
        const folderPrefix = targetFolder ? `${normalizePath(targetFolder)}/` : '';
        setDialog({
          type: 'new',
          initialName: `${folderPrefix}untitled.ts`,
          initialLanguage: 'typescript',
        });
      }}
      onCreateFolder={(targetFolder) => {
        setDialog({ type: 'create-folder', targetFolder });
      }}
      onRenameFile={(fileId) => {
        setDialog({ type: 'rename', fileId });
      }}
      onDeleteFile={(fileId) => {
        setDialog({ type: 'delete', fileId });
      }}
      onDuplicateFile={(fileId) => {
        const file = files[fileId];
        if (!file) return;
        const path = uniquePath(file.path);
        createFileAtPath(path, file.language)
          .then(async () => {
            const created = Object.values(useFileStore.getState().files).find(
              (f) => normalizePath(f.path) === normalizePath(path),
            );
            if (!created) return;
            if (projectId) {
              const saved = await saveProjectFile(created.id, file.content);
              upsertAndInit(saved);
            } else {
              useFileStore.getState().updateContent(created.id, file.content);
              useFileStore.getState().markSaved(created.id);
            }
          })
          .catch((err) => {
            toast.error(err instanceof Error ? err.message : 'Failed to duplicate file');
          });
      }}
      onRenameFolder={(folderPath) => {
        setDialog({ type: 'rename-folder', folderPath });
      }}
      onDeleteFolder={(folderPath) => {
        setDialog({ type: 'delete-folder', folderPath });
      }}
      onDuplicateFolder={(folderPath) => {
        setDialog({ type: 'duplicate-folder', folderPath });
      }}
      onMoveFile={(fileId, targetFolder) => {
        const file = files[fileId];
        if (!file) return;
        const desired = targetFolder
          ? `${normalizePath(targetFolder)}/${baseName(file.path)}`
          : baseName(file.path);
        renameFilePath(fileId, uniquePath(desired)).catch((err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to move file');
        });
      }}
      onMoveFolder={(folderPath, targetFolder) => {
        const desired = targetFolder
          ? `${normalizePath(targetFolder)}/${baseName(folderPath)}`
          : baseName(folderPath);
        renameFolderByPrefix(folderPath, uniquePath(desired)).catch((err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to move folder');
        });
      }}
    />
  ) : undefined;

  return (
    <>
      <AppShell header={header} sidebar={sidebar}>
        <div style={workspaceRowStyle}>
          <div style={editorAreaStyle}>
            {projectLoading && <div style={loadingBarStyle}>Loading project files...</div>}
            <TabBar onCloseTab={requestCloseTab} />
            {outputVisible ? (
              <SplitPane
                ratio={splitRatio}
                onRatioChange={setSplitRatio}
                top={
                  <div style={editorWrapperStyle}>
                    {activeFile ? (
                      <Editor
                        language={activeFile.language}
                        defaultValue=""
                        onEditorReady={handleEditorReady}
                        theme={monacoTheme}
                        options={editorOptions}
                      />
                    ) : (
                      <div style={emptyStyle}>
                        <p>No files open</p>
                        <button
                          onClick={() => setDialog({ type: 'new', initialName: '' })}
                          style={emptyBtnStyle}
                        >
                          Create a file (Ctrl+N)
                        </button>
                      </div>
                    )}
                  </div>
                }
                bottom={
                  <div id="app-output">
                    <TerminalPanel />
                  </div>
                }
              />
            ) : (
              <div style={editorWrapperStyle}>
                {activeFile ? (
                  <Editor
                    language={activeFile.language}
                    defaultValue=""
                    onEditorReady={handleEditorReady}
                    theme={monacoTheme}
                    options={editorOptions}
                  />
                ) : (
                  <div style={emptyStyle}>
                    <p>No files open</p>
                    <button
                      onClick={() => setDialog({ type: 'new', initialName: '' })}
                      style={emptyBtnStyle}
                    >
                      Create a file (Ctrl+N)
                    </button>
                  </div>
                )}
              </div>
            )}
            <StatusBar />
          </div>
          {historyOpen && (
            <VersionHistory
              fileId={activeFileId}
              currentContent={activeFile?.content ?? ''}
              onRestore={async (content) => {
                if (!activeFileId) return;
                if (projectId) {
                  const saved = await saveProjectFile(activeFileId, content);
                  upsertAndInit(saved);
                  return;
                }
                useFileStore.getState().updateContent(activeFileId, content);
                useFileStore.getState().markSaved(activeFileId);
              }}
            />
          )}
        </div>
      </AppShell>

      {dialog?.type === 'new' && (
        <NewFileDialog
          onClose={() => setDialog(null)}
          onCreate={async (name, language) => {
            try {
              await createFileAtPath(name, language);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed to create file');
            }
          }}
          existingNames={existingNames}
          initialName={dialog.initialName}
          initialLanguage={dialog.initialLanguage}
          allowPath
        />
      )}

      {dialog?.type === 'rename' &&
        (() => {
          const file = files[dialog.fileId];
          if (!file) return null;
          return (
            <RenameFileDialog
              currentName={baseName(file.path)}
              onClose={() => setDialog(null)}
              onRename={async (newName) => {
                const parent = parentPath(file.path);
                const nextPath = parent ? `${parent}/${newName}` : newName;
                if (projectId) {
                  try {
                    const updated = await renameProjectFile(dialog.fileId, {
                      path: normalizePath(nextPath),
                      language: detectLanguageFromName(nextPath, file.language),
                    });
                    upsertAndInit(updated);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Failed to rename file');
                  }
                  return;
                }
                renameFile(dialog.fileId, normalizePath(nextPath));
              }}
              existingNames={Object.values(files)
                .filter((candidate) => parentPath(candidate.path) === parentPath(file.path))
                .map((candidate) => baseName(candidate.path))}
            />
          );
        })()}

      {dialog?.type === 'delete' &&
        (() => {
          const file = files[dialog.fileId];
          if (!file) return null;
          return (
            <ConfirmDeleteDialog
              fileName={file.path}
              onClose={() => setDialog(null)}
              onConfirm={async () => {
                try {
                  await removeFilesWithUndo([dialog.fileId]);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to delete file');
                }
              }}
            />
          );
        })()}

      {dialog?.type === 'unsaved-close' &&
        (() => {
          const file = files[dialog.fileId];
          if (!file) return null;
          return (
            <UnsavedChangesDialog
              fileName={file.path}
              onClose={() => setDialog(null)}
              onDiscard={() => deleteFile(dialog.fileId)}
            />
          );
        })()}

      {dialog?.type === 'create-folder' && (
        <TextPromptDialog
          title="Create Folder"
          label="Folder Name"
          placeholder="e.g. src/components"
          initialValue="new-folder"
          onClose={() => setDialog(null)}
          onSubmit={(value) => {
            const clean = value.replace(/[\\]/g, '/').replace(/^\/+|\/+$/g, '');
            if (!clean) return;
            const folderPath = dialog.targetFolder
              ? `${normalizePath(dialog.targetFolder)}/${clean}`
              : clean;
            const desired = `${folderPath}/README.md`;
            createFileAtPath(uniquePath(desired), 'markdown')
              .catch((err) =>
                toast.error(err instanceof Error ? err.message : 'Failed to create folder'),
              )
              .finally(() => setDialog(null));
          }}
          confirmText="Create"
        />
      )}

      {dialog?.type === 'rename-folder' && (
        <TextPromptDialog
          title="Rename Folder"
          label="New Folder Name"
          initialValue={baseName(dialog.folderPath)}
          onClose={() => setDialog(null)}
          onSubmit={(value) => {
            if (!value) return;
            const parent = parentPath(dialog.folderPath);
            const nextPath = parent ? `${parent}/${value}` : value;
            renameFolderByPrefix(dialog.folderPath, nextPath)
              .catch((err) =>
                toast.error(err instanceof Error ? err.message : 'Failed to rename folder'),
              )
              .finally(() => setDialog(null));
          }}
          confirmText="Rename"
        />
      )}

      {dialog?.type === 'duplicate-folder' && (
        <TextPromptDialog
          title="Duplicate Folder"
          label="Duplicate As"
          initialValue={`${baseName(dialog.folderPath)}-copy`}
          onClose={() => setDialog(null)}
          onSubmit={(value) => {
            if (!value) return;
            const parent = parentPath(dialog.folderPath);
            const nextPath = parent ? `${parent}/${value}` : value;
            duplicateFolderByPrefix(dialog.folderPath, nextPath)
              .catch((err) =>
                toast.error(err instanceof Error ? err.message : 'Failed to duplicate folder'),
              )
              .finally(() => setDialog(null));
          }}
          confirmText="Duplicate"
        />
      )}

      {dialog?.type === 'delete-folder' && (
        <ConfirmActionDialog
          title="Delete Folder"
          description={`Delete "${dialog.folderPath}" and all files inside it? You can undo right after deletion.`}
          confirmText="Delete Folder"
          tone="danger"
          onClose={() => setDialog(null)}
          onConfirm={() => {
            deleteFolderByPrefix(dialog.folderPath).catch((err) => {
              toast.error(err instanceof Error ? err.message : 'Failed to delete folder');
            });
          }}
        />
      )}

      <Chat />

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontSize: '13px',
            fontFamily: 'inherit',
          },
        }}
      />
    </>
  );
}

const inlineStyles: Record<string, React.CSSProperties> = {
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: {
    color: 'var(--accent)',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  logoText: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
};

const editorAreaStyle: React.CSSProperties = {
  flex: 1,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  minWidth: 0,
};

const workspaceRowStyle: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  minHeight: 0,
  minWidth: 0,
};

const editorWrapperStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'hidden',
  height: '100%',
  minHeight: 0,
  minWidth: 0,
};

const emptyStyle: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  color: 'var(--text-muted)',
  fontSize: '14px',
};

const emptyBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: 'var(--accent)',
  color: 'var(--accent-text)',
  border: 'none',
  borderRadius: '4px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const loadingBarStyle: React.CSSProperties = {
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  padding: '0 12px',
  fontSize: '12px',
  color: 'var(--text-muted)',
  borderBottom: '1px solid var(--border)',
  backgroundColor: 'var(--bg-secondary)',
};

const undoToastWrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const undoToastBtnStyle: React.CSSProperties = {
  border: '1px solid var(--accent)',
  borderRadius: 6,
  backgroundColor: 'transparent',
  color: 'var(--accent)',
  fontSize: 12,
  fontWeight: 700,
  padding: '5px 8px',
  cursor: 'pointer',
};

function detectLanguageFromName(name: string, fallback: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return fallback;
  const ext = name.slice(dot).toLowerCase();
  const lang = SUPPORTED_LANGUAGES.find((l) =>
    l.extensions.some((candidate) => candidate.toLowerCase() === ext),
  );
  return lang?.monacoId ?? fallback;
}

export default App;
