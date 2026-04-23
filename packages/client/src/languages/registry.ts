import * as monaco from 'monaco-editor';
import { registerRestrictedPython } from './restrictedPython';
import { registerRestrictedJS } from './restrictedJS';
import { pythonSnippets } from './snippets/python';
import { javascriptSnippets } from './snippets/javascript';
import { javaSnippets } from './snippets/java';
import { cppSnippets } from './snippets/cpp';

let registered = false;
const disposables: monaco.IDisposable[] = [];

function registerSnippets(languageId: string, snippets: monaco.languages.CompletionItem[]): void {
  disposables.push(
    monaco.languages.registerCompletionItemProvider(languageId, {
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range: monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        return {
          suggestions: snippets.map((s) => ({ ...s, range })),
        };
      },
    }),
  );
}

export function registerAllLanguages(_monaco?: unknown): void {
  if (registered) return;
  registered = true;

  disposables.push(...registerRestrictedPython());
  disposables.push(...registerRestrictedJS());

  registerSnippets('python', pythonSnippets);
  registerSnippets('javascript', javascriptSnippets);
  registerSnippets('typescript', javascriptSnippets);
  registerSnippets('java', javaSnippets);
  registerSnippets('cpp', cppSnippets);
  registerSnippets('c', cppSnippets);
}

export function disposeAllLanguages(): void {
  for (const d of disposables) {
    d.dispose();
  }
  disposables.length = 0;
  registered = false;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => disposeAllLanguages());
}
