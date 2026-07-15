const CACHE='bil-v4.1-presentation';
const ASSETS=['/','/index.html','/cases.html','/dashboard.html','/profiler.html','/government-demo.html','/governance.html','/guided-demo.html','/product-brief.html','/manifest.webmanifest','/icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.pathname.startsWith('/api/'))return;                 // engine calls: network only, never cached
  if(url.origin!==self.location.origin)return;                // leave fonts/CDNs to the browser
  e.respondWith(
    fetch(e.request).then(r=>{
      if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{})}
      return r;
    }).catch(()=>caches.match(e.request).then(hit=>hit||caches.match('/index.html')))
  );
});
