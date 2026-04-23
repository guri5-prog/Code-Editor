import type { UserSettings } from '@code-editor/shared';
import { DEFAULT_USER_SETTINGS } from '@code-editor/shared';
import { AppError } from '../middleware/errorHandler.js';
import * as userRepo from '../repositories/user.repository.js';

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

class SettingsService {
  async getSettings(userId: string): Promise<UserSettings> {
    const user = await userRepo.findByIdPublic(userId);
    if (!user) throw new AppError(404, 'User not found');
    return mergeSettings(user.settings);
  }

  async updateSettings(userId: string, settings: UserSettings): Promise<UserSettings> {
    const merged = mergeSettings(settings);
    const user = await userRepo.updateSettings(userId, merged);
    if (!user) throw new AppError(404, 'User not found');
    return mergeSettings(user.settings);
  }
}

export const settingsService = new SettingsService();
