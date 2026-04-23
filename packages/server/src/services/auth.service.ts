import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { User, RegisterInput, LoginInput } from '@code-editor/shared';
import { AppError } from '../middleware/errorHandler.js';
import * as userRepo from '../repositories/user.repository.js';
import { RefreshTokenModel } from '../models/RefreshToken.model.js';
import { getRedis } from '../database/redis.js';
import { env } from '../config/env.js';

interface OAuthUserInput {
  email: string;
  displayName: string;
  avatar?: string;
  provider: string;
  providerId: string;
}

const BCRYPT_ROUNDS = 12;
const MAX_REFRESH_TOKENS_PER_USER = 10;
const OAUTH_CODE_TTL_SECONDS = 60;

function toPublicUser(doc: {
  _id: { toString(): string };
  email: string;
  displayName: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}): User {
  return {
    id: doc._id.toString(),
    email: doc.email,
    displayName: doc.displayName,
    avatar: doc.avatar,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(`${env.JWT_SECRET}:${token}`).digest('hex');
}

class AuthService {
  async register(input: RegisterInput): Promise<User> {
    const existing = await userRepo.findByEmail(input.email);
    if (existing) {
      throw new AppError(409, 'Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    return userRepo.create({
      email: input.email,
      passwordHash,
      displayName: input.displayName,
    });
  }

  async login(input: LoginInput): Promise<User> {
    const doc = await userRepo.findByEmail(input.email);
    if (!doc || !doc.passwordHash) {
      throw new AppError(401, 'Invalid email or password');
    }

    const valid = await bcrypt.compare(input.password, doc.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Invalid email or password');
    }

    return toPublicUser(doc);
  }

  async findOrCreateOAuthUser(input: OAuthUserInput): Promise<User> {
    const existing = await userRepo.findByEmail(input.email);
    if (existing) {
      const linked = (existing.oauthProviders ?? []).find((p) => p.provider === input.provider);
      if (linked && linked.providerId !== input.providerId) {
        throw new AppError(409, 'OAuth account mismatch');
      }
      if (!linked) {
        const updated = await userRepo.addOAuthProvider(existing._id.toString(), {
          provider: input.provider,
          providerId: input.providerId,
        });
        if (!updated) {
          throw new AppError(500, 'Failed to link OAuth provider');
        }
        return updated;
      }
      return toPublicUser(existing);
    }

    return userRepo.create({
      email: input.email,
      displayName: input.displayName,
      avatar: input.avatar,
      oauthProviders: [{ provider: input.provider, providerId: input.providerId }],
    });
  }

  async getUserById(id: string): Promise<User | null> {
    return userRepo.findByIdPublic(id);
  }

  async storeRefreshToken(token: string, userId: string, expiresAt: Date): Promise<void> {
    const tokenHash = hashRefreshToken(token);
    const count = await RefreshTokenModel.countDocuments({ userId, isRevoked: false });
    if (count >= MAX_REFRESH_TOKENS_PER_USER) {
      await RefreshTokenModel.findOneAndDelete({ userId, isRevoked: false }).sort({ expiresAt: 1 });
    }

    await RefreshTokenModel.create({ userId, token: tokenHash, expiresAt });
  }

  async verifyAndRevokeRefreshToken(token: string): Promise<{ userId: string } | null> {
    const tokenHash = hashRefreshToken(token);
    const doc = await RefreshTokenModel.findOneAndUpdate(
      { token: tokenHash, isRevoked: false, expiresAt: { $gt: new Date() } },
      { $set: { isRevoked: true } },
    );

    if (!doc) return null;
    return { userId: doc.userId.toString() };
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const tokenHash = hashRefreshToken(token);
    await RefreshTokenModel.findOneAndUpdate({ token: tokenHash }, { $set: { isRevoked: true } });
  }

  async createOAuthCode(userId: string): Promise<string> {
    const code = crypto.randomBytes(32).toString('hex');
    const redis = getRedis();
    await redis.set(`oauth_code:${code}`, userId, 'EX', OAUTH_CODE_TTL_SECONDS);
    return code;
  }

  async exchangeOAuthCode(code: string): Promise<{ userId: string } | null> {
    const redis = getRedis();
    const key = `oauth_code:${code}`;
    const userId = (await redis.eval(
      "local v=redis.call('GET', KEYS[1]); if v then redis.call('DEL', KEYS[1]); end; return v",
      1,
      key,
    )) as string | null;
    if (!userId) return null;
    return { userId };
  }
}

export const authService = new AuthService();
