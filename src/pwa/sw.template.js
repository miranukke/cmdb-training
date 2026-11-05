/*
 * Service worker for CIS-DF Trainer.
 * This is a template: vite.config.ts (serviceWorkerPlugin) fills in VERSION and PRECACHE at build
 * time and emits it as sw.js. It only runs in production builds (see registerServiceWorker.ts).
 *
 *  - install:  precache the app shell, build assets, Latin fonts and all exam files (offline-ready)
 *  - navigate + /Exams/*: network first, cache fallback (fresh when online, works offline)
 *  - other same-origin GETs (hashed assets, fonts): cache first
 *  - activate: delete caches from older versions
 */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CACHE = `cisdf-${VERSION}`;
const RUNTIME = 'cisdf-runtime';
// Servers may send "Vary: Origin"/"Vary: Accept-Encoding"; module scripts and fonts are requested
// with an Origin header that the precache requests didn't have, so honouring Vary would miss.
const MATCH = { ignoreSearch: true, ignoreVary: true };

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('cisdf-') && k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' || url.pathname.includes('/Exams/')) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached =
      (await cache.match(request, MATCH)) ||
      (request.mode === 'navigate' ? await cache.match(new URL('./', self.registration.scope).href, MATCH) : undefined);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, MATCH);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const runtime = await caches.open(RUNTIME);
    await runtime.put(request, response.clone());
  }
  return response;
}
