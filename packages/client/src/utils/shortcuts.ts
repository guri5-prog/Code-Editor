const MODIFIER_ALIASES: Record<string, 'Ctrl' | 'Shift' | 'Alt'> = {
  ctrl: 'Ctrl',
  control: 'Ctrl',
  cmd: 'Ctrl',
  command: 'Ctrl',
  meta: 'Ctrl',
  shift: 'Shift',
  alt: 'Alt',
  option: 'Alt',
};

const KEY_ALIASES: Record<string, string> = {
  return: 'ENTER',
  enter: 'ENTER',
  esc: 'ESCAPE',
  space: 'SPACE',
  spacebar: 'SPACE',
  del: 'DELETE',
};

function normalizeKeyToken(token: string): string {
  const lowered = token.trim().toLowerCase();
  if (!lowered) return '';
  if (KEY_ALIASES[lowered]) return KEY_ALIASES[lowered];
  return lowered.toUpperCase();
}

export function normalizeShortcut(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  const tokens = raw
    .split('+')
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return null;

  const mods = new Set<'Ctrl' | 'Shift' | 'Alt'>();
  let key = '';

  for (const token of tokens) {
    const lowered = token.toLowerCase();
    const mod = MODIFIER_ALIASES[lowered];
    if (mod) {
      mods.add(mod);
      continue;
    }
    key = normalizeKeyToken(token);
  }

  if (!key) return null;

  const orderedMods: string[] = [];
  if (mods.has('Ctrl')) orderedMods.push('Ctrl');
  if (mods.has('Shift')) orderedMods.push('Shift');
  if (mods.has('Alt')) orderedMods.push('Alt');
  orderedMods.push(key);
  return orderedMods.join('+');
}

export function hasShortcutConflicts(shortcuts: string[]): boolean {
  const normalized = shortcuts
    .map((value) => normalizeShortcut(value))
    .filter((value): value is string => Boolean(value));
  return new Set(normalized).size !== normalized.length;
}

export function formatShortcutLabel(shortcut: string): string {
  const normalized = normalizeShortcut(shortcut);
  if (!normalized) return shortcut;
  return normalized
    .split('+')
    .map((token) => {
      if (token === 'ENTER') return 'Enter';
      if (token === 'ESCAPE') return 'Esc';
      if (token === 'SPACE') return 'Space';
      return token.length === 1 ? token.toUpperCase() : token;
    })
    .join('+');
}
