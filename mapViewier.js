function getCssVar(varName, defaultColor) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || defaultColor;
}

function showRouteMap(routeData) {
    let mapModal, canvas, ctx;
    let mapCenterLat = 0,
        mapCenterLon = 0;
    let baseScale = 100;
    let userZoom = 1;
    let isDragging = false;
    let dragStartX = 0,
        dragStartY = 0;

    const maxFontSize = 5;

    let gpsTracking = false;
    let trackingTimer = null;

    // "Коллекция" запасных аэродромов (lat/lon).
    // Получаем их из airportsDB
    let alternateCoords = [];
    routeData.alternates.forEach(function(icao) {
        if (airportInfoDb[icao]) {
            alternateCoords.push({
                lat: airportInfoDb[icao].latitude,
                lon: airportInfoDb[icao].longitude,
                icao: icao
            });
        }
    });

    function isColliding(rect1, rect2) {
        return !(rect1.x + rect1.width < rect2.x ||
                 rect1.x > rect2.x + rect2.width ||
                 rect1.y + rect1.height < rect2.y ||
                 rect1.y > rect2.y + rect2.height);
    }

    function animatePan(newLat, newLon) {
        const duration = 500; // время анимации в мс
        const startLat = mapCenterLat, startLon = mapCenterLon;
        const diffLat = newLat - startLat;
        const diffLon = newLon - startLon;
        let startTime = null;
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            mapCenterLat = startLat + diffLat * progress;
            mapCenterLon = startLon + diffLon * progress;
            drawMap();
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }
        requestAnimationFrame(step);
    }

    function getAirpotWeatherColor(icao) {
        const colObj = icaoColors[icao];

        // Если нет цветовых данных - ставим дефолт
        if (!colObj) {
            return;
        }

        // Проверяем, когда это обновлялось
        if (!colObj.updatedAt) {
            return;
        } else {
            const updatedTime = new Date(colObj.updatedAt).getTime();
            const nowTime = Date.now();
            const diffHours = (nowTime - updatedTime) / (1000 * 60 * 60);

            // Если старше 10 часов
            if (diffHours > 10) {
                return;
            }
        }

        // Обрабатываем metarColor / tafColor
        const metarColor = colObj.metarColor ?
            colObj.metarColor.replace('color-', '') :
            'green';
        const tafColor = colObj.tafColor ?
            colObj.tafColor.replace('color-', '') :
            'green';

        const colors = {
            "green": "--badge-green-bg",
            "yellow": "--badge-orange-bg",
            "red": "--badge-red-bg",
            "purple": "--badge-red-bg"
        }

        const metarColorCss = getCssVar(colors[metarColor]) || metarColor;
        const tafColorCss = getCssVar(colors[tafColor]) || tafColor;

        return [metarColorCss, tafColorCss]
    }

    // Основная функция отрисовки
    function drawMap() {
        if (!canvas || !ctx) return;

        const bgColor = getCssVar('--bg-color', '#f8f9fa');
        const textColor = getCssVar('--text-color', '#333333');
        const accentColor = getCssVar('--accent-color', '#0077ff');
        const borderColor = getCssVar('--border-color', '#dddddd');
        const cardBg = getCssVar('--card-bg', '#f9f9fa');
        const badgeGreenBg = getCssVar('--badge-green-bg', '#27ae60');
        const badgeTextColor = getCssVar('--badge-text-color', '#ffffff');
        const mapBgColor = getCssVar('--map-bg', '#ffffff');
        const gpsPointColor = getCssVar('--gps-point-color', '#0077ff');

        let rect = canvas.getBoundingClientRect();
        let w = rect.width,
            h = rect.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = mapBgColor;
        ctx.fillRect(0, 0, w, h);

        let scale = baseScale * userZoom;

        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);

        // Преобразование lat/lon -> x,y
        function toCanvas(lat, lon) {
            let dx = lon - mapCenterLon;
            let dy = mapCenterLat - lat;
            return { x: dx, y: dy };
        }

        function getTangent(i) {
            let coords = routeData.coords;
            if (coords.length < 2) return { dx: 1, dy: 0 };
            if (i === 0) {
                let c0 = toCanvas(coords[0].lat, coords[0].lon);
                let c1 = toCanvas(coords[1].lat, coords[1].lon);
                return { dx: c1.x - c0.x, dy: c1.y - c0.y };
            } else if (i === coords.length - 1) {
                let cPrev = toCanvas(coords[i - 1].lat, coords[i - 1].lon);
                let cCurr = toCanvas(coords[i].lat, coords[i].lon);
                return { dx: cCurr.x - cPrev.x, dy: cCurr.y - cPrev.y };
            } else {
                let cPrev = toCanvas(coords[i - 1].lat, coords[i - 1].lon);
                let cNext = toCanvas(coords[i + 1].lat, coords[i + 1].lon);
                return { dx: cNext.x - cPrev.x, dy: cNext.y - cPrev.y };
            }
        }

        function getNormal(tangent) {
            // Выбираем нормаль в одну сторону (например, (dy, -dx))
            return { dx: tangent.dy, dy: -tangent.dx };
        }

        // Стиль линии маршрута
        if (routeData.coords && routeData.coords.length > 0) {
            ctx.beginPath();
            routeData.coords.forEach(function(p, i) {
                let c = toCanvas(p.lat, p.lon);
                if (i === 0) ctx.moveTo(c.x, c.y);
                else ctx.lineTo(c.x, c.y);
            });
            ctx.strokeStyle = 'black'; // Чёрный контур
            ctx.lineWidth = 10 / scale; // Увеличенная толщина для контура
            ctx.lineJoin = "round";
            ctx.stroke();

            // Рисуем основную линию маршрута (можете изменить цвет на более яркий, если хотите)
            ctx.beginPath();
            routeData.coords.forEach(function(p, i) {
                let c = toCanvas(p.lat, p.lon);
                if (i === 0) ctx.moveTo(c.x, c.y);
                else ctx.lineTo(c.x, c.y);
            });
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 6 / scale; // Чуть уже, чем контур
            ctx.stroke();

            // Точки маршрута
            routeData.coords.forEach(function(p, i) {
                let c = toCanvas(p.lat, p.lon);
                let r = 12 / scale;
                let angle = Math.PI / 180;
                ctx.beginPath();
                ctx.moveTo(c.x, c.y - r); // Верхняя точка
                ctx.lineTo(c.x + r * Math.cos(30 * angle), c.y + r * Math.sin(30 * angle)); // Правая нижняя точка
                ctx.lineTo(c.x + r * Math.cos(150 * angle), c.y + r * Math.sin(150 * angle)); // Левая нижняя точка
                ctx.closePath();
                ctx.fillStyle = "#4ea5ff"; // Синяя заливка
                ctx.fill();
                ctx.lineWidth = 2 / scale;
                ctx.strokeStyle = 'black'; // Чёрная обводка
                ctx.stroke();


                if (p.name) {
                    let tangent = getTangent(i);
                    let normal = getNormal(tangent);
                    // Нормализуем нормаль
                    let len = Math.sqrt(normal.dx * normal.dx + normal.dy * normal.dy) || 1;
                    normal.dx /= len;
                    normal.dy /= len;

                    let offsetDistance = 25 / scale;
                    let offsetX = normal.dx * offsetDistance * 1.5;
                    let offsetY = normal.dy * offsetDistance * 1.5;

                    ctx.font = `${Math.min(14 / scale, 12)}px 'Roboto', sans-serif`;
                    let textWidth = ctx.measureText(p.name).width;

                    // Рисуем фон подписи со смещением по нормали
                    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
                    ctx.beginPath();
                    ctx.roundRect(
                        c.x + offsetX,
                        c.y + offsetY,
                        textWidth + 12 / scale,
                        20 / scale,
                        6 / scale
                    );
                    ctx.fill();

                    // Рисуем текст (подкорректируйте внутреннее смещение при необходимости)
                    ctx.fillStyle = badgeTextColor;
                    ctx.fillText(p.name, c.x + offsetX + 6 / scale, c.y + offsetY + 15 / scale);
                }
            });
        }

        // Стиль запасных аэродромов с раскраской кружка по половинам
        alternateCoords.forEach(function(alt) {
            let c = toCanvas(alt.lat, alt.lon);
            let r = 8 / scale;

            // Рисуем крест внутри кружка (как и раньше)
            let crossHalf = r * 1.7;
            ctx.beginPath();
            ctx.moveTo(c.x - crossHalf, c.y);
            ctx.lineTo(c.x + crossHalf, c.y);
            ctx.moveTo(c.x, c.y - crossHalf);
            ctx.lineTo(c.x, c.y + crossHalf);
            ctx.lineWidth = 2 / scale;
            ctx.strokeStyle = 'black';
            ctx.stroke();

            // Получаем массив цветов для аэропорта
            let colorArr = getAirpotWeatherColor(alt.icao);
            let fillLeft, fillRight;
            if (colorArr && colorArr.length === 2) {
                fillLeft = colorArr[1];
                fillRight = colorArr[0];
            } else {
                // Если цветов нет, используем цвет фона по умолчанию
                fillLeft = getCssVar('--map-bg', '#f8f9fa');
                fillRight = fillLeft;
            }

            // Заливаем весь круг левым цветом
            ctx.beginPath();
            ctx.arc(c.x, c.y, r, 0, 2 * Math.PI);
            ctx.fillStyle = fillLeft;
            ctx.fill();

            // Рисуем левую половину кружка
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.arc(c.x, c.y, r, Math.PI/2, 3*Math.PI/2, true);
            ctx.closePath();
            ctx.fillStyle = fillLeft;
            ctx.fill();

            // Рисуем правую половину кружка
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.arc(c.x, c.y, r, -Math.PI/2, Math.PI/2, true);
            ctx.closePath();
            ctx.fillStyle = fillRight;
            ctx.fill();

            // Обводка всего кружка
            ctx.beginPath();
            ctx.arc(c.x, c.y, r, 0, 2 * Math.PI);
            ctx.lineWidth = 2 / scale;
            ctx.strokeStyle = 'black';
            ctx.stroke();

            const atisFrq = getAtisFrequencyByIcao(alt.icao);
            const airportInfo = alt.icao + (atisFrq ? '\n' + atisFrq : '');

            // Подпись ICAO (без изменений)
            ctx.font = `${Math.min(14 / scale, 12)}px 'Roboto', sans-serif`;
            let textWidth = ctx.measureText(airportInfo).width;
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.beginPath();
            ctx.roundRect(
                c.x + 10 / scale,
                c.y - 25 / scale,
                textWidth + 12 / scale,
                20 / scale,
                6 / scale
            );
            ctx.fill();
            ctx.fillStyle = badgeTextColor;
            ctx.fillText(airportInfo, c.x + 16 / scale, c.y - 10 / scale);
        });

        // Стиль геопозиции пользователя
        if (window.currentGpsPosition) {
            let me = toCanvas(window.currentGpsPosition.lat, window.currentGpsPosition.lon);
            ctx.beginPath();
            ctx.arc(me.x, me.y, 10 / scale, 0, 2 * Math.PI);
            ctx.fillStyle = gpsPointColor;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2 / scale;
            ctx.fill();
            ctx.stroke();

            // Подпись "Я здесь"
            ctx.font = `${Math.min(14 / scale, 12)}px 'Roboto', sans-serif`;
            let text = "GPS";
            let textWidth = ctx.measureText(text).width;

            // Фон
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.beginPath();
            ctx.roundRect(me.x + 10 / scale, me.y - 25 / scale,
                        textWidth + 8 / scale, 20 / scale, 4 / scale);

            // Добавляем черную обводку для фона текста
            ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
            ctx.lineWidth = 2 / scale;
            ctx.stroke();
            ctx.fill();

            // Текст
            ctx.fillStyle = "#2c3e50";
            ctx.fillText(text, me.x + 14 / scale, me.y - 10 / scale);
        }

        ctx.restore();
    }

    // При mouseup (или mouseleave) меняем центр карты
    function applyPan(dx, dy) {
        let scale = baseScale * userZoom;
        mapCenterLon -= dx / scale;
        mapCenterLat += dy / scale;
    }

    // Центр на мою геопозицию
    function centerOnUser() {
        if (!window.currentGpsPosition) return;
        mapCenterLat = window.currentGpsPosition.lat;
        mapCenterLon = window.currentGpsPosition.lon;
        drawMap();
    }

    // Вычисляем bounding box только по основному маршруту
    // (Если хотите включать запасные в начальное масштабирование — расширьте BBox под alternates тоже)
    function initCenterAndScale() {
        let bounds = computeBounds(routeData.coords);
        // Если нужно учесть запасные:
        // let altBounds= computeBounds(alternateCoords);
        // Расширить bounds...

        let rect = canvas.getBoundingClientRect();
        let w = rect.width,
            h = rect.height;
        let geoWidth = bounds.maxLon - bounds.minLon;
        let geoHeight = bounds.maxLat - bounds.minLat;
        mapCenterLat = (bounds.maxLat + bounds.minLat) / 2;
        mapCenterLon = (bounds.maxLon + bounds.minLon) / 2;

        let scaleX = w / geoWidth,
            scaleY = h / geoHeight;
        baseScale = Math.min(scaleX, scaleY) * 0.9;
        userZoom = 1;
        console.log("initCenter:", mapCenterLat, mapCenterLon, baseScale);
    }

    function computeBounds(arr) {
        let minLat = Infinity,
            maxLat = -Infinity;
        let minLon = Infinity,
            maxLon = -Infinity;
        arr.forEach(function(p) {
            if (p.lat < minLat) minLat = p.lat;
            if (p.lat > maxLat) maxLat = p.lat;
            if (p.lon < minLon) minLon = p.lon;
            if (p.lon > maxLon) maxLon = p.lon;
        });
        if (minLat === maxLat) maxLat += 0.001;
        if (minLon === maxLon) maxLon += 0.001;
        return {
            minLat,
            maxLat,
            minLon,
            maxLon
        };
    }

    // Геолокация
    function startGeo(){
        userZoom = 3; // Устанавливаем масштаб в 5 раз больше
        centerOnUser(); // Центрируем карту на геопозиции пользователя
        drawMap();
    }

    // ===== Создаём модалку и canvas ====
    function openModal() {
        if (!mapModal) {
            mapModal = document.createElement("div");
            mapModal.className = "modal-backdrop show";

            let modalContent = document.createElement("div");
            modalContent.className = "modal";
            modalContent.id = 'modalMap';

            modalContent.style.width = "90%";
            modalContent.style.height = "90%";
            modalContent.style.position = "relative";
            modalContent.style.overflow = "hidden";

            let closeBtn = document.createElement("button");
            closeBtn.className = "modal-close-btn";
            closeBtn.innerHTML = '<i class="fas fa-times"></i>';
            closeBtn.onclick = () => {
                mapModal.style.display = "none";
            };
            modalContent.appendChild(closeBtn);

            closeBtn.addEventListener('click', () => {
                document.body.removeChild(mapModal);
                mapModal = null;
            });

            let controlsDiv = document.createElement("div");
            controlsDiv.className = "map-controls";
            controlsDiv.innerHTML = `
                <button id="zoomMapInBtn"><i class="fa-solid fa-plus"></i></button>
                <button id="zoomMapOutBtn"><i class="fa-solid fa-minus"></i></button>
                <button id="centerMapGeoBtn"><i class="fa-solid fa-location-arrow"></i></button>
            `;
            modalContent.appendChild(controlsDiv);

            canvas = document.createElement("canvas");
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            modalContent.appendChild(canvas);

            mapModal.appendChild(modalContent);
            document.body.appendChild(mapModal);

            setTimeout(function() {
                let rect = canvas.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx = canvas.getContext("2d");
                ctx.scale(dpr, dpr);
                // Инициализируем
                initCenterAndScale();
                drawMap();

                const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                darkMediaQuery.addEventListener('change', (e) => {
                    // Если нужно полностью пересоздать карту (например, обновить CSS-переменные)
                    drawMap();
                });

                startGeo();

                // Добавьте этот блок для обновления позиции из window.currentGpsPosition каждые 60 секунд:
                setInterval(function() {
                    if (window.currentGpsPosition) {
                        drawMap();
                    }
                }, 60000);
            }, 0);

            // DRAG
            canvas.addEventListener("mousedown", (e) => {
                isDragging = true;
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                // Если режим слежения активен, отключаем его при начале перетаскивания
                if (gpsTracking) {
                    gpsTracking = false;
                    clearInterval(trackingTimer);
                    document.getElementById("centerMapGeoBtn").classList.remove("tracking-active");
                }
            });
            canvas.addEventListener("mousemove", (e) => {
                if (isDragging) {
                    // временно:
                    let dx = e.clientX - dragStartX;
                    let dy = e.clientY - dragStartY;
                    // сохраняем старые центр
                    let oldLat = mapCenterLat,
                        oldLon = mapCenterLon;
                    applyPan(dx, dy);
                    drawMap();
                    // откатываем
                    mapCenterLat = oldLat;
                    mapCenterLon = oldLon;
                }
            });
            canvas.addEventListener("mouseup", (e) => {
                if (isDragging) {
                    isDragging = false;
                    let dx = e.clientX - dragStartX;
                    let dy = e.clientY - dragStartY;
                    applyPan(dx, dy);
                    drawMap();
                }
            });
            canvas.addEventListener("mouseleave", (e) => {
                if (isDragging) {
                    isDragging = false;
                    let dx = e.clientX - dragStartX;
                    let dy = e.clientY - dragStartY;
                    applyPan(dx, dy);
                    drawMap();
                }
            });

            // Wheel = zoom
            canvas.addEventListener("wheel", (e) => {
                e.preventDefault();
                let factor = (e.deltaY < 0) ? 1.1 : 0.9;
                userZoom *= factor;
                drawMap();
            });

            canvas.addEventListener("touchstart", (e) => {
                isDragging = true;
                const touch = e.touches[0];
                dragStartX = touch.clientX;
                dragStartY = touch.clientY;
            });

            canvas.addEventListener("touchmove", (e) => {
                if (!isDragging) return;
                const touch = e.touches[0];
                let dx = touch.clientX - dragStartX;
                let dy = touch.clientY - dragStartY;
                applyPan(dx, dy);
                drawMap();
                dragStartX = touch.clientX;
                dragStartY = touch.clientY;
                e.preventDefault(); // чтобы предотвратить скроллинг страницы

                // Если режим слежения активен, отключаем его при начале перетаскивания
                if (gpsTracking) {
                    gpsTracking = false;
                    clearInterval(trackingTimer);
                    document.getElementById("centerMapGeoBtn").classList.remove("tracking-active");
                }
            });

            canvas.addEventListener("touchend", (e) => {
                isDragging = false;
            });

            // Кнопки
            document.getElementById("zoomMapInBtn").addEventListener("click", () => {
                userZoom *= 1.3;
                drawMap();
            });
            document.getElementById("zoomMapOutBtn").addEventListener("click", () => {
                userZoom /= 1.3;
                drawMap();
            });
            document.getElementById("centerMapGeoBtn").addEventListener("click", () => {
                if (!window.currentGpsPosition) return;
                // Проверяем, насколько центр карты близок к GPS-позиции
                const latDiff = Math.abs(mapCenterLat - window.currentGpsPosition.lat);
                const lonDiff = Math.abs(mapCenterLon - window.currentGpsPosition.lon);
                const threshold = 0.01; // подберите порог (например, 0.01 градуса)

                if (latDiff < threshold && lonDiff < threshold) {
                    // Если уже сцентрировано, переключаем режим отслеживания
                    gpsTracking = !gpsTracking;
                    // Добавляем/удаляем класс для изменения цвета кнопки
                    document.getElementById("centerMapGeoBtn").classList.toggle("tracking-active", gpsTracking);

                    if (gpsTracking) {
                        // Запускаем обновление GPS раз в 3 секунды
                        trackingTimer = setInterval(() => {
                            navigator.geolocation.getCurrentPosition((pos) => {
                                const newLat = pos.coords.latitude;
                                const newLon = pos.coords.longitude;
                                animatePan(newLat, newLon);
                            });
                        }, 3000);
                    } else {
                        clearInterval(trackingTimer);
                    }
                } else {
                    // Если карта не сцентрирована, сразу центрируем и отключаем отслеживание
                    gpsTracking = false;
                    document.getElementById("centerMapGeoBtn").classList.remove("tracking-active");
                    centerOnUser();
                }
            });

        } else {
            mapModal.style.display = "flex";
            drawMap();
            startGeo();
        }
    }

    openModal();
}

// ======= Демо: нажимаем кнопку, вызываем showRouteMap(...) =======
document.addEventListener("DOMContentLoaded", function() {
    let btn = document.getElementById("showMapBtn");
    if (btn) {
        btn.addEventListener("click", function() {
            // Вызываем нашу универсальную функцию
            showRouteMap(JSON.parse(localStorage.getItem('tempRoute') || '{}'));
        });
    }
});