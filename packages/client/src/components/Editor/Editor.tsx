import MonacoEditor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import type { editor } from 'monaco-editor';
import { editorDefaults } from './editorDefaults';
import { useEditorInstance } from './useEditorInstance';
import { registerAllLanguages } from '../../languages/registry';

loader.config({ monaco });

interface EditorProps {
  language: string;
  defaultValue: string;
  onEditorReady?: (instance: editor.IStandaloneCodeEditor) => void;
  theme?: string;
  options?: editor.IStandaloneEditorConstructionOptions;
}

export function Editor({
  language,
  defaultValue,
  onEditorReady,
  theme = 'editor-dark',
  options,
}: EditorProps) {
  const { editorRef, onMount } = useEditorInstance(onEditorReady);

  return (
    <div
      style={{ height: '100%', width: '100%' }}
      onMouseDownCapture={() => {
        requestAnimationFrame(() => {
          editorRef.current?.focus();
        });
      }}
    >
      <MonacoEditor
        language={language}
        defaultValue={defaultValue}
        theme={theme}
        onMount={onMount}
        beforeMount={registerAllLanguages}
        options={{ ...editorDefaults, ...(options ?? {}) }}
        loading={<EditorLoading />}
      />
    </div>
  );
}

function EditorLoading() {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-muted)',
        fontSize: '14px',
      }}
    >
      Loading editor...
    </div>
  );
}
