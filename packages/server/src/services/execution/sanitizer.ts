import { SUPPORTED_LANGUAGES } from '@code-editor/shared';
import { AppError } from '../../middleware/errorHandler.js';
import { EXECUTION_CONFIG } from '../../config/execution.js';

const RESTRICTED_PATTERNS: Record<string, RegExp[]> = {
  'restricted-python': [
    /\bimport\s+os\b/,
    /\bimport\s+sys\b/,
    /\bimport\s+subprocess\b/,
    /\bimport\s+shutil\b/,
    /\bimport\s+socket\b/,
    /\bimport\s+ctypes\b/,
    /\bimport\s+signal\b/,
    /\bimport\s+threading\b/,
    /\bimport\s+multiprocessing\b/,
    /\bimport\s+pickle\b/,
    /\bimport\s+marshal\b/,
    /\bimport\s+importlib\b/,
    /\bimport\s+code\b/,
    /\bimport\s+codeop\b/,
    /\bimport\s+pty\b/,
    /\bimport\s+resource\b/,
    /\bfrom\s+os\s+import\b/,
    /\bfrom\s+sys\s+import\b/,
    /\bfrom\s+subprocess\s+import\b/,
    /\bfrom\s+shutil\s+import\b/,
    /\bfrom\s+socket\s+import\b/,
    /\bfrom\s+ctypes\s+import\b/,
    /\bfrom\s+importlib\s+import\b/,
    /\bfrom\s+pickle\s+import\b/,
    /\b__import__\b/,
    /\bexec\s*\(/,
    /\beval\s*\(/,
    /\bopen\s*\(/,
    /\bcompile\s*\(/,
    /\bgetattr\s*\(/,
    /\bsetattr\s*\(/,
    /\bdelattr\s*\(/,
    /\bglobals\s*\(/,
    /\blocals\s*\(/,
    /\bvars\s*\(/,
    /\bdir\s*\(/,
    /\b__builtins__\b/,
    /\b__class__\b/,
    /\b__subclasses__\b/,
    /\b__bases__\b/,
    /\b__mro__\b/,
    /\b__dict__\b/,
    /\b__globals__\b/,
    /\b__code__\b/,
    /\b__reduce__\b/,
    /\bbreakpoint\s*\(/,
    /\b__loader__\b/,
    /\b__spec__\b/,
  ],
  'restricted-javascript': [
    /\beval\s*\(/,
    /\bFunction\s*\(/,
    /\bnew\s+Function\b/,
    /\bfetch\s*\(/,
    /\brequire\s*\(/,
    /\bimport\s*\(/,
    /\bprocess\b/,
    /\bchild_process\b/,
    /\b__proto__\b/,
    /\bconstructor\s*\[/,
    /\bconstructor\s*\.\s*constructor\b/,
    /\bReflect\b/,
    /\bProxy\s*\(/,
    /\bnew\s+Proxy\b/,
    /\bglobalThis\b/,
    /\bObject\s*\.\s*getPrototypeOf\b/,
    /\bObject\s*\.\s*setPrototypeOf\b/,
    /\bObject\s*\.\s*defineProperty\b/,
    /\bsetTimeout\s*\(/,
    /\bsetInterval\s*\(/,
    /\bimport\s*\.meta\b/,
  ],
};

function containsObfuscatedPatterns(code: string): boolean {
  if (/\\x[0-9a-fA-F]{2}/.test(code)) return true;
  if (/\\u[0-9a-fA-F]{4}/.test(code)) return true;
  if (/\\u\{[0-9a-fA-F]+\}/.test(code)) return true;
  if (/String\s*\.\s*fromCharCode/.test(code)) return true;
  if (/atob\s*\(/.test(code)) return true;
  if (/Buffer\s*\.\s*from/.test(code)) return true;
  if (/chr\s*\(\s*\d/.test(code)) return true;
  if (/\.decode\s*\(\s*['"]/.test(code)) return true;
  return false;
}

export function sanitizeExecutionInput(languageId: string, code: string, stdin: string): void {
  if (code.length > EXECUTION_CONFIG.maxCodeSize) {
    throw new AppError(400, `Code exceeds maximum size of ${EXECUTION_CONFIG.maxCodeSize} bytes`);
  }

  if (stdin.length > EXECUTION_CONFIG.maxStdinSize) {
    throw new AppError(400, `Stdin exceeds maximum size of ${EXECUTION_CONFIG.maxStdinSize} bytes`);
  }

  const lang = SUPPORTED_LANGUAGES.find((l) => l.id === languageId);
  if (!lang) {
    throw new AppError(400, `Unsupported language: ${languageId}`);
  }

  if (lang.pistonId === '') {
    throw new AppError(400, `Language "${lang.displayName}" does not support execution`);
  }

  if (lang.restricted) {
    const patterns = RESTRICTED_PATTERNS[languageId];
    const codeToCheck = stripCommentsAndStrings(languageId, code);

    if (containsObfuscatedPatterns(codeToCheck)) {
      throw new AppError(400, 'Obfuscated code is not allowed in restricted mode');
    }

    if (patterns) {
      for (const pattern of patterns) {
        if (pattern.test(codeToCheck)) {
          throw new AppError(
            400,
            `Forbidden construct detected in restricted mode: ${pattern.source}`,
          );
        }
      }
    }
  }
}

function stripCommentsAndStrings(languageId: string, code: string): string {
  if (languageId === 'restricted-python') {
    return code
      .replace(/("""|''')[\s\S]*?\1/g, '""')
      .replace(/(['"])(?:\\.|(?!\1)[\s\S])*\1/g, '""')
      .replace(/#.*/g, '');
  }

  if (languageId === 'restricted-javascript') {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
      .replace(/`(?:\\[\s\S]|[^`])*`/g, '""')
      .replace(/(['"])(?:\\.|(?!\1)[\s\S])*\1/g, '""');
  }

  return code;
}
