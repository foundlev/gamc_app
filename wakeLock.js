// wakeLock.js

let wakeLock = null;

// Функция для запроса Wake Lock (предотвращает гашение экрана)
async function requestWakeLock() {
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {});
    } catch (err) {

    }
}

// Функция для освобождения Wake Lock
async function releaseWakeLock() {
    if (wakeLock !== null) {
        await wakeLock.release();
        wakeLock = null;
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