// wakeLock.js

let wakeLock = null;

// Функция для запроса Wake Lock (предотвращает гашение экрана)
async function requestWakeLock() {
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
            console.log('Wake Lock был отпущен');
        });
        console.log('Wake Lock активирован');
    } catch (err) {

    }
}

// Функция для освобождения Wake Lock
async function releaseWakeLock() {
    if (wakeLock !== null) {
        await wakeLock.release();
        wakeLock = null;
        console.log('Wake Lock освобожден');
    }
}

// Обработчик изменения видимости страницы:
// При сворачивании или смене вкладки — отпускаем Wake Lock,
// при возвращении — запрашиваем его заново.
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        requestWakeLock();
    } else {
        releaseWakeLock();
    }
});

// При загрузке страницы сразу запрашиваем Wake Lock, если API поддерживается.
document.addEventListener('DOMContentLoaded', () => {
    if ('wakeLock' in navigator) {
        requestWakeLock();
    } else {
        console.warn('Wake Lock API не поддерживается в этом браузере.');
    }
});