// Repro of the APP-132 follow-up bug (second desktop sign-in never exchanged its code).
//
// The pre-fix main process kept a `rendererReady` flag: false on every main-frame
// `did-start-navigation`, true on `did-finish-load`. Next.js calls `history.replaceState` when it
// hydrates; Electron reports that as a main-frame `did-start-navigation` with `isInPlace: true`
// and fires no `did-finish-load` afterwards. If hydration comes after `load` (warm cache), the flag
// stays false and the deep link was stored but never pushed. Run:
//   pnpm --filter @apply/desktop exec electron scripts/repro-in-page-navigation.cjs
const http = require('node:http');
const { BrowserWindow, app } = require('electron');

const html = `<!doctype html><title>repro</title><body>login page<script>
window.addEventListener('load', () => setTimeout(() => history.replaceState({ hydrated: true }, '', location.pathname), 200));
</script>`;

const server = http.createServer((_req, res) => {
  res.setHeader('content-type', 'text/html');
  res.end(html);
});

server.listen(0, '127.0.0.1', async () => {
  await app.whenReady();
  const win = new BrowserWindow({ show: false });
  let rendererReady = false; // the pre-fix flag
  const say = (msg) => console.log(`${msg.padEnd(70)} rendererReady=${rendererReady}`);

  win.webContents.on('did-start-navigation', (_e, _url, isInPlace, isMainFrame) => {
    if (isMainFrame) rendererReady = false; // pre-fix behaviour
    say(`did-start-navigation isInPlace=${isInPlace} isMainFrame=${isMainFrame}`);
  });
  win.webContents.on('did-finish-load', () => {
    rendererReady = true;
    say('did-finish-load');
  });
  await win.loadURL(`http://127.0.0.1:${server.address().port}/login`);
  setTimeout(() => {
    console.log(`\nFINAL rendererReady=${rendererReady}  <- false means a deep link arriving now would not have been pushed`);
    app.quit();
    server.close();
  }, 1000);
});
