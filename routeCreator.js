let importedRouteCoords = null;
const ALT_DEBUG = true;                // включить/выключить подробные логи по запасным
let altDebugLog = [];                  // сюда пишем логи

// Функция перевода градусов в радианы
function toRadians(deg) {
    return deg * Math.PI / 180;
}

// Минимальная разница долгот с учётом 180°/−180° (0..360 wrap)
function lonDeltaDeg(a, b) {
    a = Number(a); b = Number(b);
    if (!isFinite(a) || !isFinite(b)) return Infinity;
    let d = Math.abs(a - b);
    return d > 180 ? 360 - d : d;
}

// Haversine функция (расстояние в морских милях)
function haversine(lat1, lon1, lat2, lon2) {
    lat1 = Number(lat1); lon1 = Number(lon1);
    lat2 = Number(lat2); lon2 = Number(lon2);
    if (!isFinite(lat1) || !isFinite(lon1) || !isFinite(lat2) || !isFinite(lon2)) return Infinity;

    const R = 3440.065; // NM
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
            + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.asin(Math.min(1, Math.max(0, Math.sqrt(a))));
    return R * c;
}

// Возвращает ближайший аэропорт к координате (в пределах max_nm)
// Если ничего близко нет — вернёт null
function nearestAirport(lat, lon, airports, max_nm = 80) {
    let best = null;
    let bestDist = Infinity;
    for (const apt of airports) {
        const aLat = apt.latitude;
        const aLon = apt.longitude;
        if (typeof aLat !== 'number' || typeof aLon !== 'number') continue;
        const d = haversine(lat, lon, aLat, aLon);
        if (d < bestDist) {
            bestDist = d;
            best = apt;
        }
    }
    return (bestDist <= max_nm) ? best : null;
}

// Интерполяция между двумя точками по заданной доле
function interpolate(lat1, lon1, lat2, lon2, fraction) {
    return [
        lat1 + (lat2 - lat1) * fraction,
        lon1 + (lon2 - lon1) * fraction
    ];
}

function generateIntermediatePoints(coords, step_nm = 10) {
    const basePoints = coords.map(p => [p.lat, p.lon]);
    if (basePoints.length < 2) return basePoints;
    let newPoints = [];
    for (let i = 0; i < basePoints.length - 1; i++) {
        let [lat1, lon1] = basePoints[i];
        let [lat2, lon2] = basePoints[i + 1];
        const segmentDist = haversine(lat1, lon1, lat2, lon2);
        if (newPoints.length === 0) {
            newPoints.push([lat1, lon1]);
        }
        if (segmentDist > 0) {
            const steps = Math.floor(segmentDist / step_nm);
            for (let s = 1; s <= steps; s++) {
                const frac = s * step_nm / segmentDist;
                if (frac >= 1.0) break;
                let [latInt, lonInt] = interpolate(lat1, lon1, lat2, lon2, frac);
                newPoints.push([latInt, lonInt]);
            }
        }
        newPoints.push([lat2, lon2]);
    }
    return newPoints;
}

