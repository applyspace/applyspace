/**
 * Bridge to the Electron shell (`window.apply`, exposed by apps/desktop preload).
 * Mirrors the subset of apps/desktop/src/shared/ipc.ts used by the web app;
 * absent in a regular browser.
 */
export type DesktopAuthCallback = { code: string } | { error: true };

export interface DesktopBridge {
  openExternal: (url: string) => Promise<void>;
  getInfo: () => Promise<{ packaged: boolean; platform: string }>;
  onAuthCallback: (listener: (payload: DesktopAuthCallback) => void) => () => void;
  takeAuthCallback: () => Promise<DesktopAuthCallback | null>;
}

/** Deep link Supabase sends the browser back to after sign-in (must be in its redirect allow-list). */
export const DESKTOP_AUTH_REDIRECT = 'applyspace://auth/callback';

export function getDesktopBridge(): DesktopBridge | null {
  if (typeof window === 'undefined') return null;
  const bridge = (window as unknown as { apply?: Partial<DesktopBridge> }).apply;
  return bridge?.openExternal && bridge.getInfo && bridge.onAuthCallback && bridge.takeAuthCallback
    ? (bridge as DesktopBridge)
    : null;
}
