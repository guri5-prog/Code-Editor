import * as monaco from 'monaco-editor';
import type { ThemeColors } from '@code-editor/shared';
import { darkTheme } from './dark';
import { lightTheme } from './light';
import { highContrastTheme } from './highContrast';

const CSS_VAR_MAP: Record<keyof ThemeColors, string> = {
  bgPrimary: '--bg-primary',
  bgSecondary: '--bg-secondary',
  bgSurface: '--bg-surface',
  textPrimary: '--text-primary',
  textSecondary: '--text-secondary',
  textMuted: '--text-muted',
  accent: '--accent',
  accentHover: '--accent-hover',
  border: '--border',
  success: '--success',
  error: '--error',
  warning: '--warning',
};

let registered = false;

export function registerBuiltInThemes(): void {
  if (registered) return;
  monaco.editor.defineTheme('editor-dark', darkTheme);
  monaco.editor.defineTheme('editor-light', lightTheme);
  monaco.editor.defineTheme('editor-high-contrast', highContrastTheme);
  registered = true;
}

export function applyTheme(themeId: string, customColors?: Partial<ThemeColors>): void {
  document.documentElement.setAttribute('data-theme', themeId);

  const root = document.documentElement;
  for (const cssVar of Object.values(CSS_VAR_MAP)) {
    root.style.removeProperty(cssVar);
  }

  if (customColors) {
    for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
      const value = customColors[key as keyof ThemeColors];
      if (value) {
        root.style.setProperty(cssVar, value);
      }
    }
  }
}

export function registerCustomMonacoTheme(
  id: string,
  base: 'vs' | 'vs-dark' | 'hc-black',
  colorOverrides: Record<string, string>,
): void {
  const baseThemeData =
    base === 'vs' ? lightTheme : base === 'hc-black' ? highContrastTheme : darkTheme;

  monaco.editor.defineTheme(id, {
    base,
    inherit: true,
    rules: baseThemeData.rules,
    colors: { ...baseThemeData.colors, ...colorOverrides },
  });
}
