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
} as const;
export type Channel = (typeof Channel)[keyof typeof Channel];

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
}

declare global {
  interface Window {
    apply: ApplyApi;
  }
}

export {};
