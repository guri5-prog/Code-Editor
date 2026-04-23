import type { CollabRoom } from './roomManager.js';
import type { CollabUser } from '@code-editor/shared';

const USER_COLORS = [
  '#e06c75',
  '#61afef',
  '#98c379',
  '#e5c07b',
  '#c678dd',
  '#56b6c2',
  '#d19a66',
  '#be5046',
  '#7ec699',
  '#e6db74',
  '#f92672',
  '#66d9ef',
  '#a6e22e',
  '#fd971f',
  '#ae81ff',
  '#a1efe4',
];

let colorIndex = 0;
const userColorMap = new Map<string, string>();

export function assignColor(userId: string): string {
  const existing = userColorMap.get(userId);
  if (existing) return existing;

  const color = USER_COLORS[colorIndex % USER_COLORS.length];
  colorIndex++;
  userColorMap.set(userId, color);
  return color;
}

export function getConnectedUsers(room: CollabRoom): CollabUser[] {
  const users: CollabUser[] = [];
  const seen = new Set<string>();

  for (const conn of room.connections.values()) {
    if (seen.has(conn.userId)) continue;
    seen.add(conn.userId);

    users.push({
      userId: conn.userId,
      displayName: conn.displayName,
      color: conn.color,
    });
  }

  return users;
}
