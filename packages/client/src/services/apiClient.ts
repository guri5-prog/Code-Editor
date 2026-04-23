import { getAccessToken, refreshAccessToken } from './auth';
import { getApiUrl } from '../config/runtime';

export async function apiFetch<T>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const request = async (): Promise<Response> => {
    const token = getAccessToken();
    const headers = new Headers(init.headers ?? {});
    if (!headers.has('Content-Type') && init.body) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const resolvedInput =
      typeof input === 'string' ? getApiUrl(input) : input instanceof URL ? getApiUrl(input.toString()) : input;
    return fetch(resolvedInput, { ...init, headers, credentials: 'include' });
  };

  let res = await request();
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await request();
    }
  }

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;
  if (!res.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as { error?: { message?: unknown } }).error?.message === 'string'
        ? (data as { error: { message: string } }).error.message
        : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}
