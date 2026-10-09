import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BrowserWindow, app, ipcMain, shell } from 'electron';

import { AUTH_SCHEME, type AuthCallbackPayload, Channel, type DesktopInfo } from '../shared/ipc.js';
import { findDeepLink, parseAuthCallback } from './deepLink.js';
import { initializeDatabase, resolveDbPath } from './db.js';
import { type NextServer, startNextServer } from './nextServer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRELOAD_PATH = path.join(__dirname, '..', 'preload', 'index.js');

// -----------------------------------------------------------------------------
// Single-instance lock — prevent two copies of the app from racing on the DB
// file. The second invocation simply focuses the existing window and exits.
// -----------------------------------------------------------------------------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
let nextServer: NextServer | null = null;
let dbPath: string | null = null;

// -----------------------------------------------------------------------------
// Deep link: `applyspace://auth/callback?code=...` brings the user back from the
// system browser after Google/LinkedIn sign-in. Only the validated one-time code
// is forwarded to the renderer, which finishes the Supabase PKCE exchange.
// -----------------------------------------------------------------------------
// Dev (`electron dist/main/index.js`) must register the script path too.
if (process.defaultApp && process.argv[1]) {
  app.setAsDefaultProtocolClient(AUTH_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient(AUTH_SCHEME);
}

let rendererReady = false;
let pendingAuth: AuthCallbackPayload | null = null;

function focusWindow(): void {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

function handleDeepLink(raw: string): void {
  const payload = parseAuthCallback(raw);
  if (!payload) return;
  // Always keep it until the renderer takes it: the page may be loaded but not
  // hydrated yet, or not loaded at all (cold start from the link). The push is
  // only a wake-up call; the renderer reads the payload with `takeAuthCallback`.
  pendingAuth = payload;
  if (mainWindow && rendererReady) mainWindow.webContents.send(Channel.AuthCallback, payload);
  focusWindow();
}

// macOS delivers the link here (must be registered before `ready`).
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// Windows/Linux: the link arrives as an argument of the second instance.
app.on('second-instance', (_event, argv) => {
  const link = findDeepLink(argv);
  if (link) handleDeepLink(link);
  focusWindow();
});

// Windows/Linux cold start through the link.
const coldStartLink = findDeepLink(process.argv);
if (coldStartLink) {
  const payload = parseAuthCallback(coldStartLink);
  if (payload) pendingAuth = payload;
}

// -----------------------------------------------------------------------------
// IPC handlers (see shared/ipc.ts for the typed surface).
// -----------------------------------------------------------------------------
ipcMain.handle(Channel.GetDbPath, () => dbPath ?? '');
ipcMain.handle(Channel.GetInfo, (): DesktopInfo => ({
  packaged: app.isPackaged,
  platform: process.platform,
}));
ipcMain.handle(Channel.TakeAuthCallback, () => {
  const payload = pendingAuth;
  pendingAuth = null;
  return payload;
});
ipcMain.handle(Channel.OpenExternal, async (_event, url: unknown) => {
  if (typeof url !== 'string') throw new Error('openExternal: url must be a string');
  // Defensive: only allow http(s) so a compromised renderer can't launch
  // arbitrary protocols (mailto, file, custom) via this channel.
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`openExternal: refusing protocol ${parsed.protocol}`);
  }
  await shell.openExternal(url);
});

// -----------------------------------------------------------------------------
// Lifecycle
// -----------------------------------------------------------------------------
async function createMainWindow(): Promise<void> {
  dbPath = resolveDbPath();
  initializeDatabase(dbPath);

  nextServer = await startNextServer(dbPath);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#0b0b0f',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.webContents.on('did-start-navigation', (_e, _url, _inPlace, isMainFrame) => {
    if (isMainFrame) rendererReady = false;
  });
  mainWindow.webContents.on('did-finish-load', () => {
    rendererReady = true;
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    rendererReady = false;
  });

  // Route middle-click / target="_blank" to the system browser rather than
  // letting Electron spawn a new child BrowserWindow we'd have to manage.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await mainWindow.loadURL(nextServer.url);
}

app.whenReady().then(async () => {
  try {
    await createMainWindow();
  } catch (err) {
    console.error('[main] failed to create window:', err);
    app.quit();
  }

  app.on('activate', () => {
    // macOS: re-create the window when the dock icon is clicked and no
    // windows are open.
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // macOS keeps apps running until explicit Cmd+Q.
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  if (nextServer) {
    await nextServer.shutdown();
    nextServer = null;
  }
});
