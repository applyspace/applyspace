import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BrowserWindow, app, ipcMain, shell } from 'electron';

import { Channel } from '../shared/ipc.js';
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

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// -----------------------------------------------------------------------------
// IPC handlers (see shared/ipc.ts for the typed surface).
// -----------------------------------------------------------------------------
ipcMain.handle(Channel.GetDbPath, () => dbPath ?? '');
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
  mainWindow.on('closed', () => {
    mainWindow = null;
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
