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

/** Deep link that hands the one-time code back to the desktop app. */
export const DESKTOP_AUTH_REDIRECT = 'applyspace://auth/callback';

/**
 * Where Supabase sends the system browser after sign-in (must be in its redirect
 * allow-list). Browsers refuse to launch an app from a redirect the user did not
 * click, so this page asks for one click and then opens `DESKTOP_AUTH_REDIRECT`.
 */
export const DESKTOP_AUTH_BRIDGE = 'https://applyspace.app/auth/desktop';

export function getDesktopBridge(): DesktopBridge | null {
  if (typeof window === 'undefined') return null;
  const bridge = (window as unknown as { apply?: Partial<DesktopBridge> }).apply;
  return bridge?.openExternal && bridge.getInfo && bridge.onAuthCallback && bridge.takeAuthCallback
    ? (bridge as DesktopBridge)
    : null;
}
