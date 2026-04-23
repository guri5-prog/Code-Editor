function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function joinUrl(base: string, path: string): string {
  return `${trimTrailingSlash(base)}${path.startsWith('/') ? path : `/${path}`}`;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
  ? trimTrailingSlash(import.meta.env.VITE_API_BASE_URL)
  : '';

const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL?.trim()
  ? trimTrailingSlash(import.meta.env.VITE_WS_BASE_URL)
  : '';

export function getApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  if (!apiBaseUrl) {
    return path;
  }
  return joinUrl(apiBaseUrl, path);
}

export function getWebSocketUrl(path: string): string {
  if (/^wss?:\/\//.test(path)) {
    return path;
  }
  if (wsBaseUrl) {
    return joinUrl(wsBaseUrl, path);
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path.startsWith('/') ? path : `/${path}`}`;
}
