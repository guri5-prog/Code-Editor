import type { Request, Response, NextFunction } from 'express';
import { templateService } from '../services/template.service.js';
import { AppError } from '../middleware/errorHandler.js';

function requireUserId(req: Request): string {
  const userId = req.authPayload?.userId;
  if (!userId) throw new AppError(401, 'Unauthorized');
  return userId;
}

export async function listTemplates(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const templates = await templateService.listTemplates();
    res.json({ templates });
  } catch (err) {
    next(err);
  }
}

export async function createTemplate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const template = await templateService.createTemplate(userId, req.body);
    res.status(201).json({ template });
  } catch (err) {
    next(err);
  }
}
