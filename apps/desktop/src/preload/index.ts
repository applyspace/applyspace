import { contextBridge, ipcRenderer } from 'electron';

import { type ApplyApi, type AuthCallbackPayload, Channel, type DesktopInfo } from '../shared/ipc.js';

/**
 * Preload script — runs in an isolated world with access to a small subset of
 * Node/Electron APIs. Exposes a typed bridge on `window.apply`.
 *
 * The renderer (Next.js) never gets direct access to `ipcRenderer`; it sees
 * only the methods declared below, which matches the typed surface in
 * `shared/ipc.ts`.
 */

const api: ApplyApi = {
  getDbPath: () => ipcRenderer.invoke(Channel.GetDbPath) as Promise<string>,
  openExternal: (url: string) =>
    ipcRenderer.invoke(Channel.OpenExternal, url) as Promise<void>,
  getInfo: () => ipcRenderer.invoke(Channel.GetInfo) as Promise<DesktopInfo>,
  onAuthCallback: (listener) => {
    const handler = (_event: unknown, payload: AuthCallbackPayload) => listener(payload);
    ipcRenderer.on(Channel.AuthCallback, handler);
    return () => {
      ipcRenderer.removeListener(Channel.AuthCallback, handler);
    };
  },
  takeAuthCallback: () =>
    ipcRenderer.invoke(Channel.TakeAuthCallback) as Promise<AuthCallbackPayload | null>,
};

contextBridge.exposeInMainWorld('apply', api);
