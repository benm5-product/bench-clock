// Bench Clock offline cache. Change VERSION whenever any file below changes,
// so phones pick up the update. With signal, opening the app shows the newest version straight away.
// The Android build (android-app/scripts/copy-web.mjs) also uses this list to know which files to copy.
const VERSION = 'bench-clock-5';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './barlow-condensed-latin-600-normal.woff2',
  './barlow-condensed-latin-700-normal.woff2',
  './atkinson-hyperlegible-latin-400-normal.woff2',
  './atkinson-hyperlegible-latin-700-normal.woff2',
  './barlow-condensed-latin-ext-600-normal.woff2',
  './barlow-condensed-latin-ext-700-normal.woff2',
  './atkinson-hyperlegible-latin-ext-400-normal.woff2',
  './atkinson-hyperlegible-latin-ext-700-normal.woff2'
];

// cache:'reload' skips the browser's own short-term cache, so a new version never saves an old copy.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Opening the app: try for the newest index.html first, so an update shows the first time the app is
// opened with signal. With no signal, or if the network takes over 3 seconds, open the saved copy at once
// (a slow download still finishes in the background and is used next time).
// Fonts and icons: saved copy first, refreshed in the background.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.open(VERSION).then(async cache => {
      const cached = await cache.match('./index.html');
      const network = fetch('./index.html', { cache: 'no-cache' }).then(res => {
        if (res && res.ok) { cache.put('./index.html', res.clone()); return res; }
        return cached || res;
      });
      e.waitUntil(network.catch(() => {}));
      if (!cached) return network;
      const slow = new Promise(ok => setTimeout(() => ok(cached), 3000));
      return Promise.race([network.catch(() => cached), slow]);
    }));
    return;
  }
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(new Request(req, { cache: 'no-cache' })).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    if (cached) e.waitUntil(network.catch(() => {}));
    return cached || network;
  }));
});
