(function () {
    // Глобальная переменная для хранения GPS-позиции
    window.currentGpsPosition = null;

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

    // Функция обновления GPS-позиции каждые 3 минуты
    function updateGpsPosition() {
        if (!navigator.geolocation) {
            console.error("Geolocation не поддерживается вашим браузером.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            function (position) {
                window.currentGpsPosition = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    timestamp: position.timestamp
                };
            },
            function (error) {
                console.error("Логирование: Ошибка получения GPS-позиции:", error);
            }
        );
    }

    // Функция обновления плашек аэродромов каждые 30 секунд или по изменению dropdown
    function updatePlacards() {
        const routeSelect = document.getElementById('routeSelect');
        if (routeSelect) {
            if (routeSelect.value === 'recent') {
                return;
            }
        }

        if (!window.currentGpsPosition) {
            console.warn("Логирование: GPS-позиция ещё не установлена.");
            return;
        }

        const currentLat = window.currentGpsPosition.latitude;
        const currentLon = window.currentGpsPosition.longitude;

        const historyContainer = document.getElementById('historyContainer');
        if (!historyContainer) {
            console.warn("Логирование: Не найден контейнер historyContainer");
            return;
        }

        // Вместо historyContainer.children берём только кнопки
        const buttons = historyContainer.querySelectorAll('button');

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

    // Обновляем GPS-позицию каждые 3 минуты (180000 мс)
    setInterval(updateGpsPosition, 180000);
    // Обновляем плашки аэродромов каждые 30 секунд (30000 мс)
    setInterval(updatePlacards, 30000);

    // При изменении значения в dropdown с id "routeSelect" немедленно обновляем плашки
    const routeSelect = document.getElementById('routeSelect');
    if (routeSelect) {
        routeSelect.addEventListener('change', () => {
            setTimeout(updatePlacards, 100);
        });
    }
})();