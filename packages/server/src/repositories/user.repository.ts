import type { User, UserSettings } from '@code-editor/shared';
import { DEFAULT_USER_SETTINGS } from '@code-editor/shared';
import { UserModel, type IUser } from '../models/User.model.js';

function normalizeSettings(raw: unknown): UserSettings {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Partial<UserSettings>;
  return {
    editor: {
      ...DEFAULT_USER_SETTINGS.editor,
      ...(input.editor ?? {}),
    },
    theme: {
      ...DEFAULT_USER_SETTINGS.theme,
      ...(input.theme ?? {}),
    },
    keybindings: {
      ...DEFAULT_USER_SETTINGS.keybindings,
      ...(input.keybindings ?? {}),
    },
    accessibility: {
      ...DEFAULT_USER_SETTINGS.accessibility,
      ...(input.accessibility ?? {}),
    },
  };
}

function toUser(doc: IUser): User {
  return {
    id: doc._id.toString(),
    email: doc.email,
    displayName: doc.displayName,
    avatar: doc.avatar,
    settings: normalizeSettings(doc.settings),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function findByEmail(email: string): Promise<IUser | null> {
  return UserModel.findOne({ email: email.toLowerCase() });
}

export async function findById(id: string): Promise<IUser | null> {
  return UserModel.findById(id);
}

export async function findByIdPublic(id: string): Promise<User | null> {
  const doc = await UserModel.findById(id);
  return doc ? toUser(doc) : null;
}

export async function create(data: {
  email: string;
  passwordHash?: string;
  displayName: string;
  avatar?: string;
  oauthProviders?: Array<{ provider: string; providerId: string }>;
}): Promise<User> {
  const doc = await UserModel.create({
    email: data.email.toLowerCase(),
    passwordHash: data.passwordHash,
    displayName: data.displayName,
    avatar: data.avatar,
    oauthProviders: data.oauthProviders ?? [],
  });
  return toUser(doc);
}

export async function updateById(
  id: string,
  data: Partial<Pick<IUser, 'displayName' | 'avatar' | 'settings'>>,
): Promise<User | null> {
  const doc = await UserModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  return doc ? toUser(doc) : null;
}

export async function updateSettings(id: string, settings: UserSettings): Promise<User | null> {
  const doc = await UserModel.findByIdAndUpdate(id, { $set: { settings } }, { new: true });
  return doc ? toUser(doc) : null;
}

export async function addOAuthProvider(
  id: string,
  provider: { provider: string; providerId: string },
): Promise<User | null> {
  const doc = await UserModel.findByIdAndUpdate(
    id,
    { $push: { oauthProviders: provider } },
    { new: true },
  );
  return doc ? toUser(doc) : null;
}
