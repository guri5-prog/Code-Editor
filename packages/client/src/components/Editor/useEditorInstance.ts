import { useRef, useCallback } from 'react';
import type { editor } from 'monaco-editor';

export function useEditorInstance(onReady?: (instance: editor.IStandaloneCodeEditor) => void) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const onMount = useCallback(
    (instance: editor.IStandaloneCodeEditor) => {
      editorRef.current = instance;
      instance.updateOptions({
        readOnly: false,
        domReadOnly: false,
      });
      instance.focus();
      onReady?.(instance);
    },
    [onReady],
  );

  return { editorRef, onMount };
}