function findAlternateAirportsByRoute(routeInfo, airports, max_alternates = 30, step_nm = 10) {
    const departure_icao = routeInfo.route.departure;
    const destination_icao = routeInfo.route.destination;
    const coords = routeInfo.coordinates;
    console.info('[SimpleCover v1.0] start', { step_nm, max_alternates });

    const densePoints = generateIntermediatePoints(coords, step_nm);
    if (densePoints.length < 2) {
        throw new Error("Маршрут пустой или состоит из одной точки");
    }

    // === ПРОСТОЙ РЕЖИМ: покрытие маршрута радиусом от аэродромов ===
    const RADIUS_NM = 200;     // радиус покрытия точки маршрута
    const LAT_PRE = 4;         // предфильтр по широте для ускорения (≈ 240 NM)
    const LON_PRE = 6;         // предфильтр по долготе для ускорения (с учётом даталайна)

    // 1) Кандидаты: исключаем DEP/ARR и оставляем аэродромы с ВПП ≥ 2400 м
    const usableAirports = airports.filter(apt => {
        if (apt.icao && (apt.icao === departure_icao || apt.icao === destination_icao)) return false;
        const runways = apt.runways || {};
        return Object.values(runways).some(rwy => rwy.xlda >= 2400);
    });

    // 2) Для каждого аэродрома посчитаем, какие плотные точки он покрывает в радиусе RADIUS_NM
    const airportCoverage = new Map(); // code -> Set(indices)
    const aptByCode = new Map();
    for (const apt of usableAirports) {
        const code = apt.icao || apt.iata || '';
        if (!code) continue;
        aptByCode.set(code, apt);
        const cover = new Set();

        for (let i = 0; i < densePoints.length; i++) {
            const plat = densePoints[i][0];
            const plon = densePoints[i][1];
            // Быстрый предчек для ускорения: если далеко по широте/долготе — пропускаем
            if (Math.abs(plat - apt.latitude) > LAT_PRE) continue;
            if (lonDeltaDeg(plon, apt.longitude) > LON_PRE) continue;

            const d = haversine(plat, plon, apt.latitude, apt.longitude);
            if (d <= RADIUS_NM) cover.add(i);
        }
        if (cover.size > 0) airportCoverage.set(code, cover);
    }

    // 3) Множество точек, которые вообще можно покрыть
    const toCover = new Set();
    for (const set of airportCoverage.values()) for (const idx of set) toCover.add(idx);

    // 4) Жадный выбор минимального набора аэродромов
    const selectedCodes = [];
    while (toCover.size > 0 && selectedCodes.length < max_alternates) {
        let bestCode = null;
        let bestGain = 0;
        for (const [code, set] of airportCoverage.entries()) {
            if (selectedCodes.includes(code)) continue;
            let gain = 0;
            for (const idx of set) if (toCover.has(idx)) gain++;
            if (gain > bestGain) { bestGain = gain; bestCode = code; }
        }
        if (!bestCode || bestGain === 0) break; // больше нечем покрывать
        selectedCodes.push(bestCode);
        for (const idx of airportCoverage.get(bestCode)) toCover.delete(idx);
    }

    // 5) Сформируем finalIntervals в формате, совместимом с логикой ниже
    let finalIntervals = [];
    for (const code of selectedCodes) {
        const apt = aptByCode.get(code);
        if (!apt) continue;
        const coveredSet = airportCoverage.get(code) || new Set();

        // ближайшая к аэропорту плотная точка (для логов)
        let bestIdx = -1, bestD = Infinity;
        const candidatesIdx = coveredSet.size ? coveredSet : new Set(Array.from({length: densePoints.length}, (_, i) => i));
        for (const i of candidatesIdx) {
            const p = densePoints[i];
            const d = haversine(p[0], p[1], apt.latitude, apt.longitude);
            if (d < bestD) { bestD = d; bestIdx = i; }
        }
        const sorted = Array.from(coveredSet).sort((a,b)=>a-b);
        const start = sorted.length ? sorted[0] : bestIdx;
        const end   = sorted.length ? sorted[sorted.length-1] : bestIdx;

        finalIntervals.push({
            apt,
            start,
            end,
            nearestIdx: bestIdx,
            nearestDistNm: Number(bestD.toFixed(1)),
            nearestPoint: { lat: densePoints[bestIdx][0], lon: densePoints[bestIdx][1] }
        });
    }

    // Жёсткий финальный фильтр по геометрии и дистанции
    const DEG_LAT_LIMIT = 2;   // ≤ 2° по широте
    const DEG_LON_LIMIT = 3;   // ≤ 3° по долготе (с учётом даталайна)
    const DIST_LIMIT_NM = 200; // ≤ 200 NM фактическая дистанция

    finalIntervals = finalIntervals.filter(iv => {
        const a = iv.apt; const p = iv.nearestPoint;
        if (!a || !p || !isFinite(a.latitude) || !isFinite(a.longitude)) return false;
        if (!isFinite(p.lat) || !isFinite(p.lon)) return false;
        const dLat = Math.abs(p.lat - a.latitude);
        const dLon = lonDeltaDeg(p.lon, a.longitude);
        if (dLat > DEG_LAT_LIMIT || dLon > DEG_LON_LIMIT) return false;
        if (!isFinite(iv.nearestDistNm) || iv.nearestDistNm > DIST_LIMIT_NM) return false;
        return true;
    });

    // === ЛОГИРОВАНИЕ ДЛЯ ОТЛАДКИ ПОИСКА ЗАПАСНЫХ ===
    if (ALT_DEBUG) {
        altDebugLog = [];

        // ближайшая исходная (не «плотная») точка GPX к заданным координатам
        function nearestOriginalPoint(lat, lon) {
            if (!Array.isArray(coords) || coords.length === 0) return null;
            let bestIdx = -1;
            let bestDist = Infinity;
            for (let i = 0; i < coords.length; i++) {
                const d = haversine(lat, lon, coords[i].lat, coords[i].lon);
                if (d < bestDist) { bestDist = d; bestIdx = i; }
            }
            const pt = coords[bestIdx];
            return {
                index: bestIdx,
                name: pt.name || '',
                lat: pt.lat,
                lon: pt.lon,
                distNm: Number(bestDist.toFixed(1))
            };
        }

        for (const iv of finalIntervals) {
            const apt = iv.apt || {};
            const aptCode = apt.icao || apt.iata || '';
            const aptName = apt.name || '';
            const aptLat = apt.latitude;
            const aptLon = apt.longitude;

            const pDense = iv.nearestPoint || null;
            const nearestOrig = pDense ? nearestOriginalPoint(pDense.lat, pDense.lon) : null;
            const sanityNm = pDense ? Number(haversine(aptLat, aptLon, pDense.lat, pDense.lon).toFixed(1)) : null;

            altDebugLog.push({
                APT: aptCode,
                Name: aptName,
                'APT lat': Number(aptLat?.toFixed?.(6) ?? aptLat),
                'APT lon': Number(aptLon?.toFixed?.(6) ?? aptLon),
                'Triggered dense idx': iv.nearestIdx,
                'Dense lat': pDense ? Number(pDense.lat.toFixed(6)) : null,
                'Dense lon': pDense ? Number(pDense.lon.toFixed(6)) : null,
                'dLatDeg': pDense ? Number(Math.abs(pDense.lat - aptLat).toFixed(3)) : null,
                'dLonDeg': pDense ? Number(lonDeltaDeg(pDense.lon, aptLon).toFixed(3)) : null,
                'Dist to dense (NM)': iv.nearestDistNm,
                'Sanity dist (NM)': sanityNm,
                'Nearest GPX idx': nearestOrig ? nearestOrig.index : null,
                'Nearest GPX name': nearestOrig ? nearestOrig.name : '',
                'Nearest GPX lat': nearestOrig ? Number(nearestOrig.lat.toFixed(6)) : null,
                'Nearest GPX lon': nearestOrig ? Number(nearestOrig.lon.toFixed(6)) : null,
                'Dist to GPX (NM)': nearestOrig ? nearestOrig.distNm : null,
                start: iv.start,
                end: iv.end
            });
        }

        console.info('[SimpleCover v1.0] debug', {
            RADIUS_NM,
            entries: finalIntervals.length,
            densePoints: densePoints.length
        });
        try { console.table(altDebugLog); } catch (e) { console.log(altDebugLog); }
        window.altDebugLog = altDebugLog;
    }
    // === /ЛОГИРОВАНИЕ ===

    // Сбор результата в формате {airports: [...], route: routeInfo}
    let finalAirports = finalIntervals.map(iv => iv.apt);
    let uniqueMap = {};
    finalAirports.forEach(apt => {
        const code = apt.icao || apt.iata || "";
        uniqueMap[code] = apt;
    });
    const result = Object.values(uniqueMap);
    return { airports: result, route: routeInfo };
}


