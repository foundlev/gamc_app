function showRouteMap(routeData) {
    // routeData: {
    //   departure: "UUEE",
    //   arrival: "UNKL",
    //   alternates: [...],
    //   coords: [{lat, lon, name}, ... ]
    // }

    let mapModal, canvas, ctx;
    let mapCenterLat = 0,
        mapCenterLon = 0;
    let baseScale = 100;
    let userZoom = 1;
    let userLocation = null;
    let isDragging = false;
    let dragStartX = 0,
        dragStartY = 0;

    const maxFontSize = 5;

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

    // Основная функция отрисовки
    function drawMap() {
        if (!canvas || !ctx) return;
        let w = canvas.width,
            h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        let cardBg = getComputedStyle(document.documentElement)
            .getPropertyValue('--card-bg').trim();
        ctx.fillStyle = cardBg;
        ctx.fillRect(0, 0, w, h);

        let scale = baseScale * userZoom;

        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);

        // Преобразование lat/lon -> x,y
        function toCanvas(lat, lon) {
            let dx = lon - mapCenterLon;
            let dy = mapCenterLat - lat; // "север вверх"
            return {
                x: dx,
                y: dy
            };
        }

        // Рисуем линию маршрута (routeData.coords)
        if (routeData.coords && routeData.coords.length > 0) {
            ctx.beginPath();
            routeData.coords.forEach(function(p, i) {
                let c = toCanvas(p.lat, p.lon);
                if (i === 0) ctx.moveTo(c.x, c.y);
                else ctx.lineTo(c.x, c.y);
            });
            let accentColor = getComputedStyle(document.documentElement)
                .getPropertyValue('--accent-color').trim();
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 2 / scale;
            ctx.stroke();

            // Точки маршрута
            routeData.coords.forEach(function(p) {
                let c = toCanvas(p.lat, p.lon);
                ctx.beginPath();
                ctx.arc(c.x, c.y, 4 / scale, 0, 2 * Math.PI);
                let colFire = getComputedStyle(document.documentElement)
                    .getPropertyValue('--col-fire').trim();
                ctx.fillStyle = colFire;
                ctx.fill();
                if (p.name) {
                    ctx.font = (16 / scale < maxFontSize ? 16 / scale: maxFontSize) + "px sans-serif";
                    console.log(ctx.font);
                    ctx.fillStyle = getComputedStyle(document.documentElement)
                        .getPropertyValue('--text-color').trim();
                    ctx.fillText(p.name, c.x + 8 / scale, c.y - 8 / scale);
                }
            });
        }

        // Рисуем запасные аэродромы (другим цветом, например, голубым)
        alternateCoords.forEach(function(alt) {
            let c = toCanvas(alt.lat, alt.lon);
            ctx.beginPath();
            ctx.arc(c.x, c.y, 5 / scale, 0, 2 * Math.PI);
            ctx.fillStyle = getComputedStyle(document.documentElement)
                .getPropertyValue('--col-instrument').trim();
            ctx.fill();
            // Подпись — ICAO
            ctx.font = (16 / scale < maxFontSize ? 16 / scale: maxFontSize) + "px sans-serif";
            ctx.fillStyle = getComputedStyle(document.documentElement)
                .getPropertyValue('--text-color').trim();
            ctx.fillText(alt.icao, c.x + 10 / scale, c.y - 10 / scale);
        });

        // Геопозиция пользователя
        if (userLocation) {
            let me = toCanvas(userLocation.lat, userLocation.lon);
            ctx.beginPath();
            ctx.arc(me.x, me.y, 6 / scale, 0, 2 * Math.PI);
            ctx.fillStyle = getComputedStyle(document.documentElement)
                .getPropertyValue('--col-rf').trim();
            ctx.fill();
            ctx.font = (16 / scale < maxFontSize ? 16 / scale: maxFontSize) + "px sans-serif";
            ctx.fillStyle = getComputedStyle(document.documentElement)
                .getPropertyValue('--text-color').trim();
            ctx.fillText("Я здесь", me.x + 10 / scale, me.y - 10 / scale);
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
        if (!userLocation) return;
        mapCenterLat = userLocation.lat;
        mapCenterLon = userLocation.lon;
        drawMap();
    }

    // Вычисляем bounding box только по основному маршруту
    // (Если хотите включать запасные в начальное масштабирование — расширьте BBox под alternates тоже)
    function initCenterAndScale() {
        let bounds = computeBounds(routeData.coords);
        // Если нужно учесть запасные:
        // let altBounds= computeBounds(alternateCoords);
        // Расширить bounds...

        let w = canvas.width,
            h = canvas.height;
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
      if(navigator.geolocation){
          navigator.geolocation.getCurrentPosition(function(pos){
              userLocation = {lat: pos.coords.latitude, lon: pos.coords.longitude};
              userZoom = 3; // Устанавливаем масштаб в 5 раз больше
              centerOnUser(); // Центрируем карту на геопозиции пользователя
              drawMap();
          }, function(err){
              console.log("Geo error", err);
          });
      }
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
            modalContent.style.maxWidth = "800px";
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
        <button id="centerMapGeoBtn"><i class="fa-solid fa-location-dot"></i></button>
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
                canvas.width = rect.width;
                canvas.height = rect.height;
                ctx = canvas.getContext("2d");

                // Инициализируем
                initCenterAndScale();
                drawMap();
                startGeo();
            }, 0);

            // DRAG
            canvas.addEventListener("mousedown", (e) => {
                isDragging = true;
                dragStartX = e.clientX;
                dragStartY = e.clientY;
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
                centerOnUser();
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
            let exampleRoute = {
                "departure": "UUEE",
                "arrival": "UNKL",
                "alternates": [
                    "UUWW",
                    "UUBW",
                    "UUDD",
                    "UUDL",
                    "UWGG",
                    "UWPS",
                    "UWLL",
                    "UWKD",
                    "UWLW",
                    "USKK",
                    "USPP",
                    "USSS",
                    "USCC",
                    "USTR",
                    "USHH",
                    "USNN",
                    "UNNT",
                    "UNTT",
                    "UNBB",
                    "UNEE"
                ],
                "coords": [{
                        "lat": 55.9725,
                        "lon": 37.413053,
                        "name": "UUEE"
                    },
                    {
                        "lat": 55.909802,
                        "lon": 37.006886,
                        "name": ""
                    },
                    {
                        "lat": 55.981111,
                        "lon": 36.918224,
                        "name": ""
                    },
                    {
                        "lat": 56.111422,
                        "lon": 37.039639,
                        "name": ""
                    },
                    {
                        "lat": 56.158993,
                        "lon": 37.330624,
                        "name": ""
                    },
                    {
                        "lat": 56.230833,
                        "lon": 37.523886,
                        "name": ""
                    },
                    {
                        "lat": 56.301298,
                        "lon": 37.709124,
                        "name": ""
                    },
                    {
                        "lat": 56.386458,
                        "lon": 37.89276,
                        "name": ""
                    },
                    {
                        "lat": 56.683482,
                        "lon": 37.94585,
                        "name": ""
                    },
                    {
                        "lat": 56.872225,
                        "lon": 38.270561,
                        "name": ""
                    },
                    {
                        "lat": 56.872225,
                        "lon": 38.270561,
                        "name": "RILPO"
                    },
                    {
                        "lat": 57.486114,
                        "lon": 39.24945,
                        "name": "RANTO"
                    },
                    {
                        "lat": 57.627225,
                        "lon": 40.002228,
                        "name": "TUNEG"
                    },
                    {
                        "lat": 57.902503,
                        "lon": 41.562783,
                        "name": "IBREN"
                    },
                    {
                        "lat": 58.538614,
                        "lon": 45.75945,
                        "name": "BAPUN"
                    },
                    {
                        "lat": 58.925281,
                        "lon": 47.46695,
                        "name": "AGNOG"
                    },
                    {
                        "lat": 59.205558,
                        "lon": 48.796117,
                        "name": "SONAT"
                    },
                    {
                        "lat": 59.361947,
                        "lon": 50.776394,
                        "name": "TIKRO"
                    },
                    {
                        "lat": 59.442225,
                        "lon": 52.041672,
                        "name": "BAMAL"
                    },
                    {
                        "lat": 59.504447,
                        "lon": 53.182506,
                        "name": "NEGOK"
                    },
                    {
                        "lat": 59.546669,
                        "lon": 54.571672,
                        "name": "FALBU"
                    },
                    {
                        "lat": 59.588058,
                        "lon": 57.917783,
                        "name": "MOTUB"
                    },
                    {
                        "lat": 59.583892,
                        "lon": 59.089728,
                        "name": "ADANU"
                    },
                    {
                        "lat": 59.895836,
                        "lon": 62.40445,
                        "name": "ULRES"
                    },
                    {
                        "lat": 59.944725,
                        "lon": 63.019172,
                        "name": "IDKOM"
                    },
                    {
                        "lat": 60.013614,
                        "lon": 63.958339,
                        "name": "NALOG"
                    },
                    {
                        "lat": 60.116947,
                        "lon": 64.831672,
                        "name": "PIGUR"
                    },
                    {
                        "lat": 60.027225,
                        "lon": 66.645283,
                        "name": "RITNA"
                    },
                    {
                        "lat": 59.918892,
                        "lon": 68.348617,
                        "name": "UNEKI"
                    },
                    {
                        "lat": 59.823892,
                        "lon": 69.605283,
                        "name": "ADMUR"
                    },
                    {
                        "lat": 59.333889,
                        "lon": 74.498894,
                        "name": "LITUN"
                    },
                    {
                        "lat": 59.182222,
                        "lon": 75.887228,
                        "name": "IMETA"
                    },
                    {
                        "lat": 59.110556,
                        "lon": 76.493894,
                        "name": "MEKSI"
                    },
                    {
                        "lat": 59.078889,
                        "lon": 76.755561,
                        "name": "TEBGI"
                    },
                    {
                        "lat": 58.683889,
                        "lon": 79.682506,
                        "name": "ADIMA"
                    },
                    {
                        "lat": 58.327222,
                        "lon": 82.932506,
                        "name": "KUMOD"
                    },
                    {
                        "lat": 56.912222,
                        "lon": 88.487783,
                        "name": "KELOK"
                    },
                    {
                        "lat": 56.272222,
                        "lon": 90.611117,
                        "name": "ROTLI"
                    },
                    {
                        "lat": 56.283889,
                        "lon": 91.133061,
                        "name": "RANET"
                    },
                    {
                        "lat": 56.28389,
                        "lon": 91.133061,
                        "name": ""
                    },
                    {
                        "lat": 56.420887,
                        "lon": 91.724651,
                        "name": ""
                    },
                    {
                        "lat": 56.392694,
                        "lon": 91.842581,
                        "name": ""
                    },
                    {
                        "lat": 56.151556,
                        "lon": 92.584025,
                        "name": ""
                    },
                    {
                        "lat": 56.173056,
                        "lon": 92.493331,
                        "name": "UNKL"
                    }
                ]
            };
            // Вызываем нашу универсальную функцию
            showRouteMap(exampleRoute);
        });
    }
});