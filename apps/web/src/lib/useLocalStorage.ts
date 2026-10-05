'use client';

import { useCallback, useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener('storage', callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * A localStorage entry as React state. `null` on the server and during
 * hydration, then the stored value, so server and client markup match.
 */
export function useLocalStorageItem(key: string): [string | null, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  const save = useCallback(
    (next: string) => {
      try {
        localStorage.setItem(key, next);
      } catch {
        // Storage unavailable (private mode): the value is simply not kept.
      }
      listeners.forEach((listener) => listener());
    },
    [key],
  );
  return [value, save];
}
