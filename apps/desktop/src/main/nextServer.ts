import { type ChildProcess, fork } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';

import { app } from 'electron';

/**
 * Strategy:
 *
 *  - **Dev** (`app.isPackaged === false`): we do NOT spawn anything. The user
 *    is expected to run `pnpm --filter web dev` in parallel (orchestrated from
 *    the root `dev` script). Electron just points the BrowserWindow at
 *    `http://localhost:3000`.
 *
 *  - **Prod** (`app.isPackaged === true`): we fork Next's standalone server
 *    (`apps/web/.next/standalone/server.js`) as a Node child process on a
 *    random free loopback port, with `APPLY_DB_PATH` injected so the Next
 *    runtime opens the same SQLite file as the main process.
 */

export interface NextServer {
  /** URL the BrowserWindow should `loadURL()`. */
  url: string;
  /** Called on app quit to tear down the subprocess (no-op in dev). */
  shutdown: () => Promise<void>;
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (typeof addr !== 'object' || addr === null) {
        srv.close();
        reject(new Error('Unable to resolve a free port'));
        return;
      }
      const port = addr.port;
      srv.close(() => resolve(port));
    });
  });
}

function resolveStandaloneServerPath(): string {
  // In a packaged electron-builder app, the web bundle is shipped as
  // `extraResources` (not `files:`), so it lives under
  // `Contents/Resources/apps/web/.next/standalone/...`, not under
  // `Contents/Resources/app/...`. We anchor off `process.resourcesPath` in
  // prod; dev never hits this path because `app.isPackaged === false`.
  return path.join(
    process.resourcesPath,
    'apps', 'web', '.next', 'standalone', 'apps', 'web', 'server.js',
  );
}

export async function startNextServer(dbPath: string): Promise<NextServer> {
  if (!app.isPackaged) {
    return {
      url: 'http://localhost:3000',
      shutdown: async () => {
        /* Next dev is owned by the root `pnpm dev` — nothing to kill here. */
      },
    };
  }

  const port = await findFreePort();
  const serverPath = resolveStandaloneServerPath();

  const child: ChildProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      HOSTNAME: '127.0.0.1',
      PORT: String(port),
      NODE_ENV: 'production',
      APPLY_DB_PATH: dbPath,
    },
    // Inherit stdio so Next's request logs surface in the Electron terminal
    // (or the packaged app's console, if launched from one).
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    console.error(`[next-server] exited code=${code} signal=${signal}`);
  });

  // Wait for the server to actually accept connections before returning.
  await waitForPort(port, 30_000);

  return {
    url: `http://127.0.0.1:${port}`,
    shutdown: async () => {
      if (!child.killed) child.kill('SIGTERM');
    },
  };
}

async function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const reachable = await new Promise<boolean>((resolve) => {
      const socket = net
        .connect({ port, host: '127.0.0.1' })
        .once('connect', () => {
          socket.end();
          resolve(true);
        })
        .once('error', () => resolve(false));
    });
    if (reachable) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Next standalone server never opened port ${port} within ${timeoutMs}ms`);
}
