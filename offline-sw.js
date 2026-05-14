const OFFLINE_CACHE_NAME = "optical-offline-entry-v3";
const OFFLINE_APP_SHELL = [
  "./Fill_APP_offline.html",
  "./manifest.webmanifest",
  "./assest/image/BB.jpeg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE_NAME)
      .then(cache => cache.addAll(OFFLINE_APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key !== OFFLINE_CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isGoogleScriptApi = url.hostname === "script.google.com" || url.hostname === "script.googleusercontent.com";
  if (isGoogleScriptApi) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(OFFLINE_CACHE_NAME)
            .then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("./Fill_APP_offline.html")))
  );
});
