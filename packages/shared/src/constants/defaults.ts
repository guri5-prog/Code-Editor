import type { UserSettings } from '../types/settings.js';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  editor: {
    fontSize: 14,
    tabSize: 2,
    wordWrap: 'on',
    minimap: false,
    lineNumbers: 'on',
  },
  theme: {
    activeTheme: 'dark',
  },
  keybindings: {
    run: 'Ctrl+ENTER',
    save: 'Ctrl+S',
    newFile: 'Ctrl+N',
  },
  accessibility: {
    reducedMotion: false,
    highContrast: false,
    focusIndicators: true,
    screenReaderMode: false,
  },
};
