import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import type { editor } from 'monaco-editor';
import type { WebsocketProvider } from 'y-websocket';

let activeBinding: MonacoBinding | null = null;

export function createCollabBinding(
  doc: Y.Doc,
  editorInstance: editor.IStandaloneCodeEditor,
  provider: WebsocketProvider,
): MonacoBinding {
  destroyCollabBinding();

  const text = doc.getText('content');
  const model = editorInstance.getModel();
  if (!model) {
    throw new Error('Editor has no model');
  }

  activeBinding = new MonacoBinding(text, model, new Set([editorInstance]), provider.awareness);

  return activeBinding;
}

export function destroyCollabBinding(): void {
  if (activeBinding) {
    activeBinding.destroy();
    activeBinding = null;
  }
}

export function getActiveBinding(): MonacoBinding | null {
  return activeBinding;
}
