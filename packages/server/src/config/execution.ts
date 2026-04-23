import { SUPPORTED_LANGUAGES } from '@code-editor/shared';

export const EXECUTION_CONFIG = {
  pistonApiUrl: process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston',
  defaultTimeout: 10_000,
  maxCodeSize: 65_536,
  maxOutputSize: 1_048_576,
  maxStdinSize: 65_536,
  rateLimit: {
    windowMs: 60_000,
    maxExecutions: 10,
  },
} as const;

const LANGUAGE_VERSIONS: Record<string, string> = {
  javascript: '18.15.0',
  typescript: '5.0.3',
  python: '3.10.0',
  java: '15.0.2',
  c: '10.2.0',
  'c++': '10.2.0',
  go: '1.16.2',
  rust: '1.68.2',
  ruby: '3.0.1',
  php: '8.2.3',
};

export function getPistonLanguageVersion(pistonId: string): string {
  return LANGUAGE_VERSIONS[pistonId] || '*';
}

export function isExecutableLanguage(languageId: string): boolean {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.id === languageId);
  return !!lang && lang.pistonId !== '';
}

export function getPistonId(languageId: string): string | null {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.id === languageId);
  if (!lang || lang.pistonId === '') return null;
  return lang.pistonId;
}
