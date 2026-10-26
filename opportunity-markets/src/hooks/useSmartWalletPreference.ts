import * as React from 'react';

const STORAGE_KEY = 'seer-opportunity:useSmartWallet';
const CHANGE_EVENT = 'seer-opportunity:smart-wallet-change';

// Fallback when storage is blocked, so the switch still works for the page.
let memoryValue = true;

function read(): boolean {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? memoryValue : stored !== 'false';
  } catch {
    return memoryValue;
  }
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * Whether trades may batch through the wallet's smart account (EIP-7702).
 * On by default; the choice is kept per browser.
 */
export function useSmartWalletPreference(): [boolean, (value: boolean) => void] {
  const enabled = React.useSyncExternalStore(subscribe, read, () => true);

  const setEnabled = React.useCallback((value: boolean) => {
    memoryValue = value;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Storage blocked: the choice lasts for this page only.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [enabled, setEnabled];
}
