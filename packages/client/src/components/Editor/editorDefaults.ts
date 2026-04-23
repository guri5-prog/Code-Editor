import type { editor } from 'monaco-editor';
import { DEFAULT_EDITOR_SETTINGS } from '@code-editor/shared';

export const editorDefaults: editor.IStandaloneEditorConstructionOptions = {
  fontSize: DEFAULT_EDITOR_SETTINGS.fontSize,
  fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
  readOnly: false,
  domReadOnly: false,
  minimap: { enabled: DEFAULT_EDITOR_SETTINGS.minimap },
  wordWrap: DEFAULT_EDITOR_SETTINGS.wordWrap,
  lineNumbers: DEFAULT_EDITOR_SETTINGS.lineNumbers,
  tabSize: DEFAULT_EDITOR_SETTINGS.tabSize,
  scrollBeyondLastLine: true,
  automaticLayout: true,
  padding: { top: 12 },
  lineNumbersMinChars: 3,
  renderLineHighlight: 'line',
  bracketPairColorization: { enabled: true },
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  smoothScrolling: true,
  insertSpaces: true,
};
