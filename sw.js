// Bump VERSION on every release. Old caches are deleted on activate.
const VERSION = "2026-05-10-1";
const CACHE_NAME = `paynow-qr-${VERSION}`;
const OFFLINE_URL = "./offline.html";

const PRECACHE = [
  "./",
  "./index.html",
  "./offline.html",
  "./styles.css",
  "./js/app.js",
  "./js/paynowqr.min.js",
  "./js/qrious.min.js",
  "./img/paynow_logo.jpg",
  "./img/favicon.svg",
  "./manifest.json",
];

// Install — precache the app shell, but do NOT skipWaiting automatically.
// We wait until the page tells us via postMessage so the user controls the moment.
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
});

// Activate — delete every cache that isn't the current version, then claim clients.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Page → SW message channel: skipWaiting, version probe.
self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (e.data?.type === "GET_VERSION") e.ports[0]?.postMessage({ version: VERSION });
});

// Fetch routing:
//   - navigation requests → network-first, fall back to cache, fall back to offline.html
//   - other GETs → stale-while-revalidate
//   - non-GET / cross-origin POST → bypass
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    e.respondWith(networkFirst(req));
    return;
  }

  if (new URL(req.url).origin === self.location.origin) {
    e.respondWith(staleWhileRevalidate(req));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(req);
    return cached || cache.match(OFFLINE_URL);
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  const networkPromise = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || networkPromise || fetch(req);
}
