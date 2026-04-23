const MAX_PATH_LENGTH = 255;
// eslint-disable-next-line no-control-regex
const INVALID_CHARS = /[<>:"|?*\x00-\x1f]/;

function normalize(path: string): string {
  return path
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '');
}

export function validateFilePath(
  path: string,
  existingPaths: string[],
  currentPath?: string,
): string | null {
  const trimmed = normalize(path.trim());
  if (!trimmed) return 'File path is required';
  if (trimmed.length > MAX_PATH_LENGTH)
    return `Path must be ${MAX_PATH_LENGTH} characters or fewer`;
  if (trimmed.includes('..')) return 'Path traversal is not allowed';
  if (INVALID_CHARS.test(trimmed)) return 'Path contains invalid characters';

  const segments = trimmed.split('/');
  if (segments.some((segment) => !segment.trim())) return 'Path contains empty segments';
  if (segments.some((segment) => segment === '.' || segment === '..'))
    return 'Path contains invalid segments';

  const normalizedExisting = new Set(existingPaths.map((item) => normalize(item)));
  const normalizedCurrent = currentPath ? normalize(currentPath) : undefined;
  if (normalizedCurrent !== trimmed && normalizedExisting.has(trimmed)) {
    return 'A file with this path already exists';
  }
  return null;
}
