self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  clients.claim();
});

// Online-first fetch; kırmadan sadece proxy
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
