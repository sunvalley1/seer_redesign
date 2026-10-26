import { useCallback, useSyncExternalStore } from 'react';
import {
  isAccessTokenExpired,
  readStoredAccessToken,
  writeStoredAccessToken,
} from '../lib/seerAuth';

let accessToken = readStoredAccessToken();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return accessToken;
}

function getServerSnapshot() {
  return '';
}

export function getAccessToken(): string {
  return accessToken;
}

export function setAccessToken(token: string) {
  accessToken = token;
  writeStoredAccessToken(token);
  emit();
}

export function useAccessToken() {
  const token = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setToken = useCallback((next: string) => setAccessToken(next), []);
  return [token, setToken] as const;
}

export function useIsSignedIn() {
  const [token] = useAccessToken();
  return !isAccessTokenExpired(token);
}
