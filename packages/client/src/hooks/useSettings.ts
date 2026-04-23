import { create } from 'zustand';
import { DEFAULT_USER_SETTINGS, type UserSettings } from '@code-editor/shared';
import { isAuthenticated } from '../services/auth';
import { fetchMySettings, saveMySettings } from '../services/settingsService';
import { useThemeStore } from '../store/themeStore';
import { normalizeShortcut, hasShortcutConflicts } from '../utils/shortcuts';
import { toast } from 'react-hot-toast';

const STORAGE_KEY = 'code-editor-user-settings';
const LAST_NON_HC_THEME_KEY = 'code-editor-last-theme';
const SAVE_DEBOUNCE_MS = 500;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function mergeSettings(input?: Partial<UserSettings>): UserSettings {
  return {
    editor: {
      ...DEFAULT_USER_SETTINGS.editor,
      ...(input?.editor ?? {}),
    },
    theme: {
      ...DEFAULT_USER_SETTINGS.theme,
      ...(input?.theme ?? {}),
    },
    keybindings: {
      ...DEFAULT_USER_SETTINGS.keybindings,
      ...(input?.keybindings ?? {}),
    },
    accessibility: {
      ...DEFAULT_USER_SETTINGS.accessibility,
      ...(input?.accessibility ?? {}),
    },
  };
}

function loadLocalSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_USER_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return mergeSettings(parsed);
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

function saveLocalSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore local storage failure
  }
}

function loadLastTheme(): 'dark' | 'light' | 'high-contrast' {
  try {
    const raw = localStorage.getItem(LAST_NON_HC_THEME_KEY);
    if (raw === 'dark' || raw === 'light' || raw === 'high-contrast') return raw;
    return 'dark';
  } catch {
    return 'dark';
  }
}

function saveLastTheme(theme: 'dark' | 'light' | 'high-contrast'): void {
  try {
    localStorage.setItem(LAST_NON_HC_THEME_KEY, theme);
  } catch {
    // ignore local storage failure
  }
}

function applySettingsToDom(settings: UserSettings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--ui-font-size', `${settings.editor.fontSize}px`);
  root.dataset.reducedMotion = settings.accessibility.reducedMotion ? 'true' : 'false';
  root.dataset.focusIndicators = settings.accessibility.focusIndicators ? 'true' : 'false';
  root.dataset.screenReaderMode = settings.accessibility.screenReaderMode ? 'true' : 'false';
}

interface SettingsState {
  settings: UserSettings;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: loadLocalSettings(),
  loading: false,
  initialized: false,
  async initialize() {
    if (get().initialized) return;
    let settings = loadLocalSettings();
    applySettingsToDom(settings);

    if (isAuthenticated()) {
      set({ loading: true });
      try {
        const remote = await fetchMySettings();
        settings = mergeSettings(remote);
      } catch {
        // keep local fallback
      } finally {
        set({ loading: false });
      }
    }

    const forcedTheme = settings.accessibility.highContrast
      ? 'high-contrast'
      : settings.theme.activeTheme === 'high-contrast'
        ? loadLastTheme()
        : settings.theme.activeTheme;
    if (forcedTheme !== 'high-contrast') saveLastTheme(forcedTheme);
    useThemeStore.getState().setTheme(forcedTheme);
    settings = {
      ...settings,
      theme: { ...settings.theme, activeTheme: forcedTheme },
    };

    saveLocalSettings(settings);
    applySettingsToDom(settings);
    set({ settings, initialized: true });
  },

  async updateSettings(patch) {
    const current = get().settings;
    const next = mergeSettings({
      ...current,
      ...patch,
      editor: {
        ...current.editor,
        ...(patch.editor ?? {}),
      },
      theme: {
        ...current.theme,
        ...(patch.theme ?? {}),
      },
      keybindings: {
        ...current.keybindings,
        ...(patch.keybindings ?? {}),
      },
      accessibility: {
        ...current.accessibility,
        ...(patch.accessibility ?? {}),
      },
    });

    const normalizedRun = normalizeShortcut(next.keybindings.run);
    const normalizedSave = normalizeShortcut(next.keybindings.save);
    const normalizedNewFile = normalizeShortcut(next.keybindings.newFile);
    if (!normalizedRun || !normalizedSave || !normalizedNewFile) {
      toast.error('Invalid keybinding format. Example: Ctrl+S');
      return;
    }
    if (hasShortcutConflicts([normalizedRun, normalizedSave, normalizedNewFile])) {
      toast.error('Keybinding conflict detected. Use unique shortcuts.');
      return;
    }
    next.keybindings.run = normalizedRun;
    next.keybindings.save = normalizedSave;
    next.keybindings.newFile = normalizedNewFile;

    const forcedTheme = next.accessibility.highContrast
      ? 'high-contrast'
      : next.theme.activeTheme === 'high-contrast'
        ? loadLastTheme()
        : next.theme.activeTheme;
    if (!next.accessibility.highContrast && forcedTheme !== 'high-contrast') {
      saveLastTheme(forcedTheme);
    }
    if (next.accessibility.highContrast && next.theme.activeTheme !== 'high-contrast') {
      saveLastTheme(next.theme.activeTheme);
    }
    next.theme.activeTheme = forcedTheme;

    useThemeStore.getState().setTheme(forcedTheme);
    applySettingsToDom(next);
    saveLocalSettings(next);
    set({ settings: next });

    if (isAuthenticated()) {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        try {
          const latest = useSettingsStore.getState().settings;
          const saved = await saveMySettings(latest);
          const merged = mergeSettings(saved);
          saveLocalSettings(merged);
          applySettingsToDom(merged);
          set({ settings: merged });
        } catch {
          toast.error('Settings sync failed. Your local changes are kept.');
        }
      }, SAVE_DEBOUNCE_MS);
    }
  },
}));

export function useSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const loading = useSettingsStore((s) => s.loading);
  const initialized = useSettingsStore((s) => s.initialized);
  const initialize = useSettingsStore((s) => s.initialize);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  return { settings, loading, initialized, initialize, updateSettings };
}
