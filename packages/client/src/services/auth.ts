let accessToken: string | null = null;
let authInitialized = false;
let refreshInFlight: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function isAuthenticated(): boolean {
  return Boolean(accessToken);
}

export function isAuthInitialized(): boolean {
  return authInitialized;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
  authInitialized = true;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        accessToken = null;
        return null;
      }
      const data = (await res.json()) as { accessToken?: string };
      accessToken = data.accessToken ?? null;
      return accessToken;
    } catch {
      accessToken = null;
      return null;
    } finally {
      authInitialized = true;
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function initializeAuth(): Promise<void> {
  if (authInitialized && accessToken) return;
  await refreshAccessToken();
}

export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // best effort
  } finally {
    clearAccessToken();
  }
}
