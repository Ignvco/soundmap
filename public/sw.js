// SoundMap Service Worker — Network-first con precaché de assets críticos.
//
// Flujo de actualización:
//   1. Se publica un SW nuevo → queda en `waiting` (NO hace skipWaiting solo).
//   2. La app detecta el `waiting` y muestra el toast "Hay una nueva versión".
//   3. El usuario toca "Actualizar" → la app manda {type:"SKIP_WAITING"} → el
//      SW toma el control y la página se recarga.
//
// Antes hacía `skipWaiting()` dentro del install. Consecuencias: (a) el estado
// `waiting` no ocurría casi nunca, así que el toast de use-service-worker.ts era
// código muerto; y (b) el SW nuevo tomaba el control por debajo de una página ya
// corriendo con chunks del build viejo — combinado con el caché cache-first de
// /assets/, un `import()` diferido posterior podía pedir un hash que ya no
// existe y romper la navegación.
const CACHE_VERSION = "soundmap-v3";
const CACHE_STATIC  = `${CACHE_VERSION}-static`;
const CACHE_PAGES   = `${CACHE_VERSION}-pages`;

// Assets que se cachean en el install (shell de la app)
const PRECACHE_URLS = [
  "/",
  "/site.webmanifest",
  "/icon/icon-192.png",
  "/icon/icon-512.png",
];

// ── Install: cachear shell ────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) =>
      // addAll() falla entero si UN recurso falla; así un icono caído no impide
      // que se instale el service worker.
      Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u)))
    )
  );
});

// La app pide explícitamente tomar el control (ver use-service-worker.ts).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// ── Activate: limpiar caches viejos ──────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n.startsWith("soundmap-") && !n.startsWith(CACHE_VERSION))
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: estrategia por tipo de recurso ────────────────────────────────────
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  let url;
  try { url = new URL(event.request.url); }
  catch { return; }

  // Cross-origin: nunca interceptar (Convex, Fonts, etc.)
  if (url.origin !== self.location.origin) return;

  // Auth: nunca cachear (siempre network)
  if (url.pathname.startsWith("/auth")) return;

  // Convex API: nunca cachear
  if (url.pathname.startsWith("/api")) return;

  // Navegación (HTML): network-first, fallback a "/" cacheado
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Guardar la última shell buena. Antes sólo existía la precacheada en
          // el install, que tras un redeploy apuntaba a hashes de assets ya
          // borrados → en offline se servía una shell rota.
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_PAGES).then((c) => c.put("/", clone));
          }
          return response;
        })
        .catch(() =>
          caches.match("/", { cacheName: CACHE_PAGES })
            .then((r) => r ?? caches.match("/"))
            .then((r) => r ?? new Response("Offline", { status: 503 }))
        )
    );
    return;
  }

  // Assets JS/CSS (tienen hash en el nombre): cache-first
  // Los hashes garantizan que assets nuevos nunca lean caché viejo.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_STATIC).then((c) => c.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Icons, manifest y demás recursos estáticos: network-first con fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_PAGES).then((c) => c.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// NOTA: acá había handlers de `push` y `notificationclick`. Se eliminaron
// porque no hay ningún `pushManager.subscribe()` en la app, así que nunca podía
// llegar una notificación. Si algún día se agregan push reales, este es el
// lugar — pero primero hace falta el flujo de suscripción + claves VAPID.
