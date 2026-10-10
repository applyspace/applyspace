/**
 * Shared IPC surface between Electron main and the renderer (via preload's
 * contextBridge). Both sides import from this file, so channel names and
 * payload shapes cannot drift.
 *
 * Kept intentionally minimal in this scaffold — future plans (Integrations,
 * Scraper triggering, Cookies, etc.) will extend `Channel` and `ApplyApi`.
 */

export const Channel = {
  OpenExternal: 'apply:open-external',
  GetInfo:      'apply:get-info',
  /** Main -> renderer push: the OAuth deep link came back. */
  AuthCallback: 'apply:auth-callback',
  /** Renderer -> main: fetch a callback received before the renderer was listening. */
  TakeAuthCallback: 'apply:take-auth-callback',
  /** Renderer -> main: a new sign-in starts (or the user signed out); forget any callback still waiting. */
  AuthReset: 'apply:auth-reset',
  /** Renderer -> main: progress report for the auth log (stage and error names only, never codes). */
  AuthReport: 'apply:auth-report',
} as const;
export type Channel = (typeof Channel)[keyof typeof Channel];

/** Deep link scheme registered by the desktop app (OAuth return). */
export const AUTH_SCHEME = 'applyspace';

/**
 * What the main process forwards after validating `applyspace://auth/callback`.
 * Only the one-time `code` (or a bare failure flag) crosses the boundary, never the raw URL.
 */
export type AuthCallbackPayload = { code: string } | { error: true };

/** Steps of a desktop sign-in the renderer reports to the main-process auth log. */
export const AUTH_STAGES = [
  'sign-in-start',
  'open-browser-failed',
  'no-return-timeout',
  'callback-taken',
  'callback-invalid',
  'exchange-start',
  'exchange-ok',
  'exchange-error',
  'exchange-timeout',
] as const;
export type AuthStage = (typeof AUTH_STAGES)[number];

/** What the renderer may tell the auth log: a stage, and for failures an error name and HTTP status. */
export interface AuthReport {
  stage: AuthStage;
  errorName?: string;
  status?: number;
}

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

  /** Drop any callback still waiting in main. Call when a sign-in starts and on sign-out. */
  resetAuth: () => Promise<void>;

  /** Fire-and-forget progress report for the main-process auth log. */
  reportAuth: (report: AuthReport) => void;
}

declare global {
  interface Window {
    apply: ApplyApi;
  }
}

export {};
