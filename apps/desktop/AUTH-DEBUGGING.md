# Desktop sign-in: debugging guide

Flow: system browser -> Supabase -> `https://applyspace.app/auth/desktop` (bridge page) -> `applyspace://auth/callback?code=...` -> main (`authCoordinator`) -> renderer (`DesktopAuthBridge`) -> `exchangeCodeForSession` -> `/`.

## Where to look

The main process writes one line per step to `auth.log` (and to stdout). It never contains a code, token or URL: only lengths, booleans and fixed words.

- macOS: `~/Library/Logs/ApplySpace/auth.log` (`ls ~/Library/Logs | grep -i apply` if the folder name differs). Rotated at 200 KB to `auth.log.1`.
- To also see stdout: quit the app, then run `/Applications/ApplySpace.app/Contents/MacOS/ApplySpace` from a terminal.

## Repro of the original bug report (LinkedIn, sign out, Google)

1. Quit the app. `rm ~/Library/Logs/ApplySpace/auth.log`.
2. Start the app, sign in with LinkedIn. Sign out. Sign in with Google.
3. Send `cat ~/Library/Logs/ApplySpace/auth.log` (no secrets in it).

## A healthy sign-in

```
[auth] window state=page-load inPlaceNavsBeforeLoad=1
[auth] renderer stage=sign-in-start error=none status=null
[auth] reset hadPending=false
[auth] deep-link source=macos-open-url parsed=code codeLength=36 outcome=stored hasWindow=true windowLoaded=true legacyReady=false inPlaceNavs=1 msSinceLoad=48210
[auth] notify reason=link sent=true hasPending=true
[auth] taken kind=code
[auth] renderer stage=callback-taken ...
[auth] renderer stage=exchange-start ...
[auth] renderer stage=exchange-ok ...
```

`legacyReady=false` together with `taken` is the original bug being survived: the old `rendererReady` flag would have dropped the link here.

## Reading a failure

| What the log shows | Meaning |
| --- | --- |
| No `deep-link` line after `sign-in-start` | The link never reached the app: browser did not open it (click "Open ApplySpace" on the bridge page, allow the prompt) or the `applyspace://` scheme is not registered (reinstall into /Applications). The login page shows a message after 2 min (`no-return-timeout`). |
| `deep-link-ignored` | A link arrived but is not `applyspace://auth/callback`. |
| `deep-link parsed=no-code` / `bad-code` | Supabase or the bridge page returned no usable code (`codeLength` tells which). |
| `deep-link outcome=duplicate` | The same code arrived twice (automatic open + button). Harmless. |
| `notify sent=false` | No live window at that moment; delivered on `page-load` or by the renderer on focus. |
| `gave-up` and no `taken` | Renderer never asked: page crashed or is not the app. Check the window. |
| `exchange-error error=AuthPKCECodeVerifierMissingError` | The PKCE verifier cookie was gone before the exchange (no `/token` request is made). Known cause: a stale, server-revoked session cookie makes the Next proxy's `getUser()` wipe every `sb-*` cookie, verifier included. |
| `exchange-error error=AuthApiError status=400` | Code expired or already used, or verifier mismatch. |
| `exchange-timeout` / `TypeError` | Supabase unreachable. |

## Reproduce the root cause without the app

`pnpm --filter @apply/desktop exec electron scripts/repro-in-page-navigation.cjs` loads a page that calls `history.replaceState` after `load` (what Next does on hydration) and prints what the pre-fix `rendererReady` flag ends up as. Expected: `FINAL ... rendererReady=false`.
