import type { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import { ReplSession } from '../services/execution/replSession.js';
import { isExecutableLanguage } from '../config/execution.js';
import type { ReplClientMessage, ReplServerMessage } from '@code-editor/shared';
import { authenticateWsUpgrade, validateWsOrigin, WsRateLimiter } from '../middleware/wsAuth.js';

const REPL_LANGUAGES = ['python', 'javascript'];
const MAX_MESSAGES_PER_WINDOW = 60;
const RATE_WINDOW_MS = 60_000;

function send(ws: WebSocket, msg: ReplServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function setupReplWebSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '', `http://${req.headers.host}`);

    if (url.pathname !== '/ws/repl') {
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

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url ?? '', `http://${req.headers.host}`);
    const language = url.searchParams.get('language') ?? '';

    if (!REPL_LANGUAGES.includes(language) || !isExecutableLanguage(language)) {
      send(ws, { type: 'error', message: `Unsupported REPL language: ${language}` });
      ws.close();
      return;
    }

    const limiter = new WsRateLimiter(MAX_MESSAGES_PER_WINDOW, RATE_WINDOW_MS);

    const session = new ReplSession(language, () => {
      send(ws, { type: 'error', message: 'Session expired due to inactivity' });
      ws.close();
    });

    send(ws, { type: 'ready', language });

    ws.on('message', async (data) => {
      if (!limiter.check()) {
        send(ws, { type: 'error', message: 'Rate limit exceeded' });
        return;
      }

      let msg: ReplClientMessage;
      try {
        const raw = data.toString();
        if (raw.length > 200_000) {
          send(ws, { type: 'error', message: 'Message too large' });
          return;
        }
        msg = JSON.parse(raw) as ReplClientMessage;
      } catch {
        send(ws, { type: 'error', message: 'Invalid message format' });
        return;
      }

      if (msg.type === 'reset') {
        session.reset();
        send(ws, { type: 'ready', language });
        return;
      }

      if (msg.type === 'eval') {
        if (!msg.code || msg.code.length > 65_536) {
          send(ws, { type: 'error', message: 'Code too large' });
          return;
        }

        const { stdout, stderr } = await session.evaluate(msg.code);
        send(ws, { type: 'result', stdout, stderr });
      }
    });

    ws.on('close', () => {
      session.dispose();
    });

    ws.on('error', () => {
      session.dispose();
    });
  });
}
