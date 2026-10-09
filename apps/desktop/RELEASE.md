# Desktop release

The macOS .dmg is built by GitHub Actions, not on a laptop.

## Build

1. One-time: add the repository variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (and, if wanted, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_BRANDFETCH_CLIENT_ID`) under Settings > Secrets and variables > Actions > Variables. All are public values.
2. Actions > Desktop release > Run workflow (the .dmg is attached to the run as an artifact), or push a tag `desktop-vX.Y.Z` to also publish it as a GitHub pre-release.
3. Bump `version` in `apps/desktop/package.json` before tagging.

Output: `ApplySpace-<version>-arm64.dmg` (Apple Silicon). Intel (x64) is left out until someone needs it.

## First open (unsigned build)

The alpha is not signed or notarized yet. After downloading: right-click the app > Open, or run `xattr -cr /Applications/ApplySpace.app` once. Developer ID signing and notarization remove this step (needs an Apple Developer account, set up by the owner).

## Not in the alpha

- Place autocomplete needs a server-side key (`GEOAPIFY_API_KEY`) that must not ship inside the app: it stays off until it goes through a hosted endpoint.
- No auto-update yet (needs signing first).

## Sign-in test (APP-132)

On the installed app: Google sign-in opens the system browser and returns to the app signed in; LinkedIn sign-in, same; quit and reopen keeps the session; cancelling in the browser leaves the login page usable (spinner times out after 2 minutes); while signed out, every page redirects to the login.
