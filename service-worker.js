// service-worker.js (cache bump v2)
const CACHE = "chat-pwa-cache-v2";
const ASSETS = ["./","./index.html","./manifest.json","./icon-192.png","./icon-512.png","./service-worker.js","./firebase-app.js","./firebase-config.js"];
self.addEventListener("install", e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener("activate", e=>{ e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e=>{ e.respondWith(caches.match(e.request).then(r=>r || fetch(e.request))); });
