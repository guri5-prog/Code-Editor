import type { editor } from 'monaco-editor';

export interface FileTab {
  id: string;
  path: string;
  name: string;
  language: string;
  content: string;
  viewState: editor.ICodeEditorViewState | null;
  isDirty: boolean;
}
