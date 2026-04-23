import type { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/token.service.js';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const tokenFromHeader = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const tokenFromCookie = (req.cookies?.accessToken as string | undefined) ?? null;
  const token = tokenFromHeader || tokenFromCookie;
  if (!token) {
    res.status(401).json({ error: { code: 401, message: 'Unauthorized' } });
    return;
  }

  try {
    req.authPayload = tokenService.verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: { code: 401, message: 'Invalid or expired token' } });
  }
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const tokenFromHeader = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const tokenFromCookie = (req.cookies?.accessToken as string | undefined) ?? null;
  const token = tokenFromHeader || tokenFromCookie;
  if (!token) {
    next();
    return;
  }

  try {
    req.authPayload = tokenService.verifyAccessToken(token);
  } catch {
    // Leave the request unauthenticated; route-level auth can still require a user where needed.
  }

  next();
}
