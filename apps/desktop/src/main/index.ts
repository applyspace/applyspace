import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BrowserWindow, app, ipcMain, shell } from 'electron';

import { AUTH_SCHEME, Channel, type DesktopInfo } from '../shared/ipc.js';
import { createAuthCoordinator, type WindowFacts } from './authCoordinator.js';
import { createAuthLogger, sanitizeReport } from './authLog.js';
import { findDeepLink } from './deepLink.js';
import { type NextServer, startNextServer } from './nextServer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRELOAD_PATH = path.join(__dirname, '..', 'preload', 'index.mjs');

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

// -----------------------------------------------------------------------------
// Auth log: one line per step of the sign-in return, in `<logs>/auth.log`
// (macOS: ~/Library/Logs/<app name>/auth.log) and on stdout. Values can only be numbers,
// booleans or a fixed vocabulary (see authLog.ts), so a code or token cannot end up here.
// -----------------------------------------------------------------------------
const AUTH_LOG_MAX_BYTES = 200_000;

function writeAuthLogLine(line: string): void {
  console.log(line);
  try {
    const dir = app.getPath('logs');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'auth.log');
    try {
      if (fs.statSync(file).size > AUTH_LOG_MAX_BYTES) fs.renameSync(file, `${file}.1`);
    } catch {
      // No log file yet.
    }
    fs.appendFileSync(file, `${line}\n`);
  } catch {
    // Logging must never get in the way of signing in.
  }
}

const authLog = createAuthLogger(writeAuthLogLine);

// Window facts, for the log only: delivery of the deep link does not depend on them.
let windowLoaded = false;
let legacyReady = false;
let inPlaceNavs = 0;
let loadedAt: number | null = null;

function windowFacts(): WindowFacts {
  return {
    hasWindow: mainWindow !== null && !mainWindow.isDestroyed(),
    loaded: windowLoaded,
    legacyReady,
    inPlaceNavs,
    msSinceLoad: loadedAt === null ? null : Date.now() - loadedAt,
  };
}

function focusWindow(): void {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

const auth = createAuthCoordinator({
  send: (payload) => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    mainWindow.webContents.send(Channel.AuthCallback, payload);
    return true;
  },
  focus: focusWindow,
  log: authLog,
  windowFacts,
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (handle) => clearTimeout(handle as NodeJS.Timeout),
});

// macOS delivers the link here (must be registered before `ready`).
app.on('open-url', (event, url) => {
  event.preventDefault();
  auth.handleLink(url, 'macos-open-url');
});

// Windows/Linux: the link arrives as an argument of the second instance.
app.on('second-instance', (_event, argv) => {
  const link = findDeepLink(argv);
  if (link) auth.handleLink(link, 'second-instance');
  focusWindow();
});

// Windows/Linux cold start through the link.
const coldStartLink = findDeepLink(process.argv);
if (coldStartLink) auth.handleLink(coldStartLink, 'cold-start');

// -----------------------------------------------------------------------------
// IPC handlers (see shared/ipc.ts for the typed surface).
// -----------------------------------------------------------------------------
ipcMain.handle(Channel.GetInfo, (): DesktopInfo => ({
  packaged: app.isPackaged,
  platform: process.platform,
}));
ipcMain.handle(Channel.TakeAuthCallback, () => auth.take());
ipcMain.handle(Channel.AuthReset, () => {
  auth.reset();
});
ipcMain.on(Channel.AuthReport, (_event, raw: unknown) => {
  const report = sanitizeReport(raw);
  authLog('renderer', { stage: report.stage, error: report.errorName, status: report.status });
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
  nextServer = await startNextServer();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    title: 'ApplySpace',
    backgroundColor: '#0b0b0f',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.webContents.on('did-start-navigation', (_e, _url, isInPlace, isMainFrame) => {
    if (!isMainFrame) return;
    legacyReady = false;
    if (isInPlace) {
      // history.pushState/replaceState (Next.js does it on every hydration): no `did-finish-load` follows.
      inPlaceNavs += 1;
      if (inPlaceNavs === 1) {
        authLog('window', {
          state: 'in-page-nav',
          msSinceLoad: loadedAt === null ? null : Date.now() - loadedAt,
        });
      }
    } else {
      windowLoaded = false;
      loadedAt = null;
      inPlaceNavs = 0;
    }
  });
  mainWindow.webContents.on('did-finish-load', () => {
    legacyReady = true;
    windowLoaded = true;
    loadedAt = Date.now();
    authLog('window', { state: 'page-load', inPlaceNavsBeforeLoad: inPlaceNavs });
    auth.onPageLoaded();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    windowLoaded = false;
    legacyReady = false;
    loadedAt = null;
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
