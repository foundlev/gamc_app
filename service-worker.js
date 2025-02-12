const CACHE_NAME = "wind-calculator-cache-v4";
const CACHE_URLS = [
  "/logo.png",
  "/index.html",
  "/main.css",
  "/main.js",
  "/data/airports_db.json",
  "/manifest.json"
];

// Устанавливаем Service Worker и кэшируем файлы
self.addEventListener("install", event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            const cachePromises = CACHE_URLS.map(url => {
                return fetch(url).then(response => {
                    const responseClone = response.clone();
                    const headers = new Headers(responseClone.headers);
                    headers.append('sw-cache-timestamp', Date.now());
                    const modifiedResponse = new Response(responseClone.body, {
                        status: responseClone.status,
                        statusText: responseClone.statusText,
                        headers: headers
                    });
                    return cache.put(url, modifiedResponse);
                });
            });
            return Promise.all(cachePromises);
        })
    );
});

self.addEventListener("activate", event => {
    self.clients.claim();
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Обрабатываем запросы: проверяем возраст кэша и обновляем при необходимости
self.addEventListener("fetch", event => {
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            // Если это навигационный запрос – возвращаем оболочку приложения
            if (event.request.mode === "navigate") {
                return cache.match("/gamc_app/index.html");
            }
            return cache.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    const cachedTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
                    const cacheAge = Date.now() - cachedTimestamp;
                    return cachedResponse;
                } else {
                    return fetchAndUpdateCache(event.request, cache);
                }
            });
        })
    );
});

// Функция для запроса из сети и обновления кэша
function fetchAndUpdateCache(request, cache) {
  return fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      // Клонируем ответ и добавляем временную метку
      const responseClone = networkResponse.clone();
      const headers = new Headers(responseClone.headers);
      headers.append('sw-cache-timestamp', Date.now());
      const modifiedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers
      });
      // Сохраняем обновленный ответ в кэш
      cache.put(request, modifiedResponse);
    }
    return networkResponse;
  }).catch(() => {
    // В случае ошибки возвращаем кэшированный ответ, если он есть
    return cache.match(request);
  });
}
