const MAX_NAME_LENGTH = 255;
const INVALID_CHARS = /[<>:"/\\|?*]/;
const ONLY_DOTS = /^\.+$/;

export function validateFileName(
  name: string,
  existingNames: string[],
  currentName?: string,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'File name is required';
  if (trimmed.length > MAX_NAME_LENGTH)
    return `File name must be ${MAX_NAME_LENGTH} characters or fewer`;
  if (INVALID_CHARS.test(trimmed)) return 'File name contains invalid characters';
  if (ONLY_DOTS.test(trimmed)) return 'File name cannot be only dots';
  if (trimmed.startsWith('.') || trimmed.endsWith('.'))
    return 'File name cannot start or end with a dot';
  if (trimmed !== trimmed.replace(/\s+$/, '')) return 'File name cannot end with whitespace';
  if (trimmed !== currentName && existingNames.includes(trimmed))
    return 'A file with this name already exists';
  return null;
}
