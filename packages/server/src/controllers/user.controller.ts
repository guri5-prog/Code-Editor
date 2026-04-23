import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { settingsService } from '../services/settings.service.js';

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authPayload) {
      throw new AppError(401, 'Unauthorized');
    }

    const user = await authService.getUserById(req.authPayload.userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function getMySettings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.authPayload) {
      throw new AppError(401, 'Unauthorized');
    }

    const settings = await settingsService.getSettings(req.authPayload.userId);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

export async function updateMySettings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.authPayload) {
      throw new AppError(401, 'Unauthorized');
    }
    const settings = await settingsService.updateSettings(req.authPayload.userId, req.body);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}
