// Builds android-app/www/ from the web app in the repo root, so there is only one copy of the app.
// Copies every file listed in the root sw.js (the same list the iPhone version caches), the font
// licences, Capacitor's runtime and native.js, then plugs the last two into index.html.
// Run by `npm run sync` (and so by the GitHub Actions APK build). www/ is not committed.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

const app = new URL('../', import.meta.url);      // android-app/
const root = new URL('../../', import.meta.url);  // repo root (the web app)
const www = new URL('www/', app);

const sw = readFileSync(new URL('sw.js', root), 'utf8');
const list = sw.match(/const FILES = \[([\s\S]*?)\];/);
if (!list) throw new Error('Could not find the FILES list in sw.js');
const files = [...list[1].matchAll(/'\.\/([^']+)'/g)].map(m => m[1]);
if (!files.includes('index.html')) throw new Error('sw.js FILES does not list index.html');
const licences = readdirSync(root).filter(f => /^OFL-.*\.txt$/.test(f));

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
for (const f of [...files, ...licences]) copyFileSync(new URL(f, root), new URL(f, www));
copyFileSync(new URL('node_modules/@capacitor/core/dist/capacitor.js', app), new URL('capacitor.js', www));
copyFileSync(new URL('native.js', app), new URL('native.js', www));

const MARK = /^.*<!-- android:native\b.*-->.*$/m;
let html = readFileSync(new URL('index.html', www), 'utf8');
if ((html.match(new RegExp(MARK, 'gm')) || []).length !== 1) throw new Error('index.html must contain exactly one <!-- android:native --> line');
html = html.replace(MARK, '<script src="capacitor.js"></script>\n<script src="native.js"></script>');
writeFileSync(new URL('index.html', www), html);

console.log(`Copied ${files.length + licences.length} web files from the repo root into android-app/www/`);
