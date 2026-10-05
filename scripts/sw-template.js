/* global VERSION, URLS */
const CACHE = `soundmap-release-${VERSION}`;
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        await cache.addAll(URLS);
      } catch (error) {
        await caches.delete(CACHE);
        throw error;
      }
    })(),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      // Retain the preceding releases for tabs still displaying an older shell.
      const names = (await caches.keys()).filter((k) =>
        k.startsWith("soundmap-release-"),
      );
      for (const name of names.slice(0, -3))
        if (name !== CACHE) await caches.delete(name);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "STATUS")
    event.source?.postMessage({ type: "OFFLINE_READY", version: VERSION });
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/auth")
  )
    return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches
        .open(CACHE)
        .then((c) => c.match("/index.html"))
        .then((r) => r ?? fetch(event.request)),
    );
    return;
  }
  if (URLS.includes(url.pathname))
    event.respondWith(
      caches
        .open(CACHE)
        .then((c) => c.match(url.pathname))
        .then((r) => r ?? fetch(event.request)),
    );
});
