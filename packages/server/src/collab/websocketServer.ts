import type { Server as HttpServer, IncomingMessage } from 'http';
import { URL } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import { authenticateWsUpgrade, validateWsOrigin, WsRateLimiter } from '../middleware/wsAuth.js';
import { ProjectModel } from '../models/Project.model.js';
import { FileModel } from '../models/File.model.js';
import { UserModel } from '../models/User.model.js';
import { getOrCreateRoom, type CollabConnection } from './roomManager.js';
import { assignColor } from './awareness.js';
import mongoose from 'mongoose';

const COLLAB_PATH_RE = /^\/ws\/collab\/([a-f0-9]{24})\/([a-f0-9]{24})$/;
const MAX_MESSAGES_PER_WINDOW = 120;
const RATE_WINDOW_MS = 60_000;
const MAX_BINARY_SIZE = 1_048_576; // 1MB

type Permission = 'edit' | 'view' | 'execute';

async function resolvePermission(projectId: string, userId: string): Promise<Permission | null> {
  if (!mongoose.Types.ObjectId.isValid(projectId)) return null;

  const project = await ProjectModel.findById(projectId)
    .select('ownerId isPublic collaborators')
    .lean();
  if (!project) return null;

  if (project.ownerId.toString() === userId) return 'edit';

  const collab = project.collaborators?.find((c) => c.userId.toString() === userId);
  if (collab) return collab.permission;

  if (project.isPublic) return 'view';

  return null;
}

export function setupCollabWebSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url ?? '', `http://${req.headers.host}`);
    const match = url.pathname.match(COLLAB_PATH_RE);
    if (!match) return; // Not a collab path — let other handlers pick it up

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

    const projectId = match[1];
    const fileId = match[2];

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, { projectId, fileId, auth });
    });
  });

  wss.on(
    'connection',
    async (
      ws: WebSocket,
      _req: IncomingMessage,
      ctx: { projectId: string; fileId: string; auth: { userId: string; email: string } },
    ) => {
      const { projectId, fileId, auth } = ctx;
      const limiter = new WsRateLimiter(MAX_MESSAGES_PER_WINDOW, RATE_WINDOW_MS);

      const permission = await resolvePermission(projectId, auth.userId);
      if (!permission) {
        ws.close(4403, 'Forbidden');
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(fileId)) {
        ws.close(4400, 'Invalid file ID');
        return;
      }

      const file = await FileModel.findById(fileId).select('projectId').lean();
      if (!file || file.projectId.toString() !== projectId) {
        ws.close(4404, 'File not found');
        return;
      }

      let displayName = auth.email;
      try {
        const user = await UserModel.findById(auth.userId).select('displayName').lean();
        if (user?.displayName) displayName = user.displayName;
      } catch {
        // Use email as fallback
      }

      let room;
      try {
        room = await getOrCreateRoom(projectId, fileId);
      } catch (err) {
        console.error('Failed to create collab room:', err);
        ws.close(4500, 'Room creation failed');
        return;
      }

      const conn: CollabConnection = {
        ws,
        userId: auth.userId,
        displayName,
        color: assignColor(auth.userId),
        permission,
      };

      room.addConnection(conn);

      ws.on('message', (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
        if (!limiter.check()) return;

        if (isBinary) {
          const bytes =
            data instanceof Buffer
              ? new Uint8Array(data)
              : data instanceof ArrayBuffer
                ? new Uint8Array(data)
                : new Uint8Array(Buffer.concat(data as Buffer[]));

          if (bytes.byteLength > MAX_BINARY_SIZE) return;

          if (permission !== 'edit') {
            // Non-edit users can send awareness but not sync updates.
            if (bytes.length > 0 && bytes[0] === 0) return; // Block sync messages
          }

          room.handleMessage(ws, bytes);
        } else {
          // Text frames are used for chat
          try {
            const raw = data.toString();
            if (raw.length > 2000) return;
            const msg = JSON.parse(raw) as { type: string; content?: string };
            if (msg.type === 'chat' && typeof msg.content === 'string' && msg.content.trim()) {
              room.handleChat(ws, { content: msg.content.trim() });
            }
          } catch {
            // Ignore malformed text messages
          }
        }
      });

      ws.on('close', () => {
        room.removeConnection(ws);
      });

      ws.on('error', () => {
        room.removeConnection(ws);
      });
    },
  );
}
