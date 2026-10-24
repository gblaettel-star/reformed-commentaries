const CACHE = 'commentaries-v2578';
// Book data lives in its own cache that survives version bumps, so a
// "Download for offline" is not wiped every time the app is updated.
const DATA_CACHE = 'commentaries-data';
const PAGES = [
  './index.html',
  './share.js',
  './scripture-links.js',
  './search-land.js',
  './sanctuary-pages.css',
  './prayer.html',
  './dictionary.html',
  './figures.html',
  './philosophers.html',
  './heresies.html',
  './councils.html',
  './creeds.html',
  './solas.html',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PAGES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== DATA_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Network-first for all HTML pages — always get the latest when online
  // cache: 'no-cache' makes the browser check with GitHub every time instead of reusing its own
  // copy for up to 10 minutes, so a page published a moment ago is seen at once.
  if (PAGES.some(p => url.includes(p.replace('./', ''))) || url.endsWith('/')) {
    e.respondWith(
      fetch(url, { cache: 'no-cache', credentials: 'same-origin' })
        .then(res => {
          const copy = res.clone();
          if (res.ok) caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
    return;
  }

  // Data files and the search index: network-first so fixes arrive at once, falling back to the saved
  // copy when offline -- or after 4 s on a weak signal, if a copy is saved.
  if (url.includes('/data/') || url.includes('/search/')) {
    e.respondWith((async () => {
      const cache = await caches.open(DATA_CACHE);
      const cached = await cache.match(e.request);
      const net = fetch(e.request, { cache: 'no-cache' }).then(res => {
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      });
      if (!cached) return net;
      const slow = new Promise(r => setTimeout(() => r(cached), 4000));
      return Promise.race([net.catch(() => cached), slow]);
    })());
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
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
