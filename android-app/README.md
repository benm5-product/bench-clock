# Bench Clock (Android)

This folder turns the Bench Clock web app into an Android app (`.apk`) with
[Capacitor](https://capacitorjs.com/). Parents install it straight onto their phone, without the Play Store.

**There is only one copy of the app:** `index.html` in the repo root, which is also the iPhone web app.
When the APK is built, `scripts/copy-web.mjs` copies the root web files (everything listed in the root
`sw.js`) into `android-app/www/` and adds the Android extras. Never edit `www/`. It is rebuilt each time
and isn't saved in git.

- **App name:** Bench Clock · **Package id:** `au.benchclock.app`
- **Android:** 8.0 (API 26) or newer · targets Android 16 (API 36)
- **Works offline:** fonts and all web files are inside the app; it doesn't ask for internet access.
- **Install guide for parents:** [INSTALL.md](INSTALL.md)

## What's where

| Path | What it is |
| --- | --- |
| `../index.html` (repo root) | **The app**, shared with the iPhone version |
| `VERSION` | **The Android app version. The only place you change it.** |
| `native.js` | The Android-only extras: on-phone storage, export through the share sheet, keep-awake, haptics, status bar colour, back button. Loaded only inside the Android app |
| `scripts/copy-web.mjs` | Builds `www/` from the repo root and plugs in `capacitor.js` and `native.js` |
| `android/` | The Android project Capacitor generated, plus `BarColourPlugin.java` (status bar colour) |
| `assets/` + `scripts/make-icon.mjs` | The stopwatch icon and splash screen (`npm run assets` regenerates them) |
| `../.github/workflows/build-apk.yml` | Builds the signed APK on GitHub |
| `tests/web-smoke.mjs` | Phone-sized browser test of the Android build, with the Android plugins simulated (`npm run test:web`) |
| `scripts/build-prototype.mjs` | Builds the claude.ai prototype page from the root `index.html` (`npm run prototype`) |
| `tests/iphone-web.mjs` | Phone-sized browser test of the iPhone web app as GitHub Pages serves it, including offline (`npm run test:iphone`) |

## How the Android extras stay out of the web version

`index.html` has one marker line, `<!-- android:native … -->`. On the web it's only a comment, and
the app uses its built-in web versions of storage, keep-awake and so on (the small `window.Native`
block just below the marker). In the Android build, `copy-web.mjs` replaces the marker with
`<script src="capacitor.js">` and `<script src="native.js">`, so `window.Native` uses the Android
plugins instead. The app code calls `Native.…` either way and checks `Native.isNative` where the two
versions behave differently.

## Building the APK

### On GitHub (recommended: nothing to install)

**Actions → Build signed APK** runs whenever a push changes the app (the root web files or
`android-app/`), on every tag like `v1.3.0`, and when started by hand (**Run workflow**).

1. Open the repository on GitHub and go to the **Actions** tab.
2. Click the latest **Build signed APK** run.
3. Under **Artifacts** at the bottom of the Summary page, download `bench-clock-<version>`.
   It's a zip containing `bench-clock-<version>.apk`.

For each new version pushed to `main`, the APK is also published as a **Release**. Send parents the
permanent link https://github.com/benm5-product/bench-clock/releases/latest/download/bench-clock.apk

The workflow needs four repository secrets, set up once. See [GitHub Actions secrets](#github-actions-secrets).
Before building, it also checks that the keystore is the original Bench Clock key (by its fingerprint),
so a wrongly signed APK can never go out.

### On your own computer (optional)

You need Node.js 22+, JDK 21 and the Android SDK command-line tools (no Android Studio). Then:

```bash
npm ci
```

```bash
npm run build:apk
```

The signed APK lands in `dist/bench-clock-<version>.apk`. A local build needs the keystore file and
`android/keystore.properties` (both kept out of git):

```properties
storeFile=../keystore/bench-clock-release.jks
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=benchclock
keyPassword=YOUR_KEYSTORE_PASSWORD
```

If signing isn't set up, the build stops with an error rather than producing an unsigned APK, which
couldn't be installed as an update.

## Releasing an update

Updates go to the iPhone app, the Android APK and the prototype link together:

1. Make the change in the root `index.html` (it applies to every version at once).
   Bump `VERSION` in the root `sw.js` as usual for the iPhone version.
2. Open `android-app/VERSION` and raise the number, e.g. `1.3.0` → `1.4.0` (or `1.3.1` for a small fix).
   Android's internal `versionCode` is worked out from it (1.4.0 → 10400), so it always goes up.
   Each part must stay below 100.
3. Commit and push to `main`. GitHub Pages updates the iPhone app, and the **Build signed APK**
   workflow builds the APK and publishes a **Release** `v1.4.0` with it attached (as
   `bench-clock-1.4.0.apk` and `bench-clock.apk`). If `VERSION` wasn't raised, no new release is made.
4. Rebuild and republish the prototype: `npm run prototype`, then publish
   `dist/bench-clock-prototype.html` to https://claude.ai/artifact/7ACmbZ2rKaem1VdY1qWYtB.
5. Parents install or update from the permanent link
   https://github.com/benm5-product/bench-clock/releases/latest/download/bench-clock.apk, which always
   gives the newest version. Installing over the old app keeps their teams
   ([INSTALL.md](INSTALL.md#updating-to-a-new-version)).

Updates install over the top only if **every** version is signed with the **same keystore**, has the
same package id (`au.benchclock.app`), and has a higher version number.

## Backing up the keystore (important)

The release keystore is the app's signature. Android only accepts an update if it's signed with the
same key as the version already installed.

**If the keystore or its password is lost, you can never ship an update to the installed app again.**
Every parent would have to uninstall Bench Clock (losing their teams unless they exported them first)
and install a new app signed with a new key.

The files that were generated (all outside git, listed in `.gitignore`):

| File | What it is |
| --- | --- |
| `keystore/bench-clock-release.jks` | The keystore (the actual signing key) |
| `keystore/keystore-passwords.txt` | Its password and key alias, plus the values for the GitHub secrets |
| `keystore/keystore-base64.txt` | The keystore as text, for the `BENCH_CLOCK_KEYSTORE_BASE64` secret |

Back up `bench-clock-release.jks` **and** `keystore-passwords.txt` in at least two places you control,
for example a password manager (most can store file attachments) and a private cloud folder. Don't
put them in this repository, a public place or a shared team chat. The GitHub secrets are **not** a
backup: GitHub never lets you read a secret back out.

Key details: alias `benchclock`, RSA 4096, valid until 2054. Certificate SHA-256 fingerprint
`57:56:8B:53:CD:74:25:91:A7:7D:69:A0:41:74:90:7B:FC:67:14:75:B7:5A:62:A1:8F:4B:99:96:53:D1:F6:B2`.

## GitHub Actions secrets

Do this once, from a computer:

1. On GitHub, open the repository → **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret** and add each of these (names must match exactly):

   | Name | Value |
   | --- | --- |
   | `BENCH_CLOCK_KEYSTORE_BASE64` | The entire contents of `keystore/keystore-base64.txt` (one long line; copy all of it) |
   | `BENCH_CLOCK_KEYSTORE_PASSWORD` | The keystore password from `keystore/keystore-passwords.txt` |
   | `BENCH_CLOCK_KEY_ALIAS` | `benchclock` |
   | `BENCH_CLOCK_KEY_PASSWORD` | The same password again |

3. Go to **Actions → Build signed APK → Run workflow** to check it builds.

If you ever need to re-create `keystore-base64.txt` from the `.jks` file:

```bash
base64 -w0 keystore/bench-clock-release.jks > keystore/keystore-base64.txt
```

(macOS: `base64 -i keystore/bench-clock-release.jks -o keystore/keystore-base64.txt`.)

## How the Android version differs from the iPhone version

The game is the same: it's the same `index.html`. Inside the Android app:

- **Storage:** saved on the phone with `@capacitor/preferences`, under the same key and in the same
  shape as the web version (`bench-clock-teams-v1`, `{teams:[…], cur, updatedAt}`). On first launch,
  any data left in the WebView's `localStorage` is brought over. If saved teams can't be read, the app
  refuses to save over them.
- **Export file** opens the Android share sheet with `bench-clock-teams-<date>.json` (save to Drive or
  Files, or send it to another parent). Backups are the same format on iPhone and Android, so either can
  import the other's. Files exported by Android 1.0–1.2 still import.
- **Screen stays awake** while any team's clock is running (`@capacitor-community/keep-awake`).
- **Haptic buzz** when a drag starts (`@capacitor/haptics`).
- **Back button:** closes the interchange list or setup if open; does nothing while a clock runs;
  otherwise exits.
- **Edge-to-edge:** the status bar takes the team's primary colour, with light or dark icons for
  contrast, and the content stays clear of the gesture bar.
- **Sports:** Basic, Rugby League, and Football (Soccer) with formations for 11, 9, 7 and 5-a-side.
- **Time on / Time off table** starts on "Time on" for Android and "Time off" for iPhone (each team
  remembers its choice).
- **Portrait only**, own icon and splash screen, fonts bundled, no internet permission.

## Testing

From `android-app/` (Node.js 22+ and Playwright with Chromium):

```bash
npm ci
```

```bash
npm run test:web
```

```bash
npm run test:iphone
```

`npm run serve` builds `www/` and serves it on <http://localhost:5173> for trying in a browser.
