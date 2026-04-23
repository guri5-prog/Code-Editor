import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  console.error(`[${statusCode}] ${err.message}`);

  const response: Record<string, unknown> = {
    error: {
      code: statusCode,
      message: statusCode === 500 ? 'Internal server error' : err.message,
    },
  };

  if (env.NODE_ENV === 'development' && statusCode === 500) {
    (response.error as Record<string, unknown>).stack = err.stack;
  }

  res.status(statusCode).json(response);
}
