// electron-builder afterPack hook: ad-hoc sign the macOS app.
// Apple Silicon refuses an app whose bundle was modified after Electron's own
// signature ("is damaged"). A fresh ad-hoc signature (no certificate, no account)
// makes it a regular unsigned app: macOS then asks to confirm once (right-click > Open).
// Replace with Developer ID signing and notarization once an Apple account exists.
const { execFileSync } = require('node:child_process');
const path = require('node:path');

exports.default = async function adhocSign(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
};
