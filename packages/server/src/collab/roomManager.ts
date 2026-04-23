import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import type { WebSocket } from 'ws';
import { loadDocState, saveDocState } from './persistence.js';
import { FileModel } from '../models/File.model.js';
import { getRedis } from '../database/redis.js';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

const PERSIST_INTERVAL_MS = 30_000;
const CHAT_MAX_MESSAGES = 100;
const CHAT_TTL_SECONDS = 86_400; // 24 hours

export interface CollabConnection {
  ws: WebSocket;
  userId: string;
  displayName: string;
  color: string;
  permission: 'edit' | 'view' | 'execute';
}

export class CollabRoom {
  readonly name: string;
  readonly projectId: string;
  readonly fileId: string;
  readonly doc: Y.Doc;
  readonly awareness: awarenessProtocol.Awareness;
  readonly connections: Map<WebSocket, CollabConnection> = new Map();
  private awarenessClientIdsByWs: Map<WebSocket, Set<number>> = new Map();
  private persistTimer: ReturnType<typeof setInterval> | null = null;
  private dirty = false;
  private needsFileSync = false;

  constructor(name: string, projectId: string, fileId: string) {
    this.name = name;
    this.projectId = projectId;
    this.fileId = fileId;
    this.doc = new Y.Doc({ gc: true });
    this.awareness = new awarenessProtocol.Awareness(this.doc);

    this.doc.on('update', (update: Uint8Array, origin: unknown) => {
      this.dirty = true;
      this.needsFileSync = true;
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const msg = encoding.toUint8Array(encoder);
      this.broadcast(msg, origin as WebSocket | null);
    });

    this.awareness.on(
      'update',
      ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
        const changed = [...added, ...updated, ...removed];
        if (changed.length === 0) return;
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed),
        );
        const msg = encoding.toUint8Array(encoder);
        this.broadcast(msg, null);
      },
    );
  }

  async init(): Promise<void> {
    const saved = await loadDocState(this.name);
    if (saved) {
      Y.applyUpdate(this.doc, saved);
    } else {
      const file = await FileModel.findById(this.fileId).lean();
      if (file?.content) {
        const text = this.doc.getText('content');
        text.insert(0, file.content);
      }
    }
    this.dirty = false;
    this.persistTimer = setInterval(() => this.persistIfDirty(), PERSIST_INTERVAL_MS);
  }

  addConnection(conn: CollabConnection): void {
    this.connections.set(conn.ws, conn);
    this.awarenessClientIdsByWs.set(conn.ws, new Set());

    // Send sync step 1
    const syncEncoder = encoding.createEncoder();
    encoding.writeVarUint(syncEncoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(syncEncoder, this.doc);
    this.send(conn.ws, encoding.toUint8Array(syncEncoder));

    // Send current awareness states
    const states = this.awareness.getStates();
    if (states.size > 0) {
      const awEncoder = encoding.createEncoder();
      encoding.writeVarUint(awEncoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        awEncoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, Array.from(states.keys())),
      );
      this.send(conn.ws, encoding.toUint8Array(awEncoder));
    }

    this.sendChatHistory(conn.ws);
  }

  handleMessage(ws: WebSocket, data: Uint8Array): void {
    const conn = this.connections.get(ws);
    if (!conn) return;

    try {
      const decoder = decoding.createDecoder(data);
      const messageType = decoding.readVarUint(decoder);

      if (messageType === MESSAGE_SYNC) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        syncProtocol.readSyncMessage(decoder, encoder, this.doc, ws);
        if (encoding.length(encoder) > 1) {
          this.send(ws, encoding.toUint8Array(encoder));
        }
      } else if (messageType === MESSAGE_AWARENESS) {
        const update = decoding.readVarUint8Array(decoder);
        const clientIds = extractAwarenessClientIds(update);
        const knownClientIds = this.awarenessClientIdsByWs.get(ws);
        if (knownClientIds) {
          for (const clientId of clientIds) knownClientIds.add(clientId);
        }

        const trustedUpdate = awarenessProtocol.modifyAwarenessUpdate(
          update,
          (state: unknown): unknown => {
            if (!state || typeof state !== 'object') return state;
            return {
              ...(state as Record<string, unknown>),
              user: {
                userId: conn.userId,
                displayName: conn.displayName,
                color: conn.color,
              },
            };
          },
        );

        awarenessProtocol.applyAwarenessUpdate(this.awareness, trustedUpdate, ws);
      }
    } catch {
      // Ignore malformed messages
    }
  }

  async handleChat(ws: WebSocket, message: { content: string }): Promise<void> {
    const conn = this.connections.get(ws);
    if (!conn) return;

    const chatMsg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: conn.userId,
      displayName: conn.displayName,
      content: message.content.slice(0, 1000),
      timestamp: Date.now(),
    };

    try {
      const redis = getRedis();
      const key = `chat:${this.name}`;
      await redis.rpush(key, JSON.stringify(chatMsg));
      await redis.ltrim(key, -CHAT_MAX_MESSAGES, -1);
      await redis.expire(key, CHAT_TTL_SECONDS);
    } catch {
      // Redis unavailable — still broadcast to connected clients
    }

    const payload = JSON.stringify({ type: 'chat', message: chatMsg });
    for (const [clientWs] of this.connections) {
      if (clientWs.readyState === 1) {
        clientWs.send(payload);
      }
    }
  }

  removeConnection(ws: WebSocket): void {
    const conn = this.connections.get(ws);
    if (!conn) return;
    this.connections.delete(ws);
    const clientIds = this.awarenessClientIdsByWs.get(ws);
    this.awarenessClientIdsByWs.delete(ws);

    if (clientIds && clientIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(this.awareness, Array.from(clientIds), ws);
    }

    if (this.connections.size === 0) {
      this.close().catch(() => {});
    }
  }

  async close(): Promise<void> {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
    }
    await this.persist();

    if (this.needsFileSync) {
      // Sync content back to File model only when collaboration changed it.
      const text = this.doc.getText('content');
      const content = text.toString();
      try {
        await FileModel.findByIdAndUpdate(this.fileId, {
          content,
          $inc: { version: 1 },
        });
        this.needsFileSync = false;
      } catch {
        // Best-effort file sync
      }
    }

    this.awareness.destroy();
    this.doc.destroy();
    rooms.delete(this.name);
  }

  private async persist(): Promise<void> {
    if (!this.dirty) return;
    try {
      await saveDocState(this.name, this.doc);
      this.dirty = false;
    } catch (err) {
      console.error(`Failed to persist room ${this.name}:`, err);
    }
  }

  private persistIfDirty(): void {
    this.persist().catch(() => {});
  }

  private async sendChatHistory(ws: WebSocket): Promise<void> {
    try {
      const redis = getRedis();
      const key = `chat:${this.name}`;
      const raw = await redis.lrange(key, 0, -1);
      const messages = raw.map((r) => JSON.parse(r));
      if (messages.length > 0 && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'chat-history', messages }));
      }
    } catch {
      // Redis unavailable — no history to send
    }
  }

  private send(ws: WebSocket, msg: Uint8Array): void {
    if (ws.readyState === 1) {
      ws.send(msg);
    }
  }

  private broadcast(msg: Uint8Array, exclude: WebSocket | null): void {
    for (const [ws] of this.connections) {
      if (ws !== exclude && ws.readyState === 1) {
        ws.send(msg);
      }
    }
  }
}

function extractAwarenessClientIds(update: Uint8Array): number[] {
  const decoder = decoding.createDecoder(update);
  const count = decoding.readVarUint(decoder);
  const ids: number[] = [];

  for (let i = 0; i < count; i++) {
    ids.push(decoding.readVarUint(decoder));
    decoding.readVarUint(decoder); // clock
    decoding.readVarString(decoder); // state JSON
  }

  return ids;
}

const rooms = new Map<string, CollabRoom>();

export function getRoomName(projectId: string, fileId: string): string {
  return `${projectId}/${fileId}`;
}

export async function getOrCreateRoom(projectId: string, fileId: string): Promise<CollabRoom> {
  const name = getRoomName(projectId, fileId);
  const existing = rooms.get(name);
  if (existing) return existing;

  const room = new CollabRoom(name, projectId, fileId);
  rooms.set(name, room);
  await room.init();
  return room;
}

export function getRoom(projectId: string, fileId: string): CollabRoom | undefined {
  return rooms.get(getRoomName(projectId, fileId));
}

export function getActiveRooms(): Array<{ name: string; userCount: number }> {
  return Array.from(rooms.values()).map((r) => ({
    name: r.name,
    userCount: r.connections.size,
  }));
}
