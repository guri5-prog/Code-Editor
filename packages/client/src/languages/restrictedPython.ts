import * as monaco from 'monaco-editor';
import { defineCustomLanguage } from './customLanguage';

const ALLOWED_KEYWORDS = [
  'and',
  'as',
  'break',
  'class',
  'continue',
  'def',
  'elif',
  'else',
  'except',
  'False',
  'finally',
  'for',
  'from',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'None',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'True',
  'try',
  'while',
  'with',
  'yield',
];

const ALLOWED_BUILTINS = [
  'print',
  'input',
  'len',
  'range',
  'int',
  'float',
  'str',
  'bool',
  'list',
  'dict',
  'tuple',
  'set',
  'type',
  'isinstance',
  'abs',
  'max',
  'min',
  'sum',
  'sorted',
  'reversed',
  'enumerate',
  'zip',
  'map',
  'filter',
  'round',
  'chr',
  'ord',
  'hex',
  'bin',
  'oct',
  'format',
  'repr',
  'any',
  'all',
];

const BLOCKED_CONSTRUCTS = [
  'exec',
  'eval',
  'compile',
  '__import__',
  'globals',
  'locals',
  'getattr',
  'setattr',
  'delattr',
  'open',
  'file',
  'breakpoint',
  'exit',
  'quit',
];

const BLOCKED_MODULES = [
  'os',
  'sys',
  'subprocess',
  'shutil',
  'socket',
  'ctypes',
  'importlib',
  'pickle',
  'shelve',
  'marshal',
  'code',
  'codeop',
  'pty',
  'pipes',
  'fcntl',
  'termios',
  'resource',
  'signal',
  'threading',
  'multiprocessing',
  'concurrent',
  'asyncio',
  'http',
  'urllib',
  'ftplib',
  'smtplib',
  'imaplib',
  'poplib',
  'telnetlib',
  'xmlrpc',
  'ssl',
  'pathlib',
  'tempfile',
  'glob',
  'fnmatch',
  'io',
  'mmap',
  'webbrowser',
  'gc',
  'inspect',
  'dis',
  'tracemalloc',
];

export function registerRestrictedPython(): monaco.IDisposable[] {
  const keywordCompletions: monaco.languages.CompletionItem[] = ALLOWED_KEYWORDS.map((kw) => ({
    label: kw,
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: kw,
    range: undefined!,
  }));

  const builtinCompletions: monaco.languages.CompletionItem[] = ALLOWED_BUILTINS.map((fn) => ({
    label: fn,
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: `${fn}($0)`,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Built-in function',
    range: undefined!,
  }));

  const disposables = defineCustomLanguage({
    id: 'restricted-python',
    extensions: ['.rpy'],
    keywords: ALLOWED_KEYWORDS,
    completionItems: [...keywordCompletions, ...builtinCompletions],
    comments: { lineComment: '#' },
    brackets: [
      ['(', ')'],
      ['[', ']'],
      ['{', '}'],
    ],
    tokenizer: {
      root: [
        [/#.*$/, 'comment'],
        [/@[a-zA-Z_]\w*/, 'tag'],
        [/"""/, 'string', '@multistring_dq'],
        [/'''/, 'string', '@multistring_sq'],
        [/"([^"\\]|\\.)*"/, 'string'],
        [/'([^'\\]|\\.)*'/, 'string'],
        [
          /[a-zA-Z_]\w*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier',
            },
          },
        ],
        [/0[xX][0-9a-fA-F]+/, 'number.hex'],
        [/0[oO][0-7]+/, 'number.octal'],
        [/0[bB][01]+/, 'number.binary'],
        [/\d+(\.\d+)?([eE][+-]?\d+)?[jJ]?/, 'number'],
        [/[+\-*/%=<>!&|^~]/, 'operator'],
        [/[{}()[\]]/, '@brackets'],
        [/[,;:.]/, 'delimiter'],
      ],
      multistring_dq: [
        [/[^"]+/, 'string'],
        [/"""/, 'string', '@pop'],
        [/"/, 'string'],
      ],
      multistring_sq: [
        [/[^']+/, 'string'],
        [/'''/, 'string', '@pop'],
        [/'/, 'string'],
      ],
    },
  });

  disposables.push(
    monaco.languages.registerCompletionItemProvider('restricted-python', {
      provideCompletionItems(model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        const word = model.getWordUntilPosition(position);
        const range: monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const warnings: monaco.languages.CompletionItem[] = [];

        for (const blocked of BLOCKED_CONSTRUCTS) {
          if (word.word && blocked.startsWith(word.word)) {
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

        if (/^\s*(import\s|from\s)/.test(lineContent)) {
          for (const mod of BLOCKED_MODULES) {
            if (word.word && mod.startsWith(word.word)) {
              warnings.push({
                label: `${mod} (blocked module)`,
                kind: monaco.languages.CompletionItemKind.Issue,
                insertText: '',
                detail: 'Module not allowed in restricted mode',
                range,
                sortText: 'zz',
              });
            }
          }
        }

        return { suggestions: warnings };
      },
    }),
  );

  return disposables;
}

export { BLOCKED_CONSTRUCTS, BLOCKED_MODULES };
