# Bench Clock

Bench Clock is a sideline substitution tracker for the kids' sports teams I manage. It's an offline web app that parents add to their iPhone Home Screen from Safari. It's hosted with **GitHub Pages from the `main` branch, repo root**. Whatever is on `main` is live.

## Files

- `index.html` is the whole app: HTML, CSS and JS in one file. There's no build step and no framework.
- `sw.js` is the service worker. It caches every file so the app works with no signal.
- `manifest.webmanifest` sets the Home Screen name, icon and colours.
- `*.png` are icons, and `*.woff2` are bundled fonts (Barlow Condensed, Atkinson Hyperlegible).
- All files sit in the repo root. Don't create folders, because I upload files from my phone.

## Rules for every change

- **Bump `VERSION` in `sw.js`** (`bench-clock-1` → `bench-clock-2` …) whenever any cached file changes. Otherwise installed phones never update.
- If you add a new file, add it to the `FILES` list in `sw.js`.
- **Commit straight to `main`** unless I ask for a branch, so the change goes live.
- The app must keep working fully offline. Don't add CDNs, external fonts, analytics or network calls.
- Data is saved in `localStorage` under `bench-clock-teams-v1`, in the shape `{teams:[{id,name,brand,state}], cur, updatedAt}`.
  - Never rename the key or break this shape, because parents' saved teams depend on it.
  - If the shape must change, migrate old data on load.
  - Keep Export/Import backups compatible.
- Keep these working:
  - the clock, which is timestamp-based so it survives the phone locking
  - On field and Bench side by side, with all tiles on one iPhone screen
  - ordering: longest on and longest off at the top
  - tap to move a player, and long-press-drag to swap
  - Undo, where a swap undoes as one action
  - the Rested / No rest badges per half
  - the "Who was off at…" slider and the time-off table
  - multiple teams, with logo and colours per team
  - two-tap confirmation for New game, Delete team and Import
  - light and dark mode
- Test at iPhone width (390px) in light and dark mode before committing, including with the network switched off.

## About me

I'm not a developer. Explain what you changed in plain English, and tell me anything I need to do on my phone to see it.
