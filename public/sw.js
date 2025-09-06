const STATIC_CACHE = 'nifty-static-v1';
const ASSETS = ['/', '/index.html', '/style.css', '/app.js', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(ASSETS)));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)))
    )
  );
});
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  // network-first for API, cache-first for static
  if (request.url.includes('/api/')) {
    e.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
  } else {
    e.respondWith(
      caches.match(request).then((c) => c || fetch(request))
    );
  }
});
