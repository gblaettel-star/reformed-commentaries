const CACHE = 'commentaries-v2340';
const PAGES = [
  './index.html',
  './share.js',
  './scripture-links.js',
  './esv-links.js',
  './prayer.html',
  './dictionary.html',
  './figures.html',
  './philosophers.html',
  './heresies.html',
  './councils.html',
  './creeds.html',
  './solas.html',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PAGES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Network-first for all HTML pages — always get the latest when online
  if (PAGES.some(p => url.includes(p.replace('./', ''))) || url.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          if (res.ok) caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for data files — they don't change once written
  if (url.includes('/data/')) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        const copy = res.clone();
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }))
    );
    return;
  }

  // Default: network-first
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        if (res.ok && e.request.method === 'GET') caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
