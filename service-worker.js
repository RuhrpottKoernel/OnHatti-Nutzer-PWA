/* OnHatti Nutzer-PWA · bewährte OFFLINE-FIRST-Hülle · A1.146 R2 Runtime
   WICHTIG: Löscht ausschließlich eigene Nutzer-PWA-Caches. */
const CACHE_NAME = 'onhatti-nutzer-a1-146-r2-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of APP_SHELL) {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response && response.ok) await cache.put(url, response.clone());
      } catch (_) {}
    }
    if (!(await cache.match('./index.html')) && !(await cache.match('./'))) {
      throw new Error('OnHatti index.html konnte nicht fuer den Offline-Betrieb gespeichert werden.');
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith('onhatti-nutzer-') && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const local = await cache.match('./index.html') || await cache.match('./');
      if (local) return local;
      const response = await fetch(request);
      if (response && response.ok) await cache.put('./index.html', response.clone());
      return response;
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
