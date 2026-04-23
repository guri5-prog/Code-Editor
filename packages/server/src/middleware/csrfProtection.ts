import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATING_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.get('Origin') || extractOriginFromReferer(req.get('Referer'));

  if (!origin) {
    res.status(403).json({ error: { code: 403, message: 'Forbidden: missing origin' } });
    return;
  }

  try {
    const url = new URL(origin);
    const allowed = new URL(env.CLIENT_URL);
    const server = new URL(env.SERVER_URL);

    if (url.origin === allowed.origin || url.origin === server.origin) {
      next();
      return;
    }
  } catch {
    // malformed URL — reject
  }

  res.status(403).json({ error: { code: 403, message: 'Forbidden: invalid origin' } });
}

function extractOriginFromReferer(referer: string | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    const url = new URL(referer);
    return url.origin;
  } catch {
    return undefined;
  }
}
