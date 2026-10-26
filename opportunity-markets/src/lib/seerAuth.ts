const ACCESS_TOKEN_KEY = 'seer-access-token';

export function getSeerAppUrl(): string {
  const fromEnv = import.meta.env.VITE_SEER_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return 'https://app.seer.pm';
}

export function isAccessTokenExpired(accessToken: string): boolean {
  if (!accessToken) return true;
  try {
    const [, payload] = accessToken.split('.');
    const decodedPayload = JSON.parse(atob(payload)) as { exp?: number };
    if (!decodedPayload.exp) return true;
    return Date.now() > decodedPayload.exp * 1000;
  } catch {
    return true;
  }
}

export function readStoredAccessToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function writeStoredAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
    else localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // ignore quota / private mode
  }
}
