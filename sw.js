const CACHE = 'commentaries-v1';
const SHELL = ['./', './index.html'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))));
self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (e.request.url.includes('/data/')) {
      return caches.open(CACHE).then(c => { c.put(e.request, res.clone()); return res; });
    }
    return res;
  }))
));
