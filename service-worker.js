/* OnHatti Nutzer-PWA A1.146 R2 · REPAIR R4
   Ziel: spätere fehlerhafte Worker-/Cache-Stände sicher verlassen.
   Kein Auto-Update. Keine Datenlöschung. Nur eigene PWA-Shell-Caches.
*/
const CACHE_NAME = 'onhatti-nutzer-a1-146-r2-repair-r4';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of APP_SHELL) {
      const response = await fetch(url, { cache: 'reload' });
      if (!response || !response.ok) throw new Error('OnHatti Shell konnte nicht geladen werden: ' + url);
      await cache.put(url, response.clone());
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name !== CACHE_NAME && name.startsWith('onhatti-nutzer-'))
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
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  })());
});
