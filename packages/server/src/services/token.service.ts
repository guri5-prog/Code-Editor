import jwt, { type SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import type { AuthPayload, User } from '@code-editor/shared';
import { env } from '../config/env.js';
import { authService } from './auth.service.js';

function parseDurationMs(input: string, fallbackMs: number): number {
  const trimmed = input.trim();
  const match = /^(\d+)\s*([smhd])$/i.exec(trimmed);
  if (!match) return fallbackMs;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return fallbackMs;
  const unit = match[2].toLowerCase();
  const unitMs =
    unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return value * unitMs;
}

export const ACCESS_TOKEN_MAX_AGE_MS = parseDurationMs(env.JWT_ACCESS_EXPIRY, 15 * 60_000);
export const REFRESH_TOKEN_MAX_AGE_MS = parseDurationMs(env.JWT_REFRESH_EXPIRY, 7 * 86_400_000);

class TokenService {
  generateAccessToken(payload: AuthPayload): string {
    const options: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRY as SignOptions['expiresIn'] };
    return jwt.sign({ ...payload }, env.JWT_SECRET, options);
  }

  generateRefreshToken(): string {
    return uuidv4();
  }

  verifyAccessToken(token: string): AuthPayload {
    return jwt.verify(token, env.JWT_SECRET) as AuthPayload;
  }

  async generateTokenPair(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: AuthPayload = { userId: user.id, email: user.email };
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken();

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);
    await authService.storeRefreshToken(refreshToken, user.id, expiresAt);

    return { accessToken, refreshToken };
  }
}

export const tokenService = new TokenService();
