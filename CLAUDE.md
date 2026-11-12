# Bench Clock

Bench Clock is a sideline substitution tracker for the kids' sports teams I manage. All updates are managed from this repo, and **one shared app** (`index.html`) feeds three places, which must always be updated together:

- **iPhone (web app):** an offline web app that parents add to their iPhone Home Screen from Safari. It's hosted with **GitHub Pages from the `main` branch, repo root**. Whatever is on `main` is live.
- **Android (APK):** the same app packaged with Capacitor in `android-app/`. GitHub Actions builds a signed APK and, for each new version, publishes it as a GitHub Release. Parents always get the newest from https://github.com/benm5-product/bench-clock/releases/latest/download/bench-clock.apk
- **Prototype link:** the same app as a claude.ai page, https://claude.ai/artifact/7ACmbZ2rKaem1VdY1qWYtB, built by `android-app/scripts/build-prototype.mjs`.

## Files

Web app (repo root, also used by the Android build):

- `index.html` is the whole app: HTML, CSS and JS in one file. There's no build step and no framework.
- `sw.js` is the service worker. It caches every file so the app works with no signal. Its `FILES` list is also what the Android build copies.
- `manifest.webmanifest` sets the Home Screen name, icon and colours.
- `*.png` are icons, and `*.woff2` are bundled fonts (Barlow Condensed, Atkinson Hyperlegible, basic Latin plus Latin-ext for accented names).
- Keep all these web files in the repo root. Don't put them in folders, because I upload them from my phone and GitHub Pages serves the root.

Android (everything Android-only lives in `android-app/`, the one folder allowed):

- `android-app/scripts/copy-web.mjs` copies the root web files into `android-app/www/` at build time. `www/` is generated and not committed, so never edit it and never keep a second copy of the app.
- `android-app/native.js` holds the Android-only extras: Capacitor Preferences storage, export through the share sheet, keep-awake, haptics, status bar colour and the back button. The build plugs it in where `index.html` has the `<!-- android:native -->` line.
- `android-app/VERSION` is the Android version number (e.g. `1.3.0`).
- `.github/workflows/build-apk.yml` builds the signed APK and publishes the release when `android-app/VERSION` is new.
- `android-app/scripts/build-prototype.mjs` builds the prototype page into `android-app/dist/` (not committed).
- `android-app/README.md` covers building, releasing, the signing key and the GitHub secrets. `android-app/INSTALL.md` is the install guide for parents.

## Rules for every change

- **Every change applies to both versions.** Make app changes in the root `index.html` only, so the iPhone and Android versions stay the same. Don't add features to only one version unless I ask.
  - Android-only behaviour goes in `android-app/native.js`, behind `Native.…` calls that also have a web version (the `window.Native` block in `index.html`). Use `Native.isNative` where the two versions must behave differently.
  - Never load `capacitor.js`, `native.js` or anything else Android-only on the web.
- **Bump both version numbers** whenever any app file changes:
  - `VERSION` in `sw.js` (`bench-clock-2` → `bench-clock-3` …). Otherwise installed iPhones never update.
  - `android-app/VERSION` (`1.3.0` → `1.4.0` for features, `1.3.1` for fixes). Each part stays below 100. Android won't install an update with the same or a lower number.
- If you add a new web file, add it to the `FILES` list in `sw.js`. That's also how it gets into the Android app.
- **Commit straight to `main`** unless I ask for a branch, so the change goes live.
- **Every update goes out to all three places in unison.** After a change:
  1. Push to `main`. That updates the iPhone app, and because `android-app/VERSION` was raised, GitHub builds the APK and publishes the new release automatically.
  2. Check that the **Build signed APK** run on GitHub succeeds and the new release has `bench-clock.apk` attached.
  3. From `android-app/`, run `npm run prototype` and republish `android-app/dist/bench-clock-prototype.html` to https://claude.ai/artifact/7ACmbZ2rKaem1VdY1qWYtB (same link, never a new one).
  4. Tell me the update is live in all three places, and what parents need to do (iPhone: open the app with signal; Android: download from the release link and tap Update).
- The app must keep working fully offline. Don't add CDNs, external fonts, analytics or network calls. The Android app has no internet permission.
- Data is saved under the key `bench-clock-teams-v1`, in the shape `{teams:[{id,name,brand,state,sport?,formation?,fieldView?,table?}], cur, updatedAt}`. On iPhone it's in `localStorage`; on Android it's in Capacitor Preferences.
  - Never rename the key or break this shape, because parents' saved teams depend on it.
  - If the shape must change, migrate old data on load.
  - Keep Export/Import backups compatible across both versions, including older backups. A backup is `{app:'bench-clock',version:1,exportedAt,data:{teams,cur,updatedAt}}`, and import also accepts a bare `{teams,…}` from Android 1.0–1.2.
- **Never change the Android package id (`au.benchclock.app`) or the signing key.** Otherwise installed Android apps can't update and parents would lose their teams. The workflow checks the key's fingerprint.
- Keep these working:
  - the clock, which is timestamp-based so it survives the phone locking or the app being closed
  - On field and Bench side by side, with all tiles on one iPhone screen
  - ordering: longest on and longest off at the top
  - tap to move a player, and long-press-drag to swap
  - Undo, where a swap or position change undoes as one action
  - the Rested / No rest badges per half
  - the "Who was off at…" slider and the Time on / Time off table
  - sport per team: Basic, Rugby League and Football (Soccer), with named positions, the Field | List switch and the interchange list
  - Football formations (11, 9, 7 and 5-a-side), changeable mid-game, with players keeping or moving to the nearest position
  - multiple teams, with logo and colours per team
  - two-tap confirmation for New game, Delete team and Import
  - Export file, Copy backup, Paste backup and Import file
  - light and dark mode
  - Android: saving on the phone, keep-awake while a clock runs, haptic buzz on drag, back button, status bar in the team colour
- Before committing, test at iPhone width (390px) in light and dark mode, including with the network switched off, and test the Android build with its plugins simulated. From `android-app/`: `npm ci`, then `npm run test:iphone` and `npm run test:web`.

## About me

I'm not a developer. Explain what you changed in plain English, and tell me anything I need to do on my phone to see it.
