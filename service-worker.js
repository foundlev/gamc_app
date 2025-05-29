const CACHE_NAME = 'gamc-app-v2';

const PRECACHE = [
  './',                     // fallback для навигаций
  './index.html',
  './main.css',
  './main.js',
  './logo.png',
  './manifest.json',

  /* data */
  './data/airports_db.json',

  /* JS-модули (добавьте сюда новые, если появятся) */
  './aiInteraction.js',
  './airportSystems.js',
  './extra.js',
  './extraTwo.js',
  './gpsUpdater.js',
  './mapViewier.js',
  './notamUtils.js',
  './routeCreator.js',
  './synchash.js',
  './wakeLock.js'
];

/* ---------- INSTALL ---------- */
self.addEventListener('install', event => {
  self.skipWaiting();                       // моментальная активация
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener('activate', event => {
  self.clients.claim();                     // берём управление страницей
  event.waitUntil(
    caches.keys().then(all =>
      Promise.all(all.map(name => name !== CACHE_NAME && caches.delete(name)))
    )
  );
});

/* ---------- FETCH ---------- */
self.addEventListener('fetch', event => {
  const { request } = event;

  /* 1. Для переходов по страницам всегда отдаём index.html */
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html', { ignoreSearch: true })
            .then(resp => resp || fetch(request))
    );
    return;
  }

  /* 2. Для остальных запросов — Cache-First, затем сеть */
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(netResp => {
        if (netResp.ok) {
          const clone = netResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return netResp;
      });
    })
  );
});