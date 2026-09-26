/* OnHatti stable PWA updater v1
   - App starts from local cache immediately (offline-first).
   - Online, index.html is revalidated in the background.
   - If index.html changed, it is cached and the running app is notified once.
   - This worker stays unchanged across normal OnHatti releases.
   - IndexedDB/localStorage are never touched. */
const APP_ID='nutzer';
const CACHE_NAME='onhatti-'+APP_ID+'-shell-stable-v1';
const INDEX_URL='./index.html';
const SHELL=[INDEX_URL,'./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];

async function responseHash(response){
  try{
    const buf=await response.clone().arrayBuffer();
    const digest=await crypto.subtle.digest('SHA-256',buf);
    return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  }catch(_){
    try{const t=await response.clone().text();let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return t.length+':'+(h>>>0).toString(16)}catch(__){return ''}
  }
}
async function sameResponse(a,b){
  if(!a||!b)return false;
  const ae=a.headers.get('etag'),be=b.headers.get('etag');
  if(ae&&be)return ae===be;
  const al=a.headers.get('last-modified'),bl=b.headers.get('last-modified'),ac=a.headers.get('content-length'),bc=b.headers.get('content-length');
  if(al&&bl&&ac&&bc&&al===bl&&ac===bc)return true;
  const [ah,bh]=await Promise.all([responseHash(a),responseHash(b)]);
  return !!ah&&ah===bh;
}
async function notifyUpdate(hash){
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows){try{client.postMessage({type:'ONHATTI_PWA_UPDATE_READY',hash})}catch(_){}}
}
async function refreshIndex(cache,notify=true){
  try{
    const fresh=await fetch(INDEX_URL,{cache:'no-cache'});
    if(!fresh||!fresh.ok)return {response:null,updated:false,hash:''};
    const old=await cache.match(INDEX_URL);
    const changed=old?!(await sameResponse(old,fresh)):true;
    const hash=await responseHash(fresh);
    await cache.put(INDEX_URL,fresh.clone());
    if(notify&&old&&changed&&hash)await notifyUpdate(hash);
    return {response:fresh,updated:changed,hash};
  }catch(_){return {response:null,updated:false,hash:''}}
}
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    for(const url of SHELL){
      try{const r=await fetch(url,{cache:'reload'});if(r&&r.ok)await cache.put(url,r.clone())}catch(_){}
    }
    if(!(await cache.match(INDEX_URL)))throw new Error('OnHatti index.html konnte nicht offline gespeichert werden.');
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>{
      if(name===CACHE_NAME)return false;
      if(APP_ID==='firma'){
        if(name.startsWith('onhatti-firma-bound-'))return false;
        return name.startsWith('onhatti-firma-a1-')||name.startsWith('onhatti-firma-offline-')||name.startsWith('onhatti-firma-shell-');
      }
      return name.startsWith('onhatti-nutzer-')||name.startsWith('onhatti-user-')||name.startsWith('onhatti-nutzer-shell-');
    }).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'||url.pathname.endsWith('/index.html')){
    const cachePromise=caches.open(CACHE_NAME);
    const updatePromise=(async()=>refreshIndex(await cachePromise,true))();
    event.waitUntil(updatePromise.then(()=>undefined));
    event.respondWith((async()=>{
      const cache=await cachePromise;
      const local=await cache.match(INDEX_URL);
      if(local)return local;
      const fresh=await updatePromise;if(fresh.response)return fresh.response;
      throw new Error('OnHatti ist offline und es ist noch keine lokale App-Hülle vorhanden.');
    })());
    return;
  }
  event.respondWith((async()=>{
    const cached=await caches.match(req,{ignoreSearch:true});
    if(cached)return cached;
    try{const fresh=await fetch(req);if(fresh&&fresh.ok){const cache=await caches.open(CACHE_NAME);await cache.put(req,fresh.clone())}return fresh}catch(_){return Response.error()}
  })());
});