function gpxImport() {
    return new Promise((resolve, reject) => {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            const reader = new FileReader();

            reader.onload = function(e) {
                const gpxText = e.target.result;

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(gpxText, "application/xml");

                const parserErrors = xmlDoc.getElementsByTagName("parsererror");
                if (parserErrors.length > 0) {
                    reject("Ошибка парсинга GPX");
                    return;
                }

                // 1) Пытаемся вытащить коды маршрута из <rte><name> или <trk><name>
                // Поддерживаем шаблон "UUEE - UUWW" и "UUEE–UUWW" (с длинным тире)
                const nameRegex = /([A-Z]{4})\s*[-–]\s*([A-Z]{4})/i;

                let routeDeparture = "";
                let routeDestination = "";

                // Сначала пробуем <rte><name>
                const rteElements = xmlDoc.getElementsByTagNameNS("*", "rte");
                if (rteElements.length > 0) {
                    const rteNameElements = rteElements[0].getElementsByTagNameNS("*", "name");
                    if (rteNameElements.length > 0) {
                        const routeName = rteNameElements[0].textContent.trim();
                        const m = routeName.match(nameRegex);
                        if (m) {
                            routeDeparture = m[1].toUpperCase();
                            routeDestination = m[2].toUpperCase();
                        }
                    }
                }

                // Если из <rte> не получилось — пробуем <trk><name>
                if (!routeDeparture || !routeDestination) {
                    const trkElements = xmlDoc.getElementsByTagNameNS("*", "trk");
                    if (trkElements.length > 0) {
                        const trkNameElements = trkElements[0].getElementsByTagNameNS("*", "name");
                        if (trkNameElements.length > 0) {
                            const trkName = trkNameElements[0].textContent.trim();
                            const m2 = trkName.match(nameRegex);
                            if (m2) {
                                routeDeparture = m2[1].toUpperCase();
                                routeDestination = m2[2].toUpperCase();
                            }
                        }
                    }
                }

                // 2) Собираем координаты из wpt / trkpt / rtept
                const wptElements = xmlDoc.getElementsByTagNameNS("*", "wpt");
                const trkptElements = xmlDoc.getElementsByTagNameNS("*", "trkpt");
                const rteptElements = xmlDoc.getElementsByTagNameNS("*", "rtept");

                const coords = [];

                const pushPt = (el) => {
                    const lat = el.getAttribute("lat");
                    const lon = el.getAttribute("lon");
                    if (!lat || !lon) return;
                    const nameElements = el.getElementsByTagNameNS("*", "name");
                    const pointName = nameElements.length > 0 ? nameElements[0].textContent.trim() : "";
                    coords.push({ lat: parseFloat(lat), lon: parseFloat(lon), name: pointName });
                };

                for (let i = 0; i < wptElements.length; i++) pushPt(wptElements[i]);
                for (let i = 0; i < trkptElements.length; i++) pushPt(trkptElements[i]);
                for (let i = 0; i < rteptElements.length; i++) pushPt(rteptElements[i]);

                // 3) Если коды не определены из name — пробуем определить по ближайшим аэропортам
                // Берём первую и последнюю координаты трека
                if ((!routeDeparture || !routeDestination) && coords.length >= 2 && Array.isArray(window.airportsList)) {
                    const first = coords[0];
                    const last = coords[coords.length - 1];

                    const depApt = nearestAirport(first.lat, first.lon, airportsList, 120); // до 120 NM от начала
                    const arrApt = nearestAirport(last.lat, last.lon, airportsList, 120);  // до 120 NM от конца

                    if (!routeDeparture && depApt && depApt.icao) routeDeparture = depApt.icao;
                    if (!routeDestination && arrApt && arrApt.icao) routeDestination = arrApt.icao;
                }

                // Гарантируем, что route-объект всегда есть
                const routeInfo = {
                    departure: routeDeparture || "",
                    destination: routeDestination || ""
                };

                resolve({
                    route: routeInfo,
                    coordinates: coords
                });
            };

            reader.onerror = function() {
                reject("Ошибка при чтении GPX файла");
            };

            reader.readAsText(file);
        } else {
            reject("Файл не выбран");
        }
    });
}


