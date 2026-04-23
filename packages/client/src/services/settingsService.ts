import type { UserSettings } from '@code-editor/shared';
import { apiFetch } from './apiClient';

export async function fetchMySettings(): Promise<UserSettings> {
  const data = await apiFetch<{ settings: UserSettings }>('/api/users/me/settings');
  return data.settings;
}

export async function saveMySettings(settings: UserSettings): Promise<UserSettings> {
  const data = await apiFetch<{ settings: UserSettings }>('/api/users/me/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return data.settings;
}
