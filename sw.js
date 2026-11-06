/* DailyDrop PWA service worker.
   Only same-origin app-shell files are cached. Supabase/API requests are never cached. */
const CACHE_NAME = 'dailydrop-shell-v1';
const BASE = self.registration.scope;
const PRECACHE = [
  BASE,
  BASE + 'index.html',
  BASE + 'config.js',
  BASE + 'app.js',
  BASE + 'reset.html',
  BASE + 'manifest.webmanifest',
  BASE + 'offline.html',
  BASE + 'vendor/react.js',
  BASE + 'vendor/react-dom.js',
  BASE + 'vendor/htm.js',
  BASE + 'vendor/supabase.js',
  BASE + 'icons/icon-192.png',
  BASE + 'icons/icon-512.png',
  BASE + 'icons/maskable-512.png',
  BASE + 'icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('dailydrop-shell-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(request)) || (await cache.match(BASE + 'index.html')) ||
      (await cache.match(BASE + 'offline.html'));
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    return Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never intercept Supabase, other APIs, or any request outside this GitHub Pages app.
  if (url.origin !== self.location.origin || !url.href.startsWith(BASE)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Always check for fresh app code/config so website releases become visible promptly.
  if (/(^|\/)(index\.html|app\.js|config\.js|reset\.html)$/.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
