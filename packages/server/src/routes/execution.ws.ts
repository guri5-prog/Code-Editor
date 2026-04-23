import type { Server as HttpServer } from 'http';
import { URL } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import type { ExecutionClientMessage, ExecutionServerMessage } from '@code-editor/shared';
import { startInteractiveExecution } from '../services/execution/interactiveExecutor.js';
import { authenticateWsUpgrade, validateWsOrigin, WsRateLimiter } from '../middleware/wsAuth.js';

const MAX_MESSAGES_PER_WINDOW = 30;
const RATE_WINDOW_MS = 60_000;

function send(ws: WebSocket, message: ExecutionServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export function setupExecutionWebSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '', `http://${req.headers.host}`);

    if (url.pathname !== '/ws/execute') {
      return;
    }

    if (!validateWsOrigin(req)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    const auth = authenticateWsUpgrade(req);
    if (!auth) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws) => {
    let run: Awaited<ReturnType<typeof startInteractiveExecution>> | null = null;
    let started = false;
    const pendingStdin: string[] = [];
    const limiter = new WsRateLimiter(MAX_MESSAGES_PER_WINDOW, RATE_WINDOW_MS);

    ws.on('message', async (data) => {
      if (!limiter.check()) {
        send(ws, { type: 'error', message: 'Rate limit exceeded' });
        return;
      }

      let message: ExecutionClientMessage;
      try {
        const raw = data.toString();
        if (raw.length > 200_000) {
          send(ws, { type: 'error', message: 'Message too large' });
          return;
        }
        message = JSON.parse(raw) as ExecutionClientMessage;
      } catch {
        send(ws, { type: 'error', message: 'Invalid message format' });
        return;
      }

      if (message.type === 'stdin') {
        if (message.data && message.data.length > 65_536) {
          send(ws, { type: 'error', message: 'Stdin data too large' });
          return;
        }
        if (run) run.writeStdin(message.data);
        else pendingStdin.push(message.data);
        return;
      }

      if (message.type === 'stop') {
        run?.stop();
        return;
      }

      if (message.type !== 'start') return;
      if (started) {
        send(ws, { type: 'error', message: 'Execution already started' });
        return;
      }
      started = true;

      try {
        send(ws, { type: 'started' });
        run = await startInteractiveExecution({
          language: message.language,
          code: message.code,
          stdin: message.stdin,
          args: message.args,
          onStdout: (chunk) => send(ws, { type: 'output', stream: 'stdout', data: chunk }),
          onStderr: (chunk) => send(ws, { type: 'output', stream: 'stderr', data: chunk }),
        });
        for (const chunk of pendingStdin.splice(0)) {
          run.writeStdin(chunk);
        }
        const result = await run.done;
        send(ws, { type: 'exit', result });
        ws.close();
      } catch (err) {
        send(ws, {
          type: 'error',
          message: err instanceof Error ? err.message : 'Execution failed',
        });
        ws.close();
      }
    });

    ws.on('close', () => {
      run?.stop();
    });
  });
}