document.addEventListener('DOMContentLoaded', function() {
    const importGpxBtn = document.getElementById('importGpxBtn');
    const gpxFileInput = document.getElementById('gpxFileInput');

    importGpxBtn.addEventListener('click', () => {
        // Очистить возможные предыдущие логи в консоли, если нужно
        gpxFileInput.value = ''; // сброс выбора
        gpxFileInput.click();
    });

    gpxFileInput.addEventListener('change', function() {
        gpxImport.call(this)
            .then(result => {
                const departureIcaoInput = document.getElementById('departureIcao');
                const arrivalIcaoInput = document.getElementById('arrivalIcao');
                const alternatesIcaoInput = document.getElementById('alternatesIcao');

                departureIcaoInput.value = '';
                arrivalIcaoInput.value = '';
                alternatesIcaoInput.value = '';

                const altResult = findAlternateAirportsByRoute(result, [...airportsList], LAST_COUNT);
                const r = altResult.airports;
                if (r.length > 0) {
                    // r = [{icao: UUDL, ...}, ...]
                    departureIcaoInput.value = result.route.departure;
                    arrivalIcaoInput.value = result.route.destination;
                    alternatesIcaoInput.value = r.map(a => a.icao).join(" ");
                    importedRouteCoords = altResult.route.coordinates;

                    const saveRouteBtn = document.getElementById('saveRouteBtn');
                    saveRouteBtn.disabled = false;
                }
            })
            .catch(error => {
                console.error(error);
            });
    });
});