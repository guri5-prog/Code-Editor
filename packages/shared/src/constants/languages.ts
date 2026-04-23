export interface LanguageConfig {
  id: string;
  displayName: string;
  monacoId: string;
  pistonId: string;
  extensions: string[];
  category: 'web' | 'systems' | 'scripting' | 'education' | 'custom';
  icon?: string;
  restricted?: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    id: 'javascript',
    displayName: 'JavaScript',
    monacoId: 'javascript',
    pistonId: 'javascript',
    extensions: ['.js', '.mjs'],
    category: 'web',
  },
  {
    id: 'typescript',
    displayName: 'TypeScript',
    monacoId: 'typescript',
    pistonId: 'typescript',
    extensions: ['.ts', '.tsx'],
    category: 'web',
  },
  {
    id: 'html',
    displayName: 'HTML',
    monacoId: 'html',
    pistonId: '',
    extensions: ['.html', '.htm'],
    category: 'web',
  },
  {
    id: 'css',
    displayName: 'CSS',
    monacoId: 'css',
    pistonId: '',
    extensions: ['.css'],
    category: 'web',
  },
  {
    id: 'json',
    displayName: 'JSON',
    monacoId: 'json',
    pistonId: '',
    extensions: ['.json'],
    category: 'web',
  },
  {
    id: 'python',
    displayName: 'Python',
    monacoId: 'python',
    pistonId: 'python',
    extensions: ['.py'],
    category: 'scripting',
  },
  {
    id: 'java',
    displayName: 'Java',
    monacoId: 'java',
    pistonId: 'java',
    extensions: ['.java'],
    category: 'systems',
  },
  {
    id: 'c',
    displayName: 'C',
    monacoId: 'c',
    pistonId: 'c',
    extensions: ['.c', '.h'],
    category: 'systems',
  },
  {
    id: 'cpp',
    displayName: 'C++',
    monacoId: 'cpp',
    pistonId: 'c++',
    extensions: ['.cpp', '.hpp', '.cc'],
    category: 'systems',
  },
  {
    id: 'go',
    displayName: 'Go',
    monacoId: 'go',
    pistonId: 'go',
    extensions: ['.go'],
    category: 'systems',
  },
  {
    id: 'rust',
    displayName: 'Rust',
    monacoId: 'rust',
    pistonId: 'rust',
    extensions: ['.rs'],
    category: 'systems',
  },
  {
    id: 'ruby',
    displayName: 'Ruby',
    monacoId: 'ruby',
    pistonId: 'ruby',
    extensions: ['.rb'],
    category: 'scripting',
  },
  {
    id: 'php',
    displayName: 'PHP',
    monacoId: 'php',
    pistonId: 'php',
    extensions: ['.php'],
    category: 'scripting',
  },
  {
    id: 'markdown',
    displayName: 'Markdown',
    monacoId: 'markdown',
    pistonId: '',
    extensions: ['.md'],
    category: 'web',
  },
  {
    id: 'restricted-python',
    displayName: 'Python (Restricted)',
    monacoId: 'restricted-python',
    pistonId: 'python',
    extensions: ['.rpy'],
    category: 'education',
    restricted: true,
  },
  {
    id: 'restricted-javascript',
    displayName: 'JavaScript (Restricted)',
    monacoId: 'restricted-javascript',
    pistonId: 'javascript',
    extensions: ['.rjs'],
    category: 'education',
    restricted: true,
  },
];

export function getLanguageByExtension(filename: string): LanguageConfig | undefined {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex <= 0) return undefined;
  const ext = filename.slice(dotIndex);
  return SUPPORTED_LANGUAGES.find((lang) => lang.extensions.includes(ext));
}
