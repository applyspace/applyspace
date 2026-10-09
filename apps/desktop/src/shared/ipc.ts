/**
 * Shared IPC surface between Electron main and the renderer (via preload's
 * contextBridge). Both sides import from this file, so channel names and
 * payload shapes cannot drift.
 *
 * Kept intentionally minimal in this scaffold — future plans (Integrations,
 * Scraper triggering, Cookies, etc.) will extend `Channel` and `ApplyApi`.
 */

export const Channel = {
  GetDbPath:    'apply:get-db-path',
  OpenExternal: 'apply:open-external',
  GetInfo:      'apply:get-info',
  /** Main -> renderer push: the OAuth deep link came back. */
  AuthCallback: 'apply:auth-callback',
  /** Renderer -> main: fetch a callback received before the renderer was listening. */
  TakeAuthCallback: 'apply:take-auth-callback',
} as const;
export type Channel = (typeof Channel)[keyof typeof Channel];

/** Deep link scheme registered by the desktop app (OAuth return). */
export const AUTH_SCHEME = 'applyspace';

/**
 * What the main process forwards after validating `applyspace://auth/callback`.
 * Only the one-time `code` (or a bare failure flag) crosses the boundary, never the raw URL.
 */
export type AuthCallbackPayload = { code: string } | { error: true };

export interface DesktopInfo {
  /** False in dev: the `applyspace://` scheme is not reliably registered there. */
  packaged: boolean;
  platform: string;
}

/**
 * The API surface exposed on `window.apply` by the preload script.
 * Every method returns a Promise because it is dispatched via `ipcRenderer.invoke`.
 */
export interface ApplyApi {
  /** Absolute path to the SQLite file — useful for an "About" / debug panel. */
  getDbPath: () => Promise<string>;

  /**
   * Open a URL in the user's system browser. Use this instead of `<a target="_blank">`
   * or `window.open` — in Electron those either no-op or spawn a new BrowserWindow
   * we don't want.
   */
  openExternal: (url: string) => Promise<void>;

  getInfo: () => Promise<DesktopInfo>;

  /** Subscribe to the OAuth return. Returns an unsubscribe function. */
  onAuthCallback: (listener: (payload: AuthCallbackPayload) => void) => () => void;

  /** Returns (and clears) a callback that arrived before the renderer was listening. */
  takeAuthCallback: () => Promise<AuthCallbackPayload | null>;
}

declare global {
  interface Window {
    apply: ApplyApi;
  }
}

export {};
