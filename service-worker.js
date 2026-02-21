const CACHE_NAME = 'gamc-app-v10';

const PRECACHE = [
  './',                     // fallback для навигаций
  './index.html',
  './main.css',
  './main.js',
  './logo.svg',
  './manifest.json',

  /* data */
  './data/airports_db.json',

  /* JS-модули (добавьте сюда новые, если появятся) */
  './airportSystems.js',
  './appdata.js',
  './extra.js',
  './extraTwo.js',
  './search.js',
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

  // Не кэшировать запросы к API
  if (request.url.startsWith('https://myapihelper.na4u.ru') || request.url.startsWith('https://aerodesk.na4u.ru')) {
    event.respondWith(
        fetch(request)
            .catch(() => new Response('Ошибка сети', {status: 500}))
    );
    return;
  }

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
