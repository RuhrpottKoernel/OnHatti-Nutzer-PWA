/* OnHatti Nutzer-PWA · A1.146 R2 · LOCAL-LOCK L1
   GitHub ist Installationsquelle, NICHT automatische Betriebs-/Updatequelle.
   Nach erfolgreicher Installation startet die PWA immer aus der lokalen App-Huelle.
   Kein Hintergrund-Refresh der index.html, kein Update-Ready, kein Auto-Reload.
   Es werden ausschliesslich eigene Nutzer-PWA-Caches geloescht. */
const CACHE_PREFIX='onhatti-nutzer-';
const CACHE_NAME=CACHE_PREFIX+'a1-146-r2-local-lock-l1';
const APP_SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    for(const url of APP_SHELL){
      try{const response=await fetch(url,{cache:'reload'});if(response&&response.ok)await cache.put(url,response.clone())}catch(_){}
    }
    if(!(await cache.match('./index.html'))&&!(await cache.match('./')))throw new Error('OnHatti index.html konnte nicht fuer den Offline-Betrieb gespeichert werden.');
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith(CACHE_PREFIX)&&name!==CACHE_NAME).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      const local=await cache.match('./index.html')||await cache.match('./');
      if(local)return local;
      // Netzwerk nur als Notfall, wenn noch keinerlei lokale App-Huelle existiert.
      const response=await fetch(request);
      if(response&&response.ok)await cache.put('./index.html',response.clone());
      return response;
    })());
    return;
  }
  event.respondWith((async()=>{
    const cached=await caches.match(request,{ignoreSearch:true});
    if(cached)return cached;
    const response=await fetch(request);
    if(response&&response.ok){const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone())}
    return response;
  })());
});
