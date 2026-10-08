import { chromium } from 'playwright';
import type { ProbeDriver, ProbeSession } from './types.js';

/**
 * Playwright driver with a persistent profile folder. The user logs in by hand inside that
 * browser window; this code never calls `context.cookies()`, `storageState()` or reads any
 * cookie or storage value, and it never reads request or response headers except the
 * content type of responses.
 */
export const playwrightDriver: ProbeDriver = {
  async open({ profileDir, headless }): Promise<ProbeSession> {
    // PROBE_CHROMIUM_PATH lets you point at an installed Chrome or Chromium instead of Playwright's own.
    const executablePath = process.env.PROBE_CHROMIUM_PATH || undefined;
    const context = await chromium.launchPersistentContext(profileDir, { headless, executablePath });
    const page = context.pages()[0] ?? (await context.newPage());
    const handlers: Array<(r: { url: string; status: number; body: string }) => void> = [];
    const inFlight = new Set<Promise<void>>();

    page.on('response', (response) => {
      const task = (async () => {
        try {
          const type = await response.headerValue('content-type');
          if (!type || !/json/i.test(type)) return;
          const body = await response.text();
          for (const h of handlers) h({ url: response.url(), status: response.status(), body });
        } catch {
          // Body not available (redirect, aborted request): nothing to record.
        }
      })();
      inFlight.add(task);
      void task.finally(() => inFlight.delete(task));
    });

    return {
      async goto(url) {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
        await Promise.all([...inFlight]);
        return { status: response?.status() ?? null, finalUrl: page.url(), html: await page.content() };
      },
      onJson(handler) {
        handlers.push(handler);
      },
      async close() {
        await context.close();
      },
    };
  },
};
