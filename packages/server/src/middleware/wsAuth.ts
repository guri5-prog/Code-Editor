import type { IncomingMessage } from 'http';
import { tokenService } from '../services/token.service.js';
import { env } from '../config/env.js';
import type { AuthPayload } from '@code-editor/shared';

export function authenticateWsUpgrade(req: IncomingMessage): AuthPayload | null {
  const cookieToken = extractCookieToken(req.headers.cookie, 'accessToken');
  const protocolToken = extractProtocolToken(req.headers['sec-websocket-protocol']);
  const token = cookieToken ?? protocolToken;

  if (!token) return null;

  try {
    return tokenService.verifyAccessToken(token);
  } catch {
    return null;
  }
}

function extractCookieToken(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (rawKey !== name) continue;
    const value = rawValue.join('=').trim();
    return value || null;
  }
  return null;
}

function extractProtocolToken(protocolHeader: string | string[] | undefined): string | null {
  if (!protocolHeader) return null;
  const value = Array.isArray(protocolHeader) ? protocolHeader.join(',') : protocolHeader;
  const protocols = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  for (const protocol of protocols) {
    if (!protocol.startsWith('access-token.')) continue;
    const token = protocol.slice('access-token.'.length);
    if (token) return token;
  }
  return null;
}

export function validateWsOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return false;

  try {
    const allowed = new URL(env.CLIENT_URL);
    const incoming = new URL(origin);
    return incoming.origin === allowed.origin;
  } catch {
    return false;
  }
}

export class WsRateLimiter {
  private messageCount = 0;
  private windowStart = Date.now();

  constructor(
    private maxMessages: number,
    private windowMs: number,
  ) {}

  check(): boolean {
    const now = Date.now();
    if (now - this.windowStart > this.windowMs) {
      this.messageCount = 0;
      this.windowStart = now;
    }
    this.messageCount++;
    return this.messageCount <= this.maxMessages;
  }
}
