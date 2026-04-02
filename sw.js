const CACHE_NAME = "paynow-qr-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./js/app.js",
  "./js/paynowqr.min.js",
  "./js/qrious.min.js",
  "./img/paynow_logo.jpg",
  "./img/favicon.svg",
  "./manifest.json",
];

// Install — cache all static assets
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — cache-first strategy
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        // Only cache same-origin GET requests
        if (
          response.ok &&
          e.request.method === "GET" &&
          e.request.url.startsWith(self.location.origin)
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
