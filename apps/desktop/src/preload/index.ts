import { contextBridge, ipcRenderer } from 'electron';

import { type ApplyApi, Channel } from '../shared/ipc.js';

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
};

contextBridge.exposeInMainWorld('apply', api);
