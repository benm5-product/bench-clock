# Bench Clock

Bench Clock is a sideline substitution tracker for kids' sports teams. It works with no signal, and your teams are saved on the phone.

There are two versions, built from the same `index.html`:

- **iPhone:** installed from Safari onto the Home Screen (this page).
- **Android:** an app file (`.apk`) built by GitHub Actions. See [android-app/README.md](android-app/README.md), and [android-app/INSTALL.md](android-app/INSTALL.md) for parents.

## Put it online (one-off, free, about 10 minutes)

The app needs to be hosted at a web address once, so phones can install it. GitHub Pages does this for free.

1. On GitHub, create a **new repository** called `bench-clock`.
   - Set it to **Public**. Free GitHub Pages needs a public repo.
   - The repo holds only the app's code. Team names, players and logos never leave each phone.
2. On the new repo's page, tap **uploading an existing file**.
   - Select **all the files** in this folder at once. They're all in one folder, so you can multi-select them in the Files app.
   - Tap **Commit changes**.
3. In the repo, go to **Settings → Pages**.
   - Under **Build and deployment**, set Source to **Deploy from a branch**.
   - Set Branch to `main`, set the folder to `/ (root)`, and tap **Save**.
4. Wait a minute or two, then refresh the Pages settings page. It shows your address, for example
   `https://YOUR-GITHUB-NAME.github.io/bench-clock/`.

## Install on an iPhone

1. Open the address in **Safari**. Other browsers can't install Home Screen apps on all iOS versions.
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Open Bench Clock from the new icon once while you have signal. That saves a copy on the phone, and after that it works anywhere.

Send the same address and steps to other parents. Each phone keeps its own teams.

## Important to know

- **The Home Screen app has its own storage.** Teams you enter in Safari, or in the Claude version, don't automatically appear in it.
  - To move teams in, open setup in the old copy and tap **Copy backup**.
  - Then, in the Home Screen app, open setup, tap **Paste backup**, paste it, tap **Check backup**, then confirm.
- **Keep a backup.** In setup, tap **Export file** now and then, and save it to Files or iCloud Drive. If the app is deleted, or the phone is replaced, **Import file** brings your teams back.
  - The same backup also moves teams to another parent's phone. AirDrop it, or send it in a message.
- **Deleting the Home Screen icon deletes its saved teams.** Export first if you're unsure.

## Updating the app later

1. Upload the new `index.html` to the repo, replacing the old one.
2. Open `sw.js` in GitHub, tap the pencil icon, and raise the number in `bench-clock-2` (to `-3`, and so on). Commit the change.
3. Open `android-app/VERSION` and raise it too (e.g. `1.3.0` → `1.4.0`), so the Android app updates as well.
4. Phones pick up the update the next time the app is opened with signal. Saved teams aren't affected.
5. GitHub builds a new Android app file automatically (**Actions → Build signed APK**).

## Files

| File | What it is |
|---|---|
| `index.html` | The app |
| `sw.js` | Saves the app on the phone so it works offline |
| `manifest.webmanifest` | App name, icon and colours for the Home Screen |
| `*.png` | App icons |
| `*.woff2` | The two fonts, bundled so they work offline (OFL licence files included) |
| `android-app/` | The Android version. It copies the files above into the app when it's built |
| `.github/workflows/build-apk.yml` | Builds the Android app file on GitHub |
