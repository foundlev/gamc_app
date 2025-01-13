const CACHE_NAME = "wind-calculator-cache-v4";
const CACHE_URLS = [
  "/logo.png",
  "/index.html",
  "/main.css",
  "/main.js"
];

// Устанавливаем время жизни кэша в миллисекундах (20 часов)
const CACHE_DURATION = 20 * 60 * 60 * 1000;

// Устанавливаем Service Worker и кэшируем файлы
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      const cachePromises = CACHE_URLS.map(url => {
        return fetch(url).then(response => {
          // Клонируем ответ, чтобы изменить заголовки
          const responseClone = response.clone();
          const headers = new Headers(responseClone.headers);
          // Добавляем текущую временную метку
          headers.append('sw-cache-timestamp', Date.now());
          // Создаем новый ответ с обновленными заголовками
          const modifiedResponse = new Response(responseClone.body, {
            status: responseClone.status,
            statusText: responseClone.statusText,
            headers: headers
          });
          // Сохраняем в кэш
          return cache.put(url, modifiedResponse);
        });
      });
      return Promise.all(cachePromises);
    })
  );
});

// Активируем Service Worker и удаляем старые кэши
self.addEventListener("activate", event => {
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
      return cache.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          // Получаем временную метку из заголовков
          const cachedTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
          const cacheAge = Date.now() - cachedTimestamp;
          if (cacheAge > CACHE_DURATION) {
            // Кэш устарел, обновляем из сети
            return fetchAndUpdateCache(event.request, cache);
          } else {
            // Возвращаем кэшированный ответ
            return cachedResponse;
          }
        } else {
          // Нет в кэше, запрашиваем из сети
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
