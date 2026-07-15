const CACHE = 'bil-v3.0.1';
const SHELL = [
  '/', '/index.html', '/cases.html', '/dashboard.html', '/profiler.html',
  '/government-demo.html', '/governance.html', '/guided-demo.html',
  '/product-brief.html', '/manifest.webmanifest', '/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE);
        try { await cache.put(request, response.clone()); } catch (_) {}
      }
      return response;
    } catch (_) {
      return (await caches.match(request)) || (await caches.match('/index.html'));
    }
  })());
});
