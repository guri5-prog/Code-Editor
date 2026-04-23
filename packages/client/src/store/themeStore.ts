import { create } from 'zustand';
import { BUILT_IN_THEMES, THEME_COLOR_DEFAULTS } from '@code-editor/shared';
import type { ThemeConfig, BuiltInThemeId, ThemeColors } from '@code-editor/shared';
import {
  applyTheme,
  registerBuiltInThemes,
  registerCustomMonacoTheme,
} from '../themes/themeRegistry';

const STORAGE_KEY = 'code-editor-theme';
const CUSTOM_THEMES_KEY = 'code-editor-custom-themes';

interface ThemeState {
  activeThemeId: string;
  customThemes: ThemeConfig[];
  setTheme: (themeId: string) => void;
  addCustomTheme: (theme: ThemeConfig) => void;
  removeCustomTheme: (themeId: string) => void;
}

function detectSystemTheme(): BuiltInThemeId {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function loadSavedTheme(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function loadCustomThemes(): ThemeConfig[] {
  try {
    const saved = localStorage.getItem(CUSTOM_THEMES_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // invalid or unavailable
  }
  return [];
}

function saveThemeId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // localStorage unavailable
  }
}

function saveCustomThemes(themes: ThemeConfig[]): void {
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
  } catch {
    // localStorage unavailable
  }
}

function getAllThemes(customThemes: ThemeConfig[]): ThemeConfig[] {
  return [...BUILT_IN_THEMES, ...customThemes];
}

function resolveMonacoTheme(themeId: string, themes: ThemeConfig[]): string {
  const config = themes.find((t) => t.id === themeId);
  return config?.monacoTheme ?? 'editor-dark';
}

function resolveDataTheme(themeId: string, themes: ThemeConfig[]): string {
  const config = themes.find((t) => t.id === themeId);
  if (config?.isBuiltIn) return themeId;
  return config?.baseTheme ?? 'dark';
}

function themeColorsToEditorColors(colors: Partial<ThemeColors>): Record<string, string> {
  const map: Record<string, string> = {};
  if (colors.bgPrimary) map['editor.background'] = colors.bgPrimary;
  if (colors.textPrimary) map['editor.foreground'] = colors.textPrimary;
  if (colors.bgSecondary) {
    map['editorWidget.background'] = colors.bgSecondary;
    map['editorSuggestWidget.background'] = colors.bgSecondary;
  }
  if (colors.bgSurface) {
    map['editor.selectionBackground'] = colors.bgSurface;
    map['editorSuggestWidget.selectedBackground'] = colors.bgSurface;
  }
  if (colors.border) {
    map['editorWidget.border'] = colors.border;
    map['editorSuggestWidget.border'] = colors.border;
  }
  if (colors.accent) {
    map['editorSuggestWidget.highlightForeground'] = colors.accent;
    map['editorBracketMatch.border'] = colors.accent;
  }
  return map;
}

export const useThemeStore = create<ThemeState>()((set, get) => {
  registerBuiltInThemes();

  const customThemes = loadCustomThemes();
  for (const t of customThemes) {
    if (t.monacoTheme && t.baseTheme && t.colors) {
      const base =
        t.baseTheme === 'light' ? 'vs' : t.baseTheme === 'high-contrast' ? 'hc-black' : 'vs-dark';
      registerCustomMonacoTheme(t.monacoTheme, base, themeColorsToEditorColors(t.colors));
    }
  }

  const savedTheme = loadSavedTheme();
  const initialThemeId = savedTheme ?? detectSystemTheme();
  const themes = getAllThemes(customThemes);
  const initialConfig = themes.find((t) => t.id === initialThemeId);
  applyTheme(resolveDataTheme(initialThemeId, themes), initialConfig?.colors);

  return {
    activeThemeId: initialThemeId,
    customThemes,

    setTheme(themeId: string) {
      const themes = getAllThemes(get().customThemes);
      const config = themes.find((t) => t.id === themeId);
      if (!config) return;

      applyTheme(resolveDataTheme(themeId, themes), config.colors);
      saveThemeId(themeId);
      set({ activeThemeId: themeId });
    },

    addCustomTheme(theme: ThemeConfig) {
      const base =
        theme.baseTheme === 'light'
          ? 'vs'
          : theme.baseTheme === 'high-contrast'
            ? 'hc-black'
            : 'vs-dark';
      const editorColors = theme.colors ? themeColorsToEditorColors(theme.colors) : {};
      registerCustomMonacoTheme(theme.monacoTheme, base, editorColors);

      set((state) => {
        const updated = [...state.customThemes, theme];
        saveCustomThemes(updated);
        return { customThemes: updated };
      });
    },

    removeCustomTheme(themeId: string) {
      const state = get();
      if (state.activeThemeId === themeId) {
        state.setTheme('dark');
      }
      set((s) => {
        const updated = s.customThemes.filter((t) => t.id !== themeId);
        saveCustomThemes(updated);
        return { customThemes: updated };
      });
    },
  };
});

export function selectMonacoTheme(state: ThemeState): string {
  return resolveMonacoTheme(state.activeThemeId, getAllThemes(state.customThemes));
}

export function selectActiveThemeConfig(state: ThemeState): ThemeConfig | undefined {
  return getAllThemes(state.customThemes).find((t) => t.id === state.activeThemeId);
}

export function selectAllThemes(state: ThemeState): ThemeConfig[] {
  return getAllThemes(state.customThemes);
}

export function getThemeColors(themeId: string, overrides?: Partial<ThemeColors>): ThemeColors {
  const base = THEME_COLOR_DEFAULTS[themeId as BuiltInThemeId] ?? THEME_COLOR_DEFAULTS['dark'];
  if (!overrides) return base;
  return { ...base, ...overrides };
}

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    const hasExplicitChoice = loadSavedTheme() !== null;
    if (!hasExplicitChoice) {
      const store = useThemeStore.getState();
      const newTheme = detectSystemTheme();
      const themes = getAllThemes(store.customThemes);
      applyTheme(resolveDataTheme(newTheme, themes));
      useThemeStore.setState({ activeThemeId: newTheme });
    }
  });
}
