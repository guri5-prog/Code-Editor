import { useEffect } from 'react';
import { normalizeShortcut } from '../utils/shortcuts';

interface ShortcutMap {
  [key: string]: () => void;
}

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta']);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const normalizedShortcuts: ShortcutMap = {};
    for (const [combo, action] of Object.entries(shortcuts)) {
      const normalized = normalizeShortcut(combo);
      if (!normalized) continue;
      if (!normalizedShortcuts[normalized]) {
        normalizedShortcuts[normalized] = action;
      }
    }

    function handler(e: KeyboardEvent) {
      if (MODIFIER_KEYS.has(e.key)) return;

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      parts.push(e.key.toUpperCase());

      const combo = normalizeShortcut(parts.join('+'));
      if (!combo) return;
      const action = normalizedShortcuts[combo];
      if (action) {
        if (isEditableTarget(e.target) && !e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        action();
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
