export type BuiltInThemeId = 'dark' | 'light' | 'high-contrast';

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgSurface: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  border: string;
  success: string;
  error: string;
  warning: string;
}

export interface ThemeConfig {
  id: string;
  displayName: string;
  monacoTheme: string;
  isBuiltIn: boolean;
  baseTheme?: BuiltInThemeId;
  colors?: Partial<ThemeColors>;
}

export const DARK_COLORS: ThemeColors = {
  bgPrimary: '#1e1e2e',
  bgSecondary: '#181825',
  bgSurface: '#313244',
  textPrimary: '#cdd6f4',
  textSecondary: '#a6adc8',
  textMuted: '#6c7086',
  accent: '#89b4fa',
  accentHover: '#74c7ec',
  border: '#45475a',
  success: '#a6e3a1',
  error: '#f38ba8',
  warning: '#fab387',
};

export const LIGHT_COLORS: ThemeColors = {
  bgPrimary: '#eff1f5',
  bgSecondary: '#e6e9ef',
  bgSurface: '#ccd0da',
  textPrimary: '#4c4f69',
  textSecondary: '#5c5f77',
  textMuted: '#8c8fa1',
  accent: '#1e66f5',
  accentHover: '#2a6ef6',
  border: '#bcc0cc',
  success: '#40a02b',
  error: '#d20f39',
  warning: '#fe640b',
};

export const HIGH_CONTRAST_COLORS: ThemeColors = {
  bgPrimary: '#000000',
  bgSecondary: '#0a0a0a',
  bgSurface: '#1a1a1a',
  textPrimary: '#ffffff',
  textSecondary: '#e0e0e0',
  textMuted: '#a0a0a0',
  accent: '#6fc3ff',
  accentHover: '#8dd4ff',
  border: '#ffffff',
  success: '#00ff00',
  error: '#ff3333',
  warning: '#ffaa00',
};

export const THEME_COLOR_DEFAULTS: Record<BuiltInThemeId, ThemeColors> = {
  dark: DARK_COLORS,
  light: LIGHT_COLORS,
  'high-contrast': HIGH_CONTRAST_COLORS,
};

export const BUILT_IN_THEMES: ThemeConfig[] = [
  { id: 'dark', displayName: 'Dark', monacoTheme: 'editor-dark', isBuiltIn: true },
  { id: 'light', displayName: 'Light', monacoTheme: 'editor-light', isBuiltIn: true },
  {
    id: 'high-contrast',
    displayName: 'High Contrast',
    monacoTheme: 'editor-high-contrast',
    isBuiltIn: true,
  },
];

export const THEME_COLOR_KEYS: (keyof ThemeColors)[] = [
  'bgPrimary',
  'bgSecondary',
  'bgSurface',
  'textPrimary',
  'textSecondary',
  'textMuted',
  'accent',
  'accentHover',
  'border',
  'success',
  'error',
  'warning',
];
