import * as monaco from 'monaco-editor';

export interface CustomLanguageDefinition {
  id: string;
  extensions: string[];
  keywords: string[];
  operators?: string[];
  symbols?: RegExp;
  tokenizer: monaco.languages.IMonarchLanguage['tokenizer'];
  completionItems?: monaco.languages.CompletionItem[];
  brackets?: monaco.languages.CharacterPair[];
  autoClosingPairs?: monaco.languages.IAutoClosingPairConditional[];
  surroundingPairs?: monaco.languages.IAutoClosingPair[];
  comments?: { lineComment?: string; blockComment?: [string, string] };
}

const DEFAULT_BRACKETS: monaco.languages.CharacterPair[] = [
  ['{', '}'],
  ['[', ']'],
  ['(', ')'],
];

const DEFAULT_AUTO_CLOSING: monaco.languages.IAutoClosingPairConditional[] = [
  { open: '{', close: '}' },
  { open: '[', close: ']' },
  { open: '(', close: ')' },
  { open: '"', close: '"' },
  { open: "'", close: "'" },
];

const DEFAULT_SURROUNDING: monaco.languages.IAutoClosingPair[] = [
  { open: '{', close: '}' },
  { open: '[', close: ']' },
  { open: '(', close: ')' },
  { open: '"', close: '"' },
  { open: "'", close: "'" },
];

export function defineCustomLanguage(def: CustomLanguageDefinition): monaco.IDisposable[] {
  const disposables: monaco.IDisposable[] = [];

  monaco.languages.register({
    id: def.id,
    extensions: def.extensions,
  });

  disposables.push(
    monaco.languages.setMonarchTokensProvider(def.id, {
      keywords: def.keywords,
      operators: def.operators ?? [],
      symbols: def.symbols ?? /[=><!~?:&|+\-*/^%]+/,
      tokenizer: def.tokenizer,
    }),
  );

  disposables.push(
    monaco.languages.setLanguageConfiguration(def.id, {
      brackets: def.brackets ?? DEFAULT_BRACKETS,
      autoClosingPairs: def.autoClosingPairs ?? DEFAULT_AUTO_CLOSING,
      surroundingPairs: def.surroundingPairs ?? DEFAULT_SURROUNDING,
      comments: def.comments,
    }),
  );

  if (def.completionItems && def.completionItems.length > 0) {
    const items = def.completionItems;
    disposables.push(
      monaco.languages.registerCompletionItemProvider(def.id, {
        provideCompletionItems(model, position) {
          const word = model.getWordUntilPosition(position);
          const range: monaco.IRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          return {
            suggestions: items.map((item) => ({ ...item, range })),
          };
        },
      }),
    );
  }

  return disposables;
}
