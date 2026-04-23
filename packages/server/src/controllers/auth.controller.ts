import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import {
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_TOKEN_MAX_AGE_MS,
  tokenService,
} from '../services/token.service.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: REFRESH_TOKEN_MAX_AGE_MS,
};

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: ACCESS_TOKEN_MAX_AGE_MS,
};

const OAUTH_STATE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 5 * 60 * 1000,
};

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.register(req.body);
    const { accessToken, refreshToken } = await tokenService.generateTokenPair(user);
    res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(201).json({ user, accessToken });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.login(req.body);
    const { accessToken, refreshToken } = await tokenService.generateTokenPair(user);
    res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ user, accessToken });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const oldToken = req.cookies?.refreshToken as string | undefined;
    if (!oldToken) {
      throw new AppError(401, 'No refresh token provided');
    }

    const result = await authService.verifyAndRevokeRefreshToken(oldToken);
    if (!result) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    const user = await authService.getUserById(result.userId);
    if (!user) {
      throw new AppError(401, 'User not found');
    }

    const { accessToken, refreshToken } = await tokenService.generateTokenPair(user);
    res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (token) {
      await authService.revokeRefreshToken(token);
    }
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

export function oauthStart(req: Request, res: Response, next: NextFunction): void {
  const state = crypto.randomBytes(32).toString('hex');
  res.cookie('oauth_state', state, OAUTH_STATE_COOKIE_OPTIONS);
  (req as unknown as Record<string, unknown>).oauthState = state;
  next();
}

export async function oauthCallback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stateFromQuery = req.query.state as string | undefined;
    const stateFromCookie = req.cookies?.oauth_state as string | undefined;

    res.clearCookie('oauth_state', { path: '/api/auth' });

    if (!stateFromQuery || !stateFromCookie) {
      throw new AppError(403, 'Invalid OAuth state');
    }
    const queryStateBuffer = Buffer.from(stateFromQuery);
    const cookieStateBuffer = Buffer.from(stateFromCookie);
    if (
      queryStateBuffer.length !== cookieStateBuffer.length ||
      !crypto.timingSafeEqual(queryStateBuffer, cookieStateBuffer)
    ) {
      throw new AppError(403, 'Invalid OAuth state');
    }

    const passportUser = req.user;
    if (!passportUser) {
      throw new AppError(401, 'OAuth authentication failed');
    }

    const user = await authService.getUserById(passportUser.id);
    if (!user) {
      throw new AppError(401, 'User not found after OAuth');
    }

    const code = await authService.createOAuthCode(user.id);
    res.redirect(`${env.CLIENT_URL}/login?code=${code}`);
  } catch (err) {
    next(err);
  }
}

export async function exchangeCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code } = req.body as { code?: string };
    if (!code || typeof code !== 'string') {
      throw new AppError(400, 'Authorization code is required');
    }

    const result = await authService.exchangeOAuthCode(code);
    if (!result) {
      throw new AppError(401, 'Invalid or expired authorization code');
    }

    const user = await authService.getUserById(result.userId);
    if (!user) {
      throw new AppError(401, 'User not found');
    }

    const { accessToken, refreshToken } = await tokenService.generateTokenPair(user);
    res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ user, accessToken });
  } catch (err) {
    next(err);
  }
}
