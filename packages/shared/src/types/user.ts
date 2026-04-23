import type { UserSettings } from './settings.js';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  settings?: UserSettings;
  createdAt: string;
  updatedAt: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
}
