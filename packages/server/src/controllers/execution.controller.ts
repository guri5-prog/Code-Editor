import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { executeCode } from '../services/execution/executor.js';

type ExecutionEvent =
  | { type: 'started' }
  | { type: 'result'; result: Awaited<ReturnType<typeof executeCode>> }
  | { type: 'error'; message: string; statusCode: number };

export async function execute(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { language, code, stdin, args } = req.body as {
      language: string;
      code: string;
      stdin: string;
      args: string[];
    };

    if (acceptsEventStream(req)) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      writeEvent(res, { type: 'started' });

      try {
        const result = await executeCode(language, code, stdin, args);
        writeEvent(res, { type: 'result', result });
      } catch (err) {
        const statusCode = err instanceof AppError ? err.statusCode : 500;
        const message =
          err instanceof AppError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Execution failed';
        writeEvent(res, { type: 'error', message, statusCode });
      } finally {
        res.end();
      }
      return;
    }

    const result = await executeCode(language, code, stdin, args);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

function acceptsEventStream(req: Request): boolean {
  return req.accepts(['text/event-stream', 'application/json']) === 'text/event-stream';
}

function writeEvent(res: Response, event: ExecutionEvent): void {
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}
