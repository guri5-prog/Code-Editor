import * as monaco from 'monaco-editor';
import { defineCustomLanguage } from './customLanguage';

const ALLOWED_KEYWORDS = [
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'default',
  'do',
  'else',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'let',
  'new',
  'null',
  'of',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'undefined',
  'void',
  'while',
  'yield',
];

const ALLOWED_GLOBALS = [
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'String',
  'Number',
  'Boolean',
  'Promise',
  'console',
  'Math',
  'Array',
  'JSON',
  'Object',
];

const DOTTED_METHODS: Record<string, string[]> = {
  console: ['log', 'warn', 'error'],
  Math: ['abs', 'floor', 'ceil', 'round', 'max', 'min', 'random', 'sqrt', 'pow', 'PI'],
  Array: ['isArray'],
  JSON: ['stringify', 'parse'],
  Object: ['keys', 'values', 'entries'],
};

const BLOCKED_GLOBALS = [
  'eval',
  'Function',
  'document',
  'window',
  'globalThis',
  'self',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'Worker',
  'SharedWorker',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'crypto',
  'process',
  'require',
  '__dirname',
  '__filename',
  'Proxy',
  'Reflect',
];

export function registerRestrictedJS(): monaco.IDisposable[] {
  const keywordCompletions: monaco.languages.CompletionItem[] = ALLOWED_KEYWORDS.map((kw) => ({
    label: kw,
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: kw,
    range: undefined!,
  }));

  const builtinCompletions: monaco.languages.CompletionItem[] = ALLOWED_GLOBALS.map((fn) => ({
    label: fn,
    kind: monaco.languages.CompletionItemKind.Variable,
    insertText: fn,
    detail: 'Allowed built-in',
    range: undefined!,
  }));

  const disposables = defineCustomLanguage({
    id: 'restricted-javascript',
    extensions: ['.rjs'],
    keywords: ALLOWED_KEYWORDS,
    completionItems: [...keywordCompletions, ...builtinCompletions],
    comments: { lineComment: '//', blockComment: ['/*', '*/'] },
    tokenizer: {
      root: [
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],
        [
          /[a-zA-Z_$]\w*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier',
            },
          },
        ],
        [/"([^"\\]|\\.)*"/, 'string'],
        [/'([^'\\]|\\.)*'/, 'string'],
        [/`/, 'string', '@template'],
        [/0[xX][0-9a-fA-F]+/, 'number.hex'],
        [/\d+(\.\d+)?([eE][+-]?\d+)?/, 'number'],
        [/=>/, 'operator'],
        [/[+\-*/%=<>!&|^~?:]+/, 'operator'],
        [/[{}()[\]]/, '@brackets'],
        [/[;,.]/, 'delimiter'],
      ],
      comment: [
        [/\*\//, 'comment', '@pop'],
        [/./, 'comment'],
      ],
      template: [
        [/\$\{/, 'delimiter.bracket', '@templateExpr'],
        [/\\./, 'string.escape'],
        [/`/, 'string', '@pop'],
        [/./, 'string'],
      ],
      templateExpr: [
        [/\}/, 'delimiter.bracket', '@pop'],
        [
          /[a-zA-Z_$]\w*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier',
            },
          },
        ],
        [/\d+(\.\d+)?/, 'number'],
        [/"([^"\\]|\\.)*"/, 'string'],
        [/'([^'\\]|\\.)*'/, 'string'],
        [/[+\-*/%=<>!&|^~?:]+/, 'operator'],
        [/[{}()[\]]/, '@brackets'],
        [/[;,.]/, 'delimiter'],
      ],
    },
  });

  disposables.push(
    monaco.languages.registerCompletionItemProvider('restricted-javascript', {
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range: monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const warnings: monaco.languages.CompletionItem[] = [];
        for (const blocked of BLOCKED_GLOBALS) {
          if (word.word && blocked.toLowerCase().startsWith(word.word.toLowerCase())) {
            warnings.push({
              label: `${blocked} (blocked)`,
              kind: monaco.languages.CompletionItemKind.Issue,
              insertText: '',
              detail: 'Not allowed in restricted mode',
              range,
              sortText: 'zz',
            });
          }
        }
        return { suggestions: warnings };
      },
    }),
  );

  disposables.push(
    monaco.languages.registerCompletionItemProvider('restricted-javascript', {
      triggerCharacters: ['.'],
      provideCompletionItems(model, position) {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const match = textUntilPosition.match(/(\w+)\.\s*$/);
        if (!match) return { suggestions: [] };

        const objectName = match[1];
        const methods = DOTTED_METHODS[objectName];
        if (!methods) return { suggestions: [] };

        const word = model.getWordUntilPosition(position);
        const range: monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        return {
          suggestions: methods.map((method) => ({
            label: method,
            kind:
              method === method.toUpperCase()
                ? monaco.languages.CompletionItemKind.Constant
                : monaco.languages.CompletionItemKind.Method,
            insertText: method === method.toUpperCase() ? method : `${method}($0)`,
            insertTextRules:
              method === method.toUpperCase()
                ? undefined
                : monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: `${objectName}.${method}`,
            range,
          })),
        };
      },
    }),
  );

  return disposables;
}

export { BLOCKED_GLOBALS };
