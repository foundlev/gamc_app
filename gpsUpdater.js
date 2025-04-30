// Глобальная переменная для хранения GPS-позиции
window.currentGpsPosition = null;
window.gpsLastGot = null;

// Функция перевода градусов в радианы
function toRadians(deg) {
    return deg * Math.PI / 180;
}

// Haversine функция для расчёта расстояния (в морских милях)
function haversine(lat1, lon1, lat2, lon2) {
    const R = 3440.065; // радиус Земли в морских милях
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lat2 - lat1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
}

// Исправляем опечатку: для dLon нужно использовать (lon2 - lon1)
// Ниже скорректируем функцию полностью:
function haversineFixed(lat1, lon1, lat2, lon2) {
    const R = 3440.065; // радиус Земли в морских милях
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
}

// Функция обновления GPS-позиции
function updateGpsPosition() {
    if (!useGpsPosition) return;

    if (window.gpsLastGot) {
        if (Date.now() - window.gpsLastGot <= 20_000) {
            return;
        }
    }

    if (!navigator.geolocation) {
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            window.currentGpsPosition = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                timestamp: position.timestamp,
                dateTimestamp: Date.now()
            };
            window.gpsLastGot = Date.now();
        },
        function (error) {}
    );
}

// Функция обновления плашек аэродромов каждые 30 секунд или по изменению dropdown
function updatePlacards() {
    const historyContainer = document.getElementById('historyContainer');
    if (!historyContainer) {
        return;
    }

    // Вместо historyContainer.children берём только кнопки
    const buttons = historyContainer.querySelectorAll('button');
    const routeSelect = document.getElementById('routeSelect');

    if (!routeSelect || routeSelect.value === 'recent' || !window.currentGpsPosition) {
        for (let btn of buttons) {
            btn.classList.remove('nearby');
        }
        return;
    }

    const currentLat = window.currentGpsPosition.latitude;
    const currentLon = window.currentGpsPosition.longitude;

    for (let btn of buttons) {
        // Пытаемся сначала получить ICAO из data-icao
        let icao = btn.textContent.trim();

        // Если атрибут не задан, извлекаем из текста кнопки
        if (!icao) {
            const text = btn.textContent.trim();
            // Ищем строго 4 буквы подряд (пример: UUEE)
            // \b - граница слова, чтобы не цеплять что-то лишнее
            const match = text.match(/\b[A-Z]{4}\b/);
            if (match) {
                icao = match[0];
            }
        }

        if (!icao) {
            continue;
        }

        // Получаем позицию аэродрома через глобальную функцию getAirportPosition(icao)
        const airportPos = getAirportPosition(icao);
        if (!airportPos) {
            continue;
        }

        // Вычисляем расстояние (обратите внимание на исправленную функцию haversineFixed)
        const distance = haversineFixed(currentLat, currentLon, airportPos.lat, airportPos.lon);

        if (distance <= 180) {
            btn.classList.add('nearby');
        } else {
            btn.classList.remove('nearby');
        }
    }
}

// Первоначальное обновление GPS-позиции и плашек
updateGpsPosition();
updatePlacards();

// Обновляем GPS-позицию
setInterval(updateGpsPosition, 1_000);
// Обновляем плашки аэродромов
setInterval(updatePlacards, 10_000);

// Отображаем состояние GPS в плашке
setInterval(updateCurrentGPS, 1_000);

// При изменении значения в dropdown с id "routeSelect" немедленно обновляем плашки
const routeSelect = document.getElementById('routeSelect');
if (routeSelect) {
    routeSelect.addEventListener('change', () => {
        setTimeout(updatePlacards, 100);
    });
}

function resetGpsPositionBadge() {
    const gpsTextEl = document.getElementById('currentGPS');
    const gpsBadgeEl = document.getElementById('gpsBadge');

    gpsTextEl.textContent = "Откл.";
    gpsBadgeEl.classList.remove('gps-success', 'gps-outdate');
    gpsBadgeEl.classList.add('gps-error');
}

function updateCurrentGPS() {
    const gpsTextEl = document.getElementById('currentGPS');
    const gpsBadgeEl = document.getElementById('gpsBadge');

    if (!useGpsPosition) {
        resetGpsPositionBadge();
        return;
    }

    if (
        window.currentGpsPosition &&
        typeof window.currentGpsPosition.latitude === 'number' &&
        typeof window.currentGpsPosition.longitude === 'number' &&
        typeof window.currentGpsPosition.timestamp === 'number'
    ) {
        const lat = window.currentGpsPosition.latitude;
        const lon = window.currentGpsPosition.longitude;
        const lastUpdate = window.currentGpsPosition.dateTimestamp;
        const now = Date.now();
        const diff = now - lastUpdate;

        const latAbs = Math.abs(lat).toFixed(2);
        const lonAbs = Math.abs(lon).toFixed(2);
        const latDir = lat >= 0 ? 'N' : 'S';
        const lonDir = lon >= 0 ? 'E' : 'W';

        // Удаляем все стильные классы (gps-error, gps-success, gps-outdate)
        gpsBadgeEl.classList.remove('gps-error', 'gps-success', 'gps-outdate');
        // Если позиция обновлена более N минут назад, выставляем outdated 1 сек = 1 000
        if (diff <= 60_000) {
            gpsTextEl.textContent = `${latAbs}° ${latDir}, ${lonAbs}° ${lonDir}`;
            gpsBadgeEl.classList.add('gps-success');
        } else if (diff <= 300_000) {
            gpsTextEl.textContent = `${latAbs}° ${latDir}, ${lonAbs}° ${lonDir}`;
            gpsBadgeEl.classList.add('gps-outdate');
        } else {
            gpsTextEl.textContent = "-";
            gpsBadgeEl.classList.add('gps-outdate');
        }
    } else {
        gpsTextEl.textContent = "-";
        gpsBadgeEl.classList.remove('gps-success', 'gps-outdate');
        gpsBadgeEl.classList.add('gps-outdate');
    }
}