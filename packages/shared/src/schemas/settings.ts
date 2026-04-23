import { z } from 'zod';

export const settingsSchema = z.object({
  editor: z.object({
    fontSize: z.number().int().min(12).max(32),
    tabSize: z.number().int().min(1).max(8),
    wordWrap: z.enum(['on', 'off', 'wordWrapColumn']),
    minimap: z.boolean(),
    lineNumbers: z.enum(['on', 'off', 'relative']),
  }),
  theme: z.object({
    activeTheme: z.enum(['dark', 'light', 'high-contrast']),
  }),
  keybindings: z.object({
    run: z.string().min(1).max(40),
    save: z.string().min(1).max(40),
    newFile: z.string().min(1).max(40),
  }),
  accessibility: z.object({
    reducedMotion: z.boolean(),
    highContrast: z.boolean(),
    focusIndicators: z.boolean(),
    screenReaderMode: z.boolean(),
  }),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
