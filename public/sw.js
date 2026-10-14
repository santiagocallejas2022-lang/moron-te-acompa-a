const CACHE_NAME = 'moron-te-acompana-v2';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

/* =====================================================
   INSTALAR
===================================================== */

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );

  self.skipWaiting();
});

/* =====================================================
   ACTIVAR
===================================================== */

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(
          nombres
            .filter((nombre) => nombre !== CACHE_NAME)
            .map((nombre) => caches.delete(nombre))
        )
      )
  );

  self.clients.claim();
});

/* =====================================================
   FETCH
===================================================== */

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((respuesta) => {
          const copia = respuesta.clone();

          caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));

          return respuesta;
        })
        .catch(() => caches.match('/index.html'))
    );

    return;
  }

  event.respondWith(
    caches.match(request).then((cacheado) => {
      if (cacheado) {
        return cacheado;
      }

      return fetch(request).then((respuesta) => {
        if (!respuesta || respuesta.status !== 200) {
          return respuesta;
        }

        const copia = respuesta.clone();

        caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));

        return respuesta;
      });
    })
  );
});
