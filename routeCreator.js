let importedRouteCoords = null;

// Функция перевода градусов в радианы
function toRadians(deg) {
    return deg * Math.PI / 180;
}

// Haversine функция (расстояние в морских милях)
function haversine(lat1, lon1, lat2, lon2) {
    const R = 3440.065;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
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

    const densePoints = generateIntermediatePoints(coords, step_nm);
    if (densePoints.length < 2) {
        throw new Error("Маршрут пустой или состоит из одной точки");
    }

    // Вычисляем общую длину маршрута по плотному списку точек
    let routeDistance = 0;
    for (let i = 0; i < densePoints.length - 1; i++) {
        routeDistance += haversine(
            densePoints[i][0], densePoints[i][1],
            densePoints[i + 1][0], densePoints[i + 1][1]
        );
    }

    let requiredCount = Math.ceil(routeDistance / 90);
    if (requiredCount > max_alternates) requiredCount = max_alternates;

    // Фильтруем кандидатов: исключаем аэродромы вылета/назначения и оставляем с ВПП ≥ 2400 м
    const filteredCandidates = airports.filter(apt => {
        if (apt.icao && (apt.icao === departure_icao || apt.icao === destination_icao)) {
            return false;
        }
        const runways = apt.runways || {};
        return Object.values(runways).some(rwy => rwy.xlda >= 2400);
    });

    // Функция для получения интервалов покрытия для каждого кандидата
    function getCandidateIntervals(max_radius) {
        let intervals = [];
        for (let apt of filteredCandidates) {
            const distances = densePoints.map(p => haversine(apt.latitude, apt.longitude, p[0], p[1]));
            const minDist = Math.min(...distances);
            if (minDist <= max_radius) {
                const idxList = distances
                    .map((d, idx) => d <= max_radius ? idx : null)
                    .filter(idx => idx !== null);
                intervals.push({ apt, start: Math.min(...idxList), end: Math.max(...idxList) });
            }
        }
        return intervals;
    }

    const intervals180 = getCandidateIntervals(180);
    const intervals300 = getCandidateIntervals(300);

    // Функция приоритета кандидата: сначала по end, затем по длине ВПП
    function candidatePriority(iv) {
        const runways = iv.apt.runways || {};
        const maxLen = Math.max(...Object.values(runways).map(r => r.xlda || 0));
        return { end: iv.end, maxLen: maxLen };
    }

    // Жадный алгоритм покрытия маршрута интервалами кандидатов
    function coverageGreedy(intervals, nPoints, usedIndices = null) {
        let usedSet = usedIndices ? new Set(usedIndices) : new Set(Array.from({ length: nPoints }, (_, i) => i));
        let intervalsSorted = intervals.sort((a, b) => a.start - b.start);
        let selected = [];
        const needed = Array.from(usedSet).sort((a, b) => a - b);
        let i = 0;
        while (i < needed.length) {
            const idx = needed[i];
            const possible = intervalsSorted.filter(iv => iv.start <= idx && idx <= iv.end);
            if (possible.length === 0) {
                i++;
                continue;
            }
            let bestIV = possible[0];
            let bestPriority = candidatePriority(bestIV);
            for (let iv of possible) {
                const pr = candidatePriority(iv);
                if (pr.end > bestPriority.end || (pr.end === bestPriority.end && pr.maxLen > bestPriority.maxLen)) {
                    bestIV = iv;
                    bestPriority = pr;
                }
            }
            selected.push(bestIV);
            const endCover = bestIV.end;
            while (i < needed.length && needed[i] <= endCover) {
                i++;
            }
        }
        return selected;
    }

    const nPoints = densePoints.length;
    const coverage180 = coverageGreedy(intervals180, nPoints);
    let covered180 = new Set();
    coverage180.forEach(iv => {
        for (let i = iv.start; i <= iv.end; i++) {
            covered180.add(i);
        }
    });

    const uncovered = Array.from(Array(nPoints).keys()).filter(i => !covered180.has(i));
    const coverage300 = coverageGreedy(intervals300, nPoints, uncovered);

    const allIntervals = coverage180.concat(coverage300);
    let selectedIcaos = new Set();
    let finalIntervals = [];
    for (let iv of allIntervals) {
        const icao = iv.apt.icao || iv.apt.iata || "";
        if (!selectedIcaos.has(icao)) {
            selectedIcaos.add(icao);
            finalIntervals.push(iv);
        }
    }

    if (finalIntervals.length < requiredCount) {
        let extra300 = intervals300.slice();
        extra300.sort((a, b) => {
            const aRunways = a.apt.runways || {};
            const bRunways = b.apt.runways || {};
            const aMax = Math.max(...Object.values(aRunways).map(r => r.xlda || 0));
            const bMax = Math.max(...Object.values(bRunways).map(r => r.xlda || 0));
            return bMax - aMax;
        });
        for (let iv of extra300) {
            const icao = iv.apt.icao || iv.apt.iata || "";
            if (!selectedIcaos.has(icao)) {
                finalIntervals.push(iv);
                selectedIcaos.add(icao);
                if (finalIntervals.length >= requiredCount) break;
            }
        }
    }

    let finalAirports = finalIntervals.map(iv => iv.apt);
    // Удаляем дубликаты
    let uniqueMap = {};
    finalAirports.forEach(apt => {
        const code = apt.icao || apt.iata || "";
        uniqueMap[code] = apt;
    });
    const result = Object.values(uniqueMap);
    return {
        airports: result,
        route: routeInfo
    };
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

                // Извлечение информации о маршруте из элемента <rte><name>
                const rteElements = xmlDoc.getElementsByTagNameNS("*", "rte");
                let routeInfo = null;
                if (rteElements.length > 0) {
                    const rteNameElements = rteElements[0].getElementsByTagNameNS("*", "name");
                    if (rteNameElements.length > 0) {
                        let routeName = rteNameElements[0].textContent.trim();
                        // Ожидаемый формат: "CODE1 - CODE2"
                        let parts = routeName.split("-");
                        if (parts.length === 2) {
                            let departure = parts[0].trim();
                            let destination = parts[1].trim();
                            if (departure.length === 4 && destination.length === 4) {
                                routeInfo = { departure, destination };
                            }
                        }
                    }
                }

                // Поиск элементов с координатами
                const wptElements = xmlDoc.getElementsByTagNameNS("*", "wpt");
                const trkptElements = xmlDoc.getElementsByTagNameNS("*", "trkpt");
                const rteptElements = xmlDoc.getElementsByTagNameNS("*", "rtept");

                const coords = [];

                // Для каждого элемента получаем lat, lon и название точки (если есть)
                for (let i = 0; i < wptElements.length; i++) {
                    const lat = wptElements[i].getAttribute("lat");
                    const lon = wptElements[i].getAttribute("lon");
                    const nameElements = wptElements[i].getElementsByTagNameNS("*", "name");
                    const pointName = nameElements.length > 0 ? nameElements[0].textContent.trim() : "";
                    if (lat && lon) {
                        coords.push({ lat: parseFloat(lat), lon: parseFloat(lon), name: pointName });
                    }
                }

                for (let i = 0; i < trkptElements.length; i++) {
                    const lat = trkptElements[i].getAttribute("lat");
                    const lon = trkptElements[i].getAttribute("lon");
                    const nameElements = trkptElements[i].getElementsByTagNameNS("*", "name");
                    const pointName = nameElements.length > 0 ? nameElements[0].textContent.trim() : "";
                    if (lat && lon) {
                        coords.push({ lat: parseFloat(lat), lon: parseFloat(lon), name: pointName });
                    }
                }

                for (let i = 0; i < rteptElements.length; i++) {
                    const lat = rteptElements[i].getAttribute("lat");
                    const lon = rteptElements[i].getAttribute("lon");
                    const nameElements = rteptElements[i].getElementsByTagNameNS("*", "name");
                    const pointName = nameElements.length > 0 ? nameElements[0].textContent.trim() : "";
                    if (lat && lon) {
                        coords.push({ lat: parseFloat(lat), lon: parseFloat(lon), name: pointName });
                    }
                }

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