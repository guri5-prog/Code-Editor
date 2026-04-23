import type { BuiltInThemeId } from '../constants/themes.js';

export interface UserSettings {
  editor: {
    fontSize: number;
    tabSize: number;
    wordWrap: 'on' | 'off' | 'wordWrapColumn';
    minimap: boolean;
    lineNumbers: 'on' | 'off' | 'relative';
  };
  theme: {
    activeTheme: BuiltInThemeId;
  };
  keybindings: {
    run: string;
    save: string;
    newFile: string;
  };
  accessibility: {
    reducedMotion: boolean;
    highContrast: boolean;
    focusIndicators: boolean;
    screenReaderMode: boolean;
  };
}
