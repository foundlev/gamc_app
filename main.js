let offlineMode = JSON.parse(localStorage.getItem('offlineMode')) || false;
let autoGoOffline = localStorage.getItem('autoGoOffline') !== null ?
    JSON.parse(localStorage.getItem('autoGoOffline')) :
    true;
let doHighlight = JSON.parse(localStorage.getItem('doHighlight')) || false;
let doMarkBagde = JSON.parse(localStorage.getItem('doMarkBagde')) || false;
let canShowAirportInfo = JSON.parse(localStorage.getItem('canShowAirportInfo')) || false;

// Ключи для localStorage
const PASSWORD_KEY = 'gamcPassword';
const ICAO_HISTORY_KEY = 'icaoHistory';

const LAST_COUNT = 30;
const SUGGESTIONS_COUNT = 7;

let airportInfoDb = {};
let airportsList = []

let storedIcaoColors = JSON.parse(localStorage.getItem('icaoColors') || '{}');
let icaoColors = storedIcaoColors;

// Загружаем базу аэродромов (icao, iata, geo[0]=название, geo[1]=страна)
fetch('data/airports_db.json')
    .then(response => response.json())
    .then(data => {
        data.forEach(item => {
            airportInfoDb[item.icao] = item;
        });

        airportsList = [...data];
        icaoKeys = Object.keys(airportInfoDb).sort();
    })
    .catch(err => {
        console.error('Не удалось загрузить airports_db.json:', err);
    });

// Приоритет цветов от худшего к лучшему
// (darkred и purple можно тоже расставить, если нужно)
const WEATHER_PHENOMENA = {
    DZ: { en: "Drizzle", ru: "морось" },
    RA: { en: "Rain", ru: "дождь" },
    SN: { en: "Snow", ru: "снег" },
    SG: { en: "Snow Grains", ru: "снежные зёрна (снежная крупа)" },
    IC: { en: "Ice Crystals", ru: "ледяные кристаллы" },
    PL: { en: "Ice Pellets", ru: "ледяная крупа" },
    GR: { en: "Hail", ru: "град" },
    GS: { en: "Small Hail and/or Snow Pellets", ru: "мелкий град и/или снежная крупа" },
    UP: { en: "Unknown Precipitation", ru: "неизвестные осадки" },

    FG: { en: "Fog", ru: "туман" },
    BR: { en: "Mist", ru: "дымка" },
    HZ: { en: "Haze", ru: "мгла" },
    FU: { en: "Smoke", ru: "дым" },
    VA: { en: "Volcanic Ash", ru: "вулканический пепел" },
    DU: { en: "Widespread Dust", ru: "пыль (обширная)" },
    SA: { en: "Sand", ru: "песок" },
    PY: { en: "Spray", ru: "водяная пыль" },

    PO: { en: "Dust or Sand Whirls", ru: "пыльные/песчаные вихри" },
    SQ: { en: "Squalls", ru: "шквалы" },
    FC: { en: "Funnel Cloud (Tornado or Waterspout)", ru: "воронка (торнадо/смерч над водой)" },
    SS: { en: "Sandstorm", ru: "песчаная буря" },
    DS: { en: "Duststorm", ru: "пыльная буря" }
};

const WEATHER_DESCRIPTORS = {
    MI: { en: "Shallow", ru: "стелющийся" },
    PR: { en: "Partial", ru: "частичный" },
    BC: { en: "Patches", ru: "клочьями" },
    DR: { en: "Drifting", ru: "позёмный" },
    BL: { en: "Blowing", ru: "метущий" },
    SH: { en: "Showers", ru: "ливневый" },
    TS: { en: "Thunderstorm", ru: "гроза" },
    FZ: { en: "Freezing", ru: "переохлаждённый" }
};

const colorPriority = [
    "color-purple", // считаем экстремально худшим
    "color-darkred",
    "color-red",
    "color-yellow",
    "color-green"
];

function generateUID() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    let uid = '';
    for (let i = 0; i < 6; i++) {
        uid += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return uid;
}

function getGamcUID() {
    let gamcUid = localStorage.getItem('gamcUid');
    if (!gamcUid) {
        gamcUid = generateUID();
        localStorage.setItem('gamcUid', gamcUid);
    }
    return gamcUid;
}

function isTechUID() {
    return getGamcUID() === 'LEV737';
}

function formatNumber(num) {
    return String(num).padStart(3, '0');
}

function getAirportIconClass(icaoCode) {
    if (airportsB.includes(icaoCode)) {
        return '<i class="fa-solid fa-b"></i>'
    } else if (airportsBz.includes(icaoCode)) {
        return '<i class="fa-solid fa-b"></i>*'
    } else if  (airportsC.includes(icaoCode)) {
        return '<i class="fa-solid fa-c"></i>'
    }
    return '<i class="fa-solid fa-a"></i>'
}

function getAirportColorClass(icaoCode) {
    if (airportsB.includes(icaoCode)) {
        return 'badge-green'
    } else if (airportsBz.includes(icaoCode)) {
        return 'badge-orange'
    } else if  (airportsC.includes(icaoCode)) {
        return 'badge-red'
    }
    return 'badge-green'
}

function getAirportClassInfoText(icaoCode) {
    let infoText =  `Аэродроме <b>${icaoCode}</b> относится к категории <b>`;
    if (airportsB.includes(icaoCode)) {
        infoText += `B</b>.<br><br>Нет ограничений.`
        return infoText
    } else if (airportsBz.includes(icaoCode)) {
        infoText += `B*</b>.<br><br>Пилотирование ВП на посадке без КВС инструктора в контуре управления <b>запрещено</b>.`
        return infoText
    } else if  (airportsC.includes(icaoCode)) {
        infoText += `C</b>.<br><br>Пилотирование ВП <b>запрещено</b>.`
        return infoText
    }
    infoText += `A</b>. Нет ограничений.`
    return infoText
}

function isRussianAirport(icaoCode) {
    // Проверяем является ли icaoCode строкой, если нет, то true
    if (typeof icaoCode !== 'string') {
        return true;
    }

    // Если icao начинается на U, то true, иначе false
    return /^U[A-Z]{3}$/.test(icaoCode);
}

function getWorstRunwayCondition(state) {
    // Если ничего не нашли при разборе, возвращаем "good" из reportedBrakingActions
    if (state.worstRunwayFrictionCode === null) {
        return {
            kind: 'reported',
            category: 'good',
            frictionValue: null
        };
    }

    // Если >=91 => это зашитая таблица
    const code = state.worstRunwayFrictionCode; // сокращение
    if (code >= 91 && code <= 95 || code === 99) {
        // Сопоставляем:
        const mapCode = {
            91: 'poor', // "плохой"
            92: 'poor_to_medium', // "плохой/средний"
            93: 'medium', // "средний"
            94: 'medium_to_good', // "средний/хороший"
            95: 'good', // "хороший"
            99: 'poor' // "ненадёжное измерение" → считаем как 'poor' чтобы было построже
        };
        const cat = mapCode[code] || 'good';
        return {
            kind: 'reported',
            category: cat,
            frictionValue: null
        };
    } else {
        // code между 10..90, значит это 0.xx
        let friction = (code / 100).toFixed(2); // например "0.43"
        // ICAO начинается на "U"?
        let isRussian = isRussianAirport(state.nowIcao);

        // Выбираем таблицу normative или by_sft
        let relevantObj = isRussian ? coefficientBrakingActions.normative : coefficientBrakingActions.by_sft;

        return {
            kind: 'measured', // т. е. берём из coefficientBrakingActions
            frictionValue: parseFloat(friction),
            relevantData: relevantObj
        };
    }
}

// Функция для определения предела бокового ветра (kts) под конкретный коэф,
// где "phase" это 'takeoff' или 'landing'.
function getCrosswindLimit(phase, frictionObj, fallback) {
    // frictionObj = { 0.5:{kts:34,...}, 0.42:{kts:25,...}, ...}
    // fallback    = { kts:25, ... } если не найдём подходящего
    // 1) Если friction=0.43, надо найти самую нижнюю границу <=0.43
    //    например есть ключи 0.5,0.42,0.4,0.37... выберем 0.42
    // 2) Если меньше всех, то всё равно берём «самую нижнюю»
    // 3) Если нет фрикции -> возвращаем fallback
    // (Ключи будут в виде float, нужно перебирать.)

    let frictionArr = Object.keys(frictionObj)
        .map(v => parseFloat(v))
        .sort((a, b) => b - a);
    // Сортируем по убыванию: 0.5, 0.42, 0.4, 0.37, ...

    for (let f of frictionArr) {
        if (f <= frictionObj.currentFriction) {
            return frictionObj[f];
        }
    }
    // Если ничего не подошло (фрикция вообще очень маленькая), берём самый последний:
    return frictionObj[frictionArr[frictionArr.length - 1]] || fallback;
}

document.addEventListener('DOMContentLoaded', () => {
    // Селекторы
    const icaoInput = document.getElementById('icao');
    const fetchBtn = document.getElementById('fetchBtn');
    updateFetchBtn();
    const systemsInfoBtn = document.getElementById('systemsInfoBtn');
    const restrBtn = document.getElementById('restrBtn');
    const resetPasswordBtn = document.getElementById('resetPasswordBtn');
    const removeSavedIcaosBtn = document.getElementById('removeSavedIcaos');
    const responseContainer = document.getElementById('responseContainer');
    const historyContainer = document.getElementById('historyContainer');
    const timeBadgeContainer = document.getElementById('timeBadgeContainer');
    const timeBadgeContainerRow2 = document.getElementById('timeBadgeContainerRow2');
    const favBadgeContainer = document.getElementById('favBadgeContainer');
    const upperBadgeContainer = document.getElementById('upperBadgeContainer');

    const refreshAllBtn = document.getElementById('refreshAllBtn');

    function formatTimeAgoRussian(diffMin) {
        if (diffMin < 0) return "В будущем";
        if (diffMin < 1) return "Только что";
        if (diffMin < 60) return `${diffMin} мин. назад`;
        if (diffMin < 1440) { // 24 часа = 1440 мин
            const h = Math.round(diffMin / 60);
            if (h === 0) return "Только что"; // На всякий случай, если округлится до 0
            return `${h} ч. назад`;
        }
        return ">1 дн. назад";
    }

    // Модальное окно
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalPassword = document.getElementById('modalPassword');
    const savePasswordBtn = document.getElementById('savePasswordBtn');

    // Храним маршруты в localStorage под этим ключом
    const ROUTES_KEY = 'savedRoutes';

    // При загрузке получаем из localStorage или пустой массив
    let savedRoutes = JSON.parse(localStorage.getItem(ROUTES_KEY) || '[]');
    let editRouteIndex = null;
    let isEditingRoute = false;

    // Селект для выбора маршрута
    const routeSelect = document.getElementById('routeSelect');
    const routeSelectContainer = document.getElementById('routeSelectContainer');
    const routeSelectLabel = document.getElementById('routeSelectLabel');
    const routeSearchModal = document.getElementById('routeSearchModalBackdrop');
    const closeRouteSearchModalBtn = document.getElementById('closeRouteSearchModalBtn');
    const routeSearchInput = document.getElementById('routeSearchInput');
    const routeSearchResults = document.getElementById('routeSearchResults');

    function openRouteSearchModal() {
        routeSearchModal.classList.add('show');
        routeSearchInput.value = '';
        renderRouteSearchResults();
        setTimeout(() => routeSearchInput.focus(), 100);
    }

    function hideRouteSearchModal() {
        routeSearchModal.classList.remove('show');
    }

    routeSelectContainer.addEventListener('click', openRouteSearchModal);
    closeRouteSearchModalBtn.addEventListener('click', hideRouteSearchModal);

    routeSearchInput.addEventListener('input', () => {
        renderRouteSearchResults(routeSearchInput.value);
    });

    function transliterate(text) {
        const rus = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя".split("");
        const eng = ["a", "b", "v", "g", "d", "e", "yo", "zh", "z", "i", "y", "k", "l", "m", "n", "o", "p", "r", "s", "t", "u", "f", "kh", "ts", "ch", "sh", "shch", "", "y", "", "e", "yu", "ya"];
        let result = text.toLowerCase();
        for (let i = 0; i < rus.length; i++) {
            result = result.split(rus[i]).join(eng[i]);
        }
        return result;
    }

    function renderRouteSearchResults(filter = '') {
        routeSearchResults.innerHTML = '';
        const searchStr = filter.toLowerCase();
        const transStr = transliterate(searchStr);

        let resultsFound = false;

        // 1. Недавние
        if ('недавние'.includes(searchStr) || 'recent'.includes(searchStr)) {
            const div = document.createElement('div');
            div.className = 'route-search-item';
            if (routeSelect.value === 'recent') div.classList.add('active');
            div.innerHTML = `<div class="route-item-title">Недавние</div>
                             <div class="route-item-special">Последние просмотренные ICAO</div>`;
            div.onclick = () => {
                selectRouteOption('recent');
                hideRouteSearchModal();
            };
            routeSearchResults.appendChild(div);
            resultsFound = true;
        }

        // 2. Сохраненные маршруты
        savedRoutes.forEach((route, index) => {
            const depName = airportInfoDb[route.departure]?.geo?.[0] || '';
            const arrName = airportInfoDb[route.arrival]?.geo?.[0] || '';
            const routeStr = `${route.departure} ${route.arrival} ${depName} ${arrName}`.toLowerCase();

            if (routeStr.includes(searchStr) || (transStr && routeStr.includes(transStr))) {
                const div = document.createElement('div');
                div.className = 'route-search-item';
                if (routeSelect.value == index) div.classList.add('active');
                div.innerHTML = `<div class="route-item-title">${route.departure} - ${route.arrival}</div>
                                 <div class="route-item-details">${depName} → ${arrName}</div>`;
                div.onclick = () => {
                    selectRouteOption(index);
                    hideRouteSearchModal();
                };
                routeSearchResults.appendChild(div);
                resultsFound = true;
            }
        });

        // 3. Добавить маршрут
        if ('добавить маршрут'.includes(searchStr) || 'add route'.includes(searchStr) || (transStr && 'add route'.includes(transStr))) {
            const div = document.createElement('div');
            div.className = 'route-search-item';
            div.innerHTML = `<div class="route-item-title">Добавить маршрут...</div>
                             <div class="route-item-special">Создать новый список аэродромов</div>`;
            div.onclick = () => {
                selectRouteOption('add');
                hideRouteSearchModal();
            };
            routeSearchResults.appendChild(div);
            resultsFound = true;
        }

        if (!resultsFound) {
            const div = document.createElement('div');
            div.style.padding = '20px';
            div.style.textAlign = 'center';
            div.style.opacity = '0.5';
            div.textContent = 'Ничего не найдено';
            routeSearchResults.appendChild(div);
        }
    }

    function selectRouteOption(value) {
        routeSelect.value = value;
        // Для 'add' мы не вызываем change, так как renderSelectedRoute сам сбросит в 'recent'
        if (value !== 'add') {
            routeSelect.dispatchEvent(new Event('change'));
        } else {
            // Если 'add', просто вызываем renderSelectedRoute, чтобы показалась модалка
            renderSelectedRoute();
        }
        updateRouteSelectLabel();
    }

    function updateRouteSelectLabel() {
        const val = routeSelect.value;
        if (val === 'recent') {
            routeSelectLabel.textContent = 'Недавние';
        } else if (val === 'add') {
            routeSelectLabel.textContent = 'Добавить маршрут...';
        } else {
            const idx = parseInt(val, 10);
            const route = savedRoutes[idx];
            if (route) {
                routeSelectLabel.textContent = `${route.departure} - ${route.arrival}`;
            }
        }
    }

    // Модальное окно для добавления маршрута
    const addRouteModalBackdrop = document.getElementById('addRouteModalBackdrop');
    const closeAddRouteModalBtn = document.getElementById('closeAddRouteModalBtn');
    const saveRouteBtn = document.getElementById('saveRouteBtn');

    // Поля ввода внутри модалки
    const departureIcaoInput = document.getElementById('departureIcao');
    const arrivalIcaoInput = document.getElementById('arrivalIcao');
    const alternatesIcaoInput = document.getElementById('alternatesIcao');

    if (!localStorage.getItem(PASSWORD_KEY)) {
        showModal();
    } else {
        hideModal();
    }
    renderHistory();

    function addTimeBadgeContainerBottomGap() {
        if (timeBadgeContainer.classList.contains('remove-bottom-gap')) {
            timeBadgeContainer.classList.remove('remove-bottom-gap');
            favBadgeContainer.classList.remove('remove-bottom-gap');
        }
    }

    function removeTimeBadgeContainerBottomGap() {
        if (!timeBadgeContainer.classList.contains('remove-bottom-gap')) {
            timeBadgeContainer.classList.add('remove-bottom-gap');
            favBadgeContainer.classList.add('remove-bottom-gap');
        }
    }

    /* =========================
       МОДАЛКА
    ========================= */

    // Получаем кнопку «X»
    const clearIcaoBtn = document.getElementById('clearIcaoBtn');

    clearIcaoBtn.addEventListener('click', () => {
        icaoInput.value = ''; // очищаем поле
        icaoInput.focus(); // ставим фокус назад на инпут
        updateFetchBtn();
    });

    const closeModalBtn = document.getElementById('closeModalBtn');

    closeModalBtn.addEventListener('click', () => {
        hideModal();
    });

    const editRouteBtn = document.getElementById('editRouteBtn');
    const reverseRouteBtn = document.getElementById('reverseRouteBtn');

    editRouteBtn.addEventListener('click', () => {

        if (routeSelect.value === 'temp') {
            // Если выбран временный маршрут, открываем модальное окно для его редактирования.
            const tempRoute = JSON.parse(localStorage.getItem('tempRoute') || '{}');
            if (tempRoute.departure && tempRoute.arrival) {
                // Если временный маршрут уже задан – заполняем поля его значениями.
                departureIcaoInput.value = tempRoute.departure;
                arrivalIcaoInput.value = tempRoute.arrival;
                alternatesIcaoInput.value = tempRoute.alternates ? tempRoute.alternates.join(' ') : '';
                importedRouteCoords = tempRoute.coords;
            } else {
                // Если не задан – очищаем поля, чтобы пользователь мог ввести новые данные.
                departureIcaoInput.value = '';
                arrivalIcaoInput.value = '';
                alternatesIcaoInput.value = '';
            }
            // Разрешаем редактирование вылета и назначения
            departureIcaoInput.disabled = false;
            arrivalIcaoInput.disabled = false;
            // Меняем заголовок модального окна для ясности
            const modalTitle = addRouteModalBackdrop.querySelector('h2');
            modalTitle.textContent = 'Редактировать маршрут';
            // Скрываем кнопку удаления, если она не нужна для временного маршрута
            deleteRouteBtn.style.display = 'none';
            // Открываем модальное окно
            addRouteModalBackdrop.classList.add('show');
            document.getElementById('importGpxBtn').style.display = 'inline-block';
            return;
        }

        document.getElementById('importGpxBtn').style.display = 'none';

        if (routeSelect.value === 'recent') {
            // Показываем модалку
            showAddRouteModal();
            return;
        }

        // 1) определить, какой индекс выбран
        const idx = parseInt(routeSelect.value, 10);
        if (isNaN(idx) || !savedRoutes[idx]) {
            return;
        }
        editRouteIndex = idx;
        isEditingRoute = true;

        // 2) Заполняем поля
        const route = savedRoutes[idx];
        departureIcaoInput.value = route.departure;
        arrivalIcaoInput.value = route.arrival;
        // Склеить запасные через пробел
        alternatesIcaoInput.value = route.alternates.join(' ');

        // 3) Вылет и Назначение disabled
        departureIcaoInput.disabled = true;
        arrivalIcaoInput.disabled = true;

        // 4) Переименовать заголовок в модалке (можно)
        const modalTitle = addRouteModalBackdrop.querySelector('h2');
        modalTitle.textContent = 'Редактировать маршрут';

        // 5) Показать кнопку "Удалить"
        deleteRouteBtn.style.display = 'inline-block';

        // 6) Открываем модалку
        addRouteModalBackdrop.classList.add('show');
    });

    // ЗАМЕНИ содержимое обработчика на этот вариант:
    reverseRouteBtn.addEventListener('click', () => {
        const selected = routeSelect.value;

        // Берём объект текущего маршрута
        let routeObj = null;
        if (selected === 'temp') {
            routeObj = JSON.parse(localStorage.getItem('tempRoute') || '{}');
            if (!routeObj || !routeObj.departure || !routeObj.arrival) return;
        } else {
            const idx = parseInt(selected, 10);
            if (isNaN(idx) || !savedRoutes[idx]) return;
            routeObj = { ...savedRoutes[idx] }; // копия, чтобы не мутировать по ссылке
        }

        // Меняем местами DEP/ARR
        [routeObj.departure, routeObj.arrival] = [routeObj.arrival, routeObj.departure];

        // Реверсим порядок запасных для отображения
        if (Array.isArray(routeObj.alternates)) {
            routeObj.alternates = [...routeObj.alternates].reverse();
        }

        // Сохраняем
        if (selected === 'temp') {
            localStorage.setItem('tempRoute', JSON.stringify(routeObj));
        } else {
            const idx = parseInt(selected, 10);
            savedRoutes[idx] = routeObj;
            localStorage.setItem('savedRoutes', JSON.stringify(savedRoutes));
            // Обновляем подписи в выпадающем списке, НЕ меняя выбранный пункт
            renderRoutesInSelect(selected);
        }

        // Перерисовываем текущий выбранный маршрут (без прыжка на "Недавние")
        renderSelectedRoute();
    });

    function updateFetchBtn() {
        const icao = icaoInput.value.trim().toUpperCase();

        if (nowIcao && nowIcao === icao && icao.length === 4) {
            fetchBtn.innerHTML = '<i class="fas fa-sync-alt"></i>Обновить';
        } else {
            fetchBtn.innerHTML = '<i class="fas fa-cloud-download-alt"></i>Запросить';
        }

        const isDisabled = icao.length !== 4;
        fetchBtn.disabled = isDisabled;
    }

    function updateIcaoSuggestions() {
        const query = icaoInput.value.trim().toUpperCase();
        const suggestionsContainer = document.getElementById('icaoSuggestions');

        // Если пользователь ничего не ввёл или база аэропортов не загружена, скрываем список
        if (!query || !icaoKeys || icaoKeys.length === 0) {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.classList.remove('show');
            return;
        }

        // Фильтруем и берем только первые SUGGESTIONS_COUNT совпадений
        const matched = icaoKeys.filter(icao => icao.startsWith(query)).slice(0, SUGGESTIONS_COUNT);

        // Если совпадений нет — тоже скрываем
        if (matched.length === 0) {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.classList.remove('show');
            return;
        }

        // Формируем <li> для каждого совпадения
        let html = '';
        matched.forEach(item => {
            html += `<li data-icao="${item}">${item}</li>`;
        });

        suggestionsContainer.innerHTML = html;
        suggestionsContainer.classList.add('show');
    }

    // Вызываем при каждом вводе
    icaoInput.addEventListener('input', () => {
        icaoInput.value = icaoInput.value.replace(/[^A-Za-z]/g, '').toUpperCase();
        updateFetchBtn();
        updateIcaoSuggestions(); // <-- эта строка
    });

    departureIcaoInput.addEventListener('input', () => {
        // Удаляем все символы, кроме английских букв, и преобразуем оставшееся в верхний регистр
        departureIcaoInput.value = departureIcaoInput.value.replace(/[^A-Za-z]/g, '').toUpperCase();
        validateRoute();
    });

    arrivalIcaoInput.addEventListener('input', () => {
        // Удаляем все символы, кроме английских букв, и преобразуем оставшееся в верхний регистр
        arrivalIcaoInput.value = arrivalIcaoInput.value.replace(/[^A-Za-z]/g, '').toUpperCase();
        validateRoute();
    });

    alternatesIcaoInput.addEventListener('input', () => {
        // Удаляем все символы, кроме английских букв, и преобразуем оставшееся в верхний регистр
        alternatesIcaoInput.value = alternatesIcaoInput.value.replace(/[^A-Za-z| ]/g, '').toUpperCase();
        updateAlternatesSuggestions();
        validateRoute();
    });

    icaoInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !fetchBtn.disabled) {
            fetchWeather();
            icaoInput.blur(); // снимает фокус с поля ввода
        }
    });

    const titleButton = document.getElementById('button-title');
    if (titleButton) {
        titleButton.addEventListener('click', () => {
            if (!offlineMode) {
                location.reload();
            }
        });
    }


    function showModal() {
        modalBackdrop.classList.add('show');
    }

    function hideModal() {
        modalBackdrop.classList.remove('show');
    }

    function showOfflineWarning() {
        const warning = document.createElement('div');
        warning.className = 'time-badge offline-warning-badge';
        warning.id = 'offlineWarningBadge';
        warning.innerHTML = `
            <div class="badge-main"><i class="fa-solid fa-plane-up"></i> Авиарежим</div>
        `;
        timeBadgeContainerRow2.appendChild(warning);
        addTimeBadgeContainerBottomGap();
    }

    function showOfflineWarningNoInfo() {
        const warning = document.createElement('div');
        warning.className = 'time-badge offline-warning-no-info-badge';
        warning.id = 'offlineWarningNoInfoBadge';
        warning.innerHTML = `
            <div class="badge-main"><i class="fa-solid fa-ban"></i> Нет данных</div>
        `;
        timeBadgeContainerRow2.appendChild(warning);
        addTimeBadgeContainerBottomGap();
    }

    function resolveOppositeFriction(state) {
        // Пройдёмся по runwayFrictionMap
        // ищем каждую полосу и её «парную» (06L <-> 24R).
        // Если у одной есть фрикция, а у другой null, то копируем.
        if (!airportInfoDb[state.nowIcao] || !airportInfoDb[state.nowIcao].runways) return;

        for (let rwyName in state.runwayFrictionMap) {
            let frictionValue = state.runwayFrictionMap[rwyName];
            let oppName = findOppositeRunway(state.nowIcao, rwyName);
            if (!state.runwayFrictionMap[oppName]) {
                // Если у противоположной нет данных, копируем
                state.runwayFrictionMap[oppName] = frictionValue;
            } else if (!frictionValue) {
                // Если у "текущей" нет, а у oppName есть
                state.runwayFrictionMap[rwyName] = state.runwayFrictionMap[oppName];
            }
        }
    }

    function findWorstRunwayFriction(state) {
        // Собираем все не-null значения
        let values = Object.keys(state.runwayFrictionMap)
            .filter(k => state.runwayFrictionMap[k] !== null)
            .map(k => state.runwayFrictionMap[k]);
        if (values.length === 0) {
            // совсем нет данных => пусть будет null
            return null;
        }
        // Находим минимальное
        return Math.min(...values);
    }

    savePasswordBtn.addEventListener('click', () => {
        const pwd = modalPassword.value.trim();
        if (!pwd) {
            alert('Пароль не может быть пустым');
            return;
        }
        localStorage.setItem(PASSWORD_KEY, pwd);
        hideModal();
    });

    // === No-Connection modal (для METAR/TAF 500) ===
    const noConnModalBackdrop = document.getElementById('noConnModalBackdrop');
    const closeNoConnModalBtn = document.getElementById('closeNoConnModalBtn');
    const openOfflineBtn = document.getElementById('openOfflineBtn');

    function showNoConnModal(statusCode) {
        responseContainer.innerHTML = `
            <div class="placeholder">
                <i class="fa-solid fa-cloud-sun fa-2x"></i>
                <p>Введите ICAO код аэродрома, чтобы увидеть погоду</p>
            </div>
        `;

        const el = document.getElementById('noConnStatus');
        if (el && statusCode) el.textContent = statusCode;
        if (noConnModalBackdrop) noConnModalBackdrop.classList.add('show');
    }
    function hideNoConnModal() {
        if (noConnModalBackdrop) noConnModalBackdrop.classList.remove('show');
    }
    if (closeNoConnModalBtn) closeNoConnModalBtn.addEventListener('click', hideNoConnModal);

    const airportDetailsModalBackdrop = document.getElementById('airportDetailsModalBackdrop');
    const closeAirportDetailsModalBtn = document.getElementById('closeAirportDetailsModalBtn');
    const airportInfoContainer = document.getElementById('airportInfoContainer');

    function showAirportDetailsModal(icao) {
        if (!airportInfoDb[icao]) return;
        const data = airportInfoDb[icao];
        const contentElem = document.getElementById('airportDetailsContent');

        let html = `
            <div class="airport-details-modal-info">
                <p><b>Название:</b> ${data.geo ? data.geo.join(', ') : '-'}</p>
                <p><b>ICAO/IATA:</b> ${data.icao}${data.iata ? ' / ' + data.iata : ''}</p>
                <p><b>Превышение:</b> ${data.elevation} ft</p>
                <p><b>Склонение:</b> ${data.declination}°</p>
                <hr>
                <h3>Взлетно-посадочные полосы</h3>
        `;

        if (data.runways) {
            // Сортировка полос
            const sortedRunways = Object.keys(data.runways).sort((a, b) => {
                const numA = parseInt(a);
                const numB = parseInt(b);
                if (numA !== numB) return numA - numB;
                
                // Если номера одинаковые (например 03L, 03R), сортируем по буквам R > C > L
                const order = { 'R': 1, 'C': 2, 'L': 3 };
                const charA = a.slice(-1);
                const charB = b.slice(-1);
                return (order[charA] || 0) - (order[charB] || 0);
            });

            sortedRunways.forEach(rwyKey => {
                const rwy = data.runways[rwyKey];
                html += `
                    <div class="runway-detail-item">
                        <b>ВПП ${rwyKey}</b>: курс ${rwy.hdg}°, ${rwy.xlda} м x ${rwy.width} м
                    </div>
                `;
            });
        } else {
            html += '<p>Нет данных о полосах</p>';
        }

        html += `</div>`;
        contentElem.innerHTML = html;
        airportDetailsModalBackdrop.classList.add('show');
    }

    function hideAirportDetailsModal() {
        airportDetailsModalBackdrop.classList.remove('show');
    }

    if (airportInfoContainer) {
        airportInfoContainer.style.cursor = 'pointer';
        airportInfoContainer.addEventListener('click', () => {
            if (nowIcao) showAirportDetailsModal(nowIcao);
        });
    }
    if (closeAirportDetailsModalBtn) {
        closeAirportDetailsModalBtn.addEventListener('click', hideAirportDetailsModal);
    }
    if (airportDetailsModalBackdrop) {
        airportDetailsModalBackdrop.addEventListener('click', (e) => {
            if (e.target === airportDetailsModalBackdrop) hideAirportDetailsModal();
        });
    }

    if (noConnModalBackdrop) {
        noConnModalBackdrop.addEventListener('click', (e) => {
            if (e.target === noConnModalBackdrop) hideNoConnModal();
        });
    }
    if (openOfflineBtn) {
        openOfflineBtn.addEventListener('click', () => {
            // Включаем оффлайн и обновляем кнопки
            offlineMode = true;
            localStorage.setItem('offlineMode', JSON.stringify(offlineMode));
            if (typeof updateOfflineButton === 'function') updateOfflineButton();
            if (typeof updateSystemsButton === 'function') updateSystemsButton();
            hideNoConnModal();
        });
    }

    /* =========================
       ЗАПРОС ПОГОДЫ
    ========================= */
    async function getWeather(icao, isRefresh = false, silent = false, forceRefresh = false) {
        // Если silent === true, значит обновлять только localStorage,
        // ничего не показывать в responseContainer,
        // не показывать timeBadgeContainer, airportInfo итд.

        const password = localStorage.getItem(PASSWORD_KEY) || '';
        if (!password) {
            showModal();
            return;
        }

        if (!icao) {
            alert('Введите ICAO!');
            return;
        }

        // Создаем локальное состояние для данного запроса
        const state = {
            nowIcao: icao,
            worstRunwayFrictionCode: null,
            runwayFrictionMap: {}
        };

        const isUserRequest = !silent;
        const shouldUpdateUI = isUserRequest || (icao === nowIcao);

        if (isUserRequest) {
            nowIcao = icao;
            hideAirportInfo();
        }

        if (shouldUpdateUI && isUserRequest) {
            responseContainer.innerHTML = `
                <div class="placeholder">
                    <i class="fa-solid fa-cloud-sun fa-2x"></i>
                    <p>Введите ICAO код аэродрома, чтобы увидеть погоду</p>
                </div>
            `;
            responseContainer.style.padding = '10px';
            timeBadgeContainer.innerHTML = '';
            timeBadgeContainerRow2.innerHTML = '';
            favBadgeContainer.innerHTML = '';
            removeTimeBadgeContainerBottomGap();
        }

        const existingWarning = document.getElementById('offlineWarningBadge');
        if (existingWarning && shouldUpdateUI) {
            existingWarning.remove();
        }

        const existingWarningNoInfo = document.getElementById('offlineWarningNoInfoBadge');
        if (existingWarningNoInfo && shouldUpdateUI) {
            existingWarningNoInfo.remove();
        }

        const gamcUid = getGamcUID();
        const url = `https://myapihelper.na4u.ru/gamc_app/api.php?password=${encodeURIComponent(password)}&icao=${encodeURIComponent(icao)}&gamcUid=${encodeURIComponent(gamcUid)}`;

        if (shouldUpdateUI && isUserRequest) {
            // Заменяем текст на анимацию загрузки
            responseContainer.innerHTML = `
              <div class="loading-container">
                <div class="neuro-loader"></div>
                <div class="loading-text">Получаем данные...</div>
              </div>
            `;
            state.worstRunwayFrictionCode = null;
            timeBadgeContainer.innerHTML = '';
            timeBadgeContainerRow2.innerHTML = '';
            favBadgeContainer.innerHTML = '';
            removeTimeBadgeContainerBottomGap();
        } else {
            // В silent режиме просто инициализируем state.worstRunwayFrictionCode
            state.worstRunwayFrictionCode = null;
        }

        let toShowOfflineWarning = false;

        // Проверка сохраненных данных
        const savedData = JSON.parse(localStorage.getItem('icaoData') || '{}');

        // Проверка свежести данных для онлайн режима
        let useSavedData = false;
        if (!forceRefresh && navigator.onLine && !offlineMode && savedData[icao] && icaoColors[icao] && icaoColors[icao].updatedAt) {
            const lastUpdate = new Date(icaoColors[icao].updatedAt).getTime();
            const now = Date.now();
            if (now - lastUpdate < 60 * 60 * 1000) { // Меньше 1 часа
                useSavedData = true;
            }
        }

        if ((!navigator.onLine) || offlineMode || useSavedData) {
            if (shouldUpdateUI) showAirportInfo(icao);
            if (savedData[icao]) {
                if (shouldUpdateUI) responseContainer.innerHTML = savedData[icao];
                if (!useSavedData) toShowOfflineWarning = true;
            } else if (!useSavedData) {
                if (shouldUpdateUI) {
                    showOfflineWarningNoInfo(); // Показать предупреждение
                    responseContainer.innerHTML = 'Нет данных.';
                }
                return;
            }
        }

        try {
            let rawData;
            if ((offlineMode && toShowOfflineWarning) || useSavedData) {
                rawData = savedData[icao];
            } else {
                const res = await fetch(url);
                if (!res.ok) {
                    // 500, 502, 404 — всё сюда
                    showNoConnModal(res.status);
                    return;
                }
                rawData = await res.text();
                rawData = rawData.replace(/<br>/g, ' ');
            }

            // Сохраняем в localStorage сразу
            const currentSavedData = JSON.parse(localStorage.getItem('icaoData') || '{}');
            currentSavedData[icao] = rawData;
            localStorage.setItem('icaoData', JSON.stringify(currentSavedData));

            // Парсим <pre>
            const parser = new DOMParser();
            const doc = parser.parseFromString(rawData, 'text/html');
            const preTags = doc.querySelectorAll('pre');

            let combined = '';
            if (preTags.length === 0) {
                combined = rawData;
            } else {
                preTags.forEach((pre, idx) => {
                    let text = pre.textContent || '';
                    text = text.trim();

                    // После "=" перенос строки
                    text = text.replace(/=\s*/g, '=\n\n');

                    // Схлопываем только большие ПРОБЕЛЫ, не трогаем \n
                    text = text.replace(/ {2,}/g, ' ');

                    combined += text;
                    if (idx < preTags.length - 1) {
                        combined += '\n---------------------\n';
                    }
                });
            }

            // ====================================================
            // Разбиваем на «блоки», где каждый блок заканчивается "="
            // ====================================================
            const blocks = combined.split(/=\s*\n?/);
            if (blocks[blocks.length - 1].trim() === '') {
                blocks.pop();
            }

            // Превращаем в объекты (текст, тип, приоритет, индекс)
            const blockObjects = blocks.map((blk, idx) => {
                const trimmed = blk.trim();
                let type;
                const firstWord = trimmed.split(/\s+/, 1)[0].toUpperCase();

                if (firstWord === 'METAR' || firstWord === 'SPECI') {
                    type = firstWord;
                } else if (firstWord === 'TAF') {
                    type = 'TAF';
                } else {
                    type = 'OTHER';
                }

                let priority = 3;
                if (type === 'METAR' || type === 'SPECI') priority = 1;
                if (type === 'TAF') priority = 2;

                return {
                    text: trimmed,
                    type,
                    priority,
                    index: idx
                };
            });

            // Сортируем (METAR/SPECI -> TAF -> прочее)
            blockObjects.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                }
                return a.index - b.index;
            });

            // Склеиваем обратно с "=" и переносами
            let finalText = '';
            blockObjects.forEach((obj) => {
                // Уберём перевод строки в конце, если есть
                const trimmedEnd = obj.text.replace(/\s+$/, '');
                finalText += trimmedEnd + '=\n\n';
            });
            finalText = finalText.trimEnd(); // убираем последний \n\n

            // --- РАСЧЕТ ЦВЕТОВ И ОБНОВЛЕНИЕ icaoColors ДО СОЗДАНИЯ ПЛАШЕК ---
            let metarWorstColor = null;
            let tafWorstColor = null;

            blockObjects.forEach(block => {
                if (block.type === "METAR" || block.type === "SPECI") {
                    const color = detectWorstMetarOrSpeciColor(block.text, state);
                    if (color) metarWorstColor = compareWorstColor(metarWorstColor, color);
                } else if (block.type === "TAF") {
                    const color = detectWorstTafColor(block.text, state);
                    if (color) tafWorstColor = compareWorstColor(tafWorstColor, color);
                }
            });

            if (!toShowOfflineWarning && !useSavedData) {
                if (!icaoColors[icao]) icaoColors[icao] = {};
                icaoColors[icao].metarColor = metarWorstColor;
                icaoColors[icao].tafColor = tafWorstColor;
                icaoColors[icao].updatedAt = new Date().toISOString();
                localStorage.setItem('icaoColors', JSON.stringify(icaoColors));
            }

            // ========= Формируем плашки с временем в новом порядке =======
            if (shouldUpdateUI) {
                timeBadgeContainer.innerHTML = '';
                timeBadgeContainerRow2.innerHTML = '';
                favBadgeContainer.innerHTML = '';
                removeTimeBadgeContainerBottomGap();
            }

            const nowUTC = new Date();
            const hhUTC = String(nowUTC.getUTCHours()).padStart(2, '0');
            const mmUTC = String(nowUTC.getUTCMinutes()).padStart(2, '0');
            
            // Local Time
            const hhLT = String(nowUTC.getHours()).padStart(2, '0');
            const mmLT = String(nowUTC.getMinutes()).padStart(2, '0');

            const utcBadge = document.createElement('div');
            utcBadge.className = 'time-badge';
            utcBadge.id = 'utcBadge';
            
            const utcVal = `UTC ${hhUTC}:${mmUTC}`;
            const ltVal = `LT ${hhLT}:${mmLT}`;
            
            utcBadge.innerHTML = `<div class="badge-main"><i class="fa-solid fa-clock"></i> <span class="badge-value">${utcVal}</span></div>`;

            let utcTimer = null;
            utcBadge.addEventListener('click', () => {
                const valSpan = utcBadge.querySelector('.badge-value');
                const now = new Date();
                const hhUTC = String(now.getUTCHours()).padStart(2, '0');
                const mmUTC = String(now.getUTCMinutes()).padStart(2, '0');
                const hhLT = String(now.getHours()).padStart(2, '0');
                const mmLT = String(now.getMinutes()).padStart(2, '0');

                if (valSpan.textContent.startsWith('UTC')) {
                    valSpan.textContent = `LT ${hhLT}:${mmLT}`;
                    if (utcTimer) clearTimeout(utcTimer);
                    utcTimer = setTimeout(() => {
                        const nowBack = new Date();
                        valSpan.textContent = `UTC ${String(nowBack.getUTCHours()).padStart(2, '0')}:${String(nowBack.getUTCMinutes()).padStart(2, '0')}`;
                    }, 3000);
                } else {
                    valSpan.textContent = `UTC ${hhUTC}:${mmUTC}`;
                    if (utcTimer) clearTimeout(utcTimer);
                }
            });

            // Добавляем в контейнер первым
            if (toShowOfflineWarning && shouldUpdateUI) {
                showOfflineWarning();
            }

            if (shouldUpdateUI) {
                timeBadgeContainer.appendChild(utcBadge);

                // Плашка "обновлено назад" (справа от UTC)
                const updatedAt = icaoColors[icao] ? icaoColors[icao].updatedAt : null;
                const updateBadge = document.createElement('div');
                updateBadge.className = 'time-badge badge-default';
                updateBadge.id = 'airportUpdateBadge';
                
                let timeStr = "";
                if (updatedAt) {
                    const updateTime = new Date(updatedAt).getTime();
                    const diffMin = Math.floor((Date.now() - updateTime) / 60000);
                    timeStr = formatTimeAgoRussian(diffMin);
                } else {
                    timeStr = "Только что";
                }

                updateBadge.innerHTML = `<div class="badge-main"><i class="fa-solid fa-rotate"></i> <span class="badge-value">${timeStr}</span></div>`;
                timeBadgeContainer.appendChild(updateBadge);

                addTimeBadgeContainerBottomGap();
            }

            blockObjects.forEach(obj => {
                const re = /^(TAF|TAF AMD|TAF COR|TAF RTD|METAR|SPECI)\s+[A-Z]{4}\s+(\d{6})Z/i;
                const match = obj.text.match(re);
                if (match) {
                    const t = match[1].toUpperCase(); // METAR / SPECI / TAF / TAF AMD / TAF COR / TAF RTD
                    const ddhhmm = match[2]; // например "112030" (день=11, часы=20, минуты=30)

                    const dd = parseInt(ddhhmm.slice(0, 2), 10);
                    const hh = parseInt(ddhhmm.slice(2, 4), 10);
                    const mm = parseInt(ddhhmm.slice(4, 6), 10);

                    // Создаём дату текущего UTC-месяца и года, с днём = dd и временем hh:mm UTC
                    const now = new Date(); // текущее локальное время
                    const currentYear = now.getUTCFullYear();
                    const currentMonth = now.getUTCMonth();

                    // Пробуем собрать дату сообщения
                    const msgDate = new Date(Date.UTC(currentYear, currentMonth, dd, hh, mm));
                    const nowUTC_comp = new Date(); 
                    const diffMs = nowUTC_comp - msgDate;
                    const diffMin = Math.floor(diffMs / 60000);
                    const diffAbs = Math.abs(diffMin);

                    // Формируем текст "сколько назад"
                    let agoText = formatTimeAgoRussian(diffMin);

                    // Делаем плашку
                    const badge = document.createElement('div');
                    badge.className = 'time-badge';
                    badge.dataset.type = t;
                    badge.dataset.msgDate = msgDate.toISOString();
                    
                    const timeVal = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
                    const mainText = `${t} ${timeVal}`;
                    badge.dataset.mainText = mainText;
                    badge.dataset.agoText = agoText;
                    
                    badge.innerHTML = `<div class="badge-main"><i class="fa-solid fa-cloud"></i> <span class="badge-value">${mainText}</span></div>`;
                    
                    let badgeTimer = null;
                    badge.addEventListener('click', () => {
                        const valSpan = badge.querySelector('.badge-value');
                        if (valSpan.textContent === badge.dataset.mainText) {
                            valSpan.textContent = badge.dataset.agoText;
                            if (badgeTimer) clearTimeout(badgeTimer);
                            badgeTimer = setTimeout(() => {
                                valSpan.textContent = badge.dataset.mainText;
                            }, 3000);
                        } else {
                            valSpan.textContent = badge.dataset.mainText;
                            if (badgeTimer) clearTimeout(badgeTimer);
                        }
                    });

                    // Добавляем классы в зависимости от условий
                    if (diffAbs <= 10) {
                        badge.classList.add('badge-green');
                    } else if ((t === 'METAR' || t === 'SPECI') && diffAbs >= 30) {
                        if (diffAbs >= 180) {
                            badge.classList.add('badge-red');
                        } else {
                            badge.classList.add('badge-orange');
                        }
                    } else if ((t === 'TAF' || t === 'TAF AMD' || t === 'TAF COR' || t === 'TAF RTD') && diffAbs <= 60) {
                        badge.classList.add('badge-green');
                    } else if ((t === 'TAF' || t === 'TAF AMD' || t === 'TAF COR' || t === 'TAF RTD') && diffAbs >= 360) {
                        if (diffAbs >= 18 * 60) {
                            badge.classList.add('badge-red');
                        } else {
                            badge.classList.add('badge-orange');
                        }
                    } else {
                        badge.classList.add('badge-default');
                    }

                    if (shouldUpdateUI) {
                        // Добавляем плашку в контейнер
                        timeBadgeContainer.appendChild(badge);
                    }
                }
            });

            const airportClassBadge = document.createElement('div');
            airportClassBadge.className = 'time-badge';
            airportClassBadge.id = 'airportClassBadge';
            airportClassBadge.classList.add(getAirportColorClass(state.nowIcao));
            airportClassBadge.classList.add('content-clickable');
            airportClassBadge.innerHTML = `<div class="badge-main">${getAirportIconClass(state.nowIcao)}</div>`;

            airportClassBadge.addEventListener('click', () => {
                showMaintenanceInfoModal(getAirportClassInfoText(state.nowIcao));
            });

            if (shouldUpdateUI) {
                timeBadgeContainerRow2.appendChild(airportClassBadge);
            }

            const selectedAircraft = getAircraftType();
            const maintenanceCodes = getAircraftMaintainanceIcaos();

            const isIncludesMaintenance = maintenanceCodes.includes(icao);

            const maintenanceBadge = document.createElement('div');
            maintenanceBadge.className = 'time-badge';
            maintenanceBadge.id = 'showMaintenanceInfoModal';
            maintenanceBadge.classList.add(isIncludesMaintenance ? 'badge-green' : 'badge-red');
            maintenanceBadge.classList.add('content-clickable');
            maintenanceBadge.innerHTML = `<div class="badge-main"><i class="fa-solid fa-wrench"></i></div>`;

            maintenanceBadge.addEventListener('click', () => {
                const selectedAircraftLocal = getAircraftType();
                const maintenanceCodesLocal = getAircraftMaintainanceIcaos();
                let maintenanceInfoLocal = maintenance[selectedAircraftLocal]?.info;
                const isIncludesMaintenanceLocal = maintenanceCodesLocal.includes(icao);

                if (isIncludesMaintenanceLocal) {
                    showMaintenanceInfoModal(`На аэродроме <b>${icao}</b> <span style="color: var(--badge-green-bg)"><b>осуществляется</b></span> техническое обслуживание <b>${selectedAircraftLocal.replaceAll(',', ', ')}</b>` + (maintenanceInfoLocal ? `<br><br>Сведение: ${maintenanceInfoLocal}` : ''));
                } else {
                    showMaintenanceInfoModal(`На аэродроме <b>${icao}</b> <span style="color: var(--badge-red-bg)"><b>НЕ осуществляется</b></span> техническое обслуживание <b>${selectedAircraftLocal.replaceAll(',', ', ')}</b>`);
                }
            });

            if (shouldUpdateUI) {
                timeBadgeContainerRow2.appendChild(maintenanceBadge);
            }

            const atifLangSelected = localStorage.getItem('atisLangSelect') || 'en';
            const atisFrqInfo = getAtisFrequencyByIcao(icao, 'arrival', atifLangSelected);

            if (atisFrqInfo) {
                const atisBadge = document.createElement('div');
                atisBadge.className = 'time-badge';
                atisBadge.id = 'atisFrqBtn';
                atisBadge.classList.add('badge-default');
                atisBadge.classList.add('content-clickable');
                atisBadge.onclick = changeLangAtis;
                atisBadge.innerHTML = `<div class="badge-main"><i class="fa-solid fa-tower-cell"></i> ${atisFrqInfo.frq}` +
                    (atisFrqInfo.lang ? ` ${atisFrqInfo.lang.toUpperCase()}` : '') + `</div>`;

                if (shouldUpdateUI) {
                    timeBadgeContainerRow2.appendChild(atisBadge);
                }
            }

            finalText = insertLineBreaks(finalText);
            if (doHighlight) {
                // Сначала синхронизируем фрикцию по противоположным полосам
                resolveOppositeFriction(state);
                // Затем вычисляем худшую фрикцию (измеренную)
                state.worstRunwayFrictionCode = findWorstRunwayFriction(state);
                // После этого выполняем подсветку, которая теперь будет учитывать измеренный коэффициент
                finalText = highlightKeywords(finalText, state);
            }

            if (!finalText.includes("НЕТ В КАТАЛОГЕ,ОБРАЩАЙТЕСЬ К СИНОПТИКУ=")) {
                // Сохраняем icao в историю ТОЛЬКО если сейчас выбран режим "recent"
                if (!isRefresh && icao.length === 4 && routeSelect.value === 'recent') {
                    saveIcaoToHistory(icao);
                }

                // Сохранение finalText в localStorage
                if (icao && finalText) {
                    const savedData = JSON.parse(localStorage.getItem('icaoData') || '{}');
                    savedData[icao] = rawData;
                    localStorage.setItem('icaoData', JSON.stringify(savedData));
                }
            }

            if (shouldUpdateUI) {
                responseContainer.innerHTML = finalText;
                showAirportInfo(icao);
                updateSystemsButton(silent);
            }

            const buttons = document.querySelectorAll('.history button');
            let buttonInHistory = null;
            for (const btn of buttons) {
                if (btn.textContent.trim().toUpperCase() === icao.toUpperCase()) {
                    buttonInHistory = btn;
                    break;
                }
            }

            if (buttonInHistory) {
                applyIcaoButtonColors(icao, buttonInHistory);
            }
        } catch (err) {
            if (shouldUpdateUI) responseContainer.textContent = 'Ошибка при запросе: ' + err;
        }
    }

    function setButtonColorSplit(btn, metarColor, tafColor) {
        btn.style.background = `linear-gradient(to right, var(--col-${metarColor}) 50%, var(--col-${tafColor}) 50%)`;
        btn.style.color = 'white';
        btn.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.4)';
        btn.style.border = 'none';
        btn.style.boxShadow = 'var(--shadow-sm)';
    }

    function applyIcaoButtonColors(icao, btn) {
        // --- Логика техобслуживания (wrench icon) ---
        if (doMarkBagde) {
            const maintenanceCodes = getAircraftMaintainanceIcaos();
            if (maintenanceCodes.includes(icao)) {
                btn.classList.add('has-maintenance');
            } else {
                btn.classList.remove('has-maintenance');
            }
        } else {
            btn.classList.remove('has-maintenance');
        }

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
            'disabled';
        const tafColor = colObj.tafColor ?
            colObj.tafColor.replace('color-', '') :
            'disabled';

        // Функция, которая делает градиент «пополам»
        setButtonColorSplit(btn, metarColor, tafColor);
    }

    function insertLineBreaks(text) {
        // Вставляем перенос строки перед PROB40 и PROB30
        text = text.replace(/\b(PROB40|PROB30)\b/g, '\n$1');

        // Вставляем перенос строки перед FMXXXXXX
        text = text.replace(/\b(FM\d{6})\b/g, '\n$1');

        // Вставляем перенос строки перед TEMPO, BECMG, RMK, INTER,
        // если перед ними не стоит PROB30 или PROB40
        text = text.replace(/(?<!PROB30\s)(?<!PROB40\s)\b(TEMPO|BECMG|RMK|INTER)\b/g, '\n$1');

        return text;
    }

    function highlightKeywords(text, state) {
        // 1) Подчёркиваем TEMPO, BECMG, PROB40, PROB30:
        text = text.replace(/\b(TEMPO|BECMG|INTER|PROB40|PROB30)\b/g, '<u>$1</u>');

        // ...и любые FM + 6 цифр, например FM241500
        text = text.replace(/\bFM\d{6}\b/g, '<u>$&</u>');

        // 2) Делаем жирным:
        //   - "METAR <ICAO> <DDHHMM>Z"
        //   - "SPECI <ICAO> <DDHHMM>Z"
        //   - "TAF <ICAO> <DDHHMM>Z"
        //
        // Пример: "METAR UUEE 112030Z" → <b>METAR UUEE 112030Z</b>
        text = text.replace(/\b(METAR\s+[A-Z]{4}\s+\d{6}Z)\b/g, '<b>$1</b>');
        text = text.replace(/\b(SPECI\s+[A-Z]{4}\s+\d{6}Z)\b/g, '<b>$1</b>');
        text = text.replace(/\b(TAF\s+[A-Z]{4}\s+\d{6}Z)\b/g, '<b>$1</b>');
        text = text.replace(/\b(TAF AMD\s+[A-Z]{4}\s+\d{6}Z)\b/g, '<b>$1</b>');
        text = text.replace(/\b(TAF COR\s+[A-Z]{4}\s+\d{6}Z)\b/g, '<b>$1</b>');
        text = text.replace(/\b(TAF RTD\s+[A-Z]{4}\s+\d{6}Z)\b/g, '<b>$1</b>');
        // LTBB SIGMET 4
        text = text.replace(/\b([A-Z]{4}\s+SIGMET\s+\d{1,3})\b/g, '<b>$1</b>');
        text = text.replace(/\b([A-Z]{4}\s+AIRMET\s+\d{1,3})\b/g, '<b>$1</b>');

        // 3) Выделение именно четырехзначных чисел как отдельных слов

        text = text.replace(/(^|\s)(\d{4})(?=$|\s)/g, (match, prefix, numStr) => {
            let num = parseInt(numStr, 10);
            let colorClass = '';
            if (num > 3500) {
                colorClass = 'color-green';
            } else if (num > 1200 && num <= 3500) {
                colorClass = 'color-yellow';
            } else if (num >= 550 && num <= 1200) {
                colorClass = 'color-red';
            } else if (num < 550) {
                colorClass = 'color-darkred';
            }
            return prefix + (colorClass ? `<span class="${colorClass}">${numStr}</span>` : numStr);
        });

        // Выделение CAVOK и NSC зелёным цветом
        text = text.replace(/\b(CLR|CAVOK|NCD|NSW|NSC|GOOD|VMC|VFR)\b/g, '<span class="color-green">$1</span>');
        text = text.replace(/\b(WS)\b/g, '<span class="color-purple-ws">$1</span>');

        // Ищем групп облачности типа BKN или OVC с указанием высоты, например, BKN020 или OVC100
        text = text.replace(/\b(OVC|BKN)(\d{3})(?:CB|TCU)?\b/g, (match, type, heightStr) => {
            let height = parseInt(heightStr, 10);
            let colorClass;

            if (height < 2) {
                colorClass = 'color-darkred';
            } else if (height >= 2 && height <= 4) {
                colorClass = 'color-red';
            } else if (height >= 5 && height <= 10) {
                colorClass = 'color-yellow';
            } else {
                colorClass = 'color-green';
            }

            return `<span class="${colorClass}">${match}</span>`;
        });

        // Обработка обозначений полос типа RWY21L без подробной информации
        text = text.replace(/\bRWY(\d{2}[LCR]?)\b/g, (match, rwy) => {
            // Создаем элемент span с классом runway-info и передаем необходимые данные
            return `<span class="runway-info" data-runway="${rwy}" data-info="//////">${match}</span>`;
        });

        text = text.replace(/\bR(\d{2}[LCR]?)\/([0-9/]{6,})(?=[^0-9/]|$)/g, (match, rwy, info) => {
            if (/^\/{6,}$/.test(info)) {
                return match; // ничего не сохраняем
            }

            // Парсим код, например "94" или "95" или "99" или "43" (то есть 0.43) и т.д.
            // info[4..5] — две последних цифры. Если там не цифры, вернёмся
            let frictionStr = info.slice(4, 6);
            let frictionNum = parseInt(frictionStr, 10);
            // frictionNum может быть от 10 до 99, либо NaN

            if (!isNaN(frictionNum) && frictionNum >= 10 && frictionNum <= 99) {
                // Вместо записи в worstRunwayFrictionCode
                // запоминаем отдельное значение фрикции для runway rwy:

                if (!state.runwayFrictionMap[rwy]) {
                    state.runwayFrictionMap[rwy] = frictionNum === 99 ? null : frictionNum;
                }
            }

            return `<span class="color-description runway-info" data-runway="${rwy}" data-info="${info}">${match}<i class="fa fa-info-circle" aria-hidden="true"></i></span>`;
        });

        // Распознавание и выделение групп погодных явлений (METAR/TAF)
        text = text.replace(/(?<=^|\s)([+-]|VC)?(MI|PR|BC|DR|BL|SH|TS|FZ)?((?:DZ|RA|SN|SG|IC|PL|GR|GS|UP|FG|BR|HZ|FU|VA|DU|SA|PY|PO|SQ|FC|SS|DS)+)(?=$|\s)/g, (token, prefix, descriptor, phenomenaStr) => {
            // Токен не должен содержать цифр
            if (/\d/.test(token)) return token;

            // Явления идут парами по 2 буквы
            if (phenomenaStr.length % 2 !== 0) return token;
            
            const phenomenaList = [];
            for (let i = 0; i < phenomenaStr.length; i += 2) {
                const code = phenomenaStr.substring(i, i + 2);
                if (!WEATHER_PHENOMENA[code]) return token; // Неизвестное явление
                phenomenaList.push(code);
            }

            // Правила валидности
            // TS и SH не могут быть вместе (в токене дескриптор только один, но SH не может быть в phenomena)
            // В нашем словаре SH - дескриптор, его нет в WEATHER_PHENOMENA. 
            // Поэтому if (!WEATHER_PHENOMENA[code]) уже отсечет SH из списка явлений.

            // FZ только с FG/DZ/RA
            if (descriptor === 'FZ') {
                const allowed = ['FG', 'DZ', 'RA'];
                if (!phenomenaList.some(p => allowed.includes(p))) return token;
            }

            // BL/DR только с SN/SA/DU
            if (descriptor === 'BL' || descriptor === 'DR') {
                const allowed = ['SN', 'SA', 'DU'];
                if (!phenomenaList.some(p => allowed.includes(p))) return token;
            }

            // Если всё ок — оборачиваем
            return `<span class="weather-phenomena-token color-description" data-token="${token}" data-prefix="${prefix || ''}" data-descriptor="${descriptor || ''}" data-phenomena="${phenomenaList.join(',')}">${token}<i class="fa fa-info-circle" aria-hidden="true"></i></span>`;
        });

        // Распознавание и выделение информации о ветре
        text = text.replace(/\b((?:\d{3}|VRB)\d{2,3}(?:G\d{2,3})?(?:MPS|KT))\b/g,
            (fullMatch, _) => {
                // Разбираем группой: ddd - направление, потом скорость, потом G.., потом единицы
                // Теперь учтём VRB в группе направления
                let re = /^((?:\d{3}|VRB))(\d{2,3})(G\d{2,3})?(MPS|KT)$/;
                let m = fullMatch.match(re);
                if (!m) return fullMatch;

                let [, dir, speedStr, gustStr, unit] = m;
                let windSpd = parseInt(speedStr, 10);
                let windGust = gustStr ? parseInt(gustStr.slice(1), 10) : null;

                // 1) Получаем «худшее» состояние полосы
                const worst = getWorstRunwayCondition(state);

                // 2) Находим предельный боковой для landing (по заданию)
                //    a) reportedBrakingActions   b) coefficientBrakingActions
                let landingLimitKts; // fallback
                let landingLimitMps;

                if (worst.kind === 'reported') {
                    // например { category:'poor', ... }
                    let cat = worst.category;
                    let limObj = reportedBrakingActions.landing[cat] ||
                        reportedBrakingActions.landing.good;
                    landingLimitKts = limObj.kts;
                    landingLimitMps = limObj.mps;
                } else {
                    // measured => worst.frictionValue + relevantData
                    let fVal = worst.frictionValue; // 0.43, например
                    let landMap = worst.relevantData.landing; // объект {0.51:{kts:40,mps:20.6},0.4:{kts:40,...}, ...}

                    // нужно найти подходящий лимит
                    function findLimit(obj, friction) {
                        let keys = Object.keys(obj).map(x => parseFloat(x)).filter(x => !isNaN(x)).sort((a, b) => b - a);
                        for (let k of keys) {
                            if (k <= friction) return obj[k];
                        }
                        // если ничего не нашли - берём последний
                        return obj[keys[keys.length - 1]];
                    }

                    let limitObj = findLimit(landMap, fVal);
                    landingLimitKts = limitObj.kts;
                    landingLimitMps = limitObj.mps;
                }

                // 3) Определяем скорость, которую берём для вычисления %
                //    «если steady wind → windSpd, если есть порыв (gustStr) → gust»
                let usedWind = windGust ? windGust : windSpd;

                // 4) Переводим landingLimit в такие же единицы
                let limit = (unit === 'MPS') ? landingLimitMps : landingLimitKts;

                // Добавляем функцию для нормализации угла, если её нет
                function normalize(angle) {
                    let a = angle % 360;
                    return (a < 0) ? a + 360 : a;
                }

                const declination = (airportInfoDb[state.nowIcao] && airportInfoDb[state.nowIcao].declination) || 0;
                const windDirInt = (dir === "VRB") ? null : parseInt(dir, 10);
                let ratio;
                if (windDirInt !== null && airportInfoDb[state.nowIcao] && airportInfoDb[state.nowIcao].runways) {
                    const windDirMag = normalize(windDirInt - declination);
                    let worstCrosswindRatio = 0;
                    // Перебираем все полосы аэродрома
                    Object.entries(airportInfoDb[state.nowIcao].runways).forEach(([_, rwyData]) => {
                        const runwayHeading = rwyData.hdg;
                        // Разница между направлением ветра (магнитное) и курсом ВПП
                        let diffAngle = Math.abs(normalize(windDirMag - runwayHeading));
                        if (diffAngle > 180) diffAngle = 360 - diffAngle;
                        // Вычисляем боковой компонент
                        const crosswind = usedWind * Math.sin(diffAngle * Math.PI / 180);
                        const candidateRatio = (Math.abs(crosswind) / limit) * 100;
                        if (candidateRatio > worstCrosswindRatio) {
                            worstCrosswindRatio = candidateRatio;
                        }
                    });
                    ratio = worstCrosswindRatio;
                } else {
                    // Если данных о ВПП нет — используем общий подход
                    ratio = (usedWind / limit) * 100;
                }

                // 6) Выбираем цвет
                //    <35% = green
                //    40..70 = yellow
                //    70..90 = red
                //    >=90 = purple
                //   (в 35..40 остаётся без цвета)
                // 6) Выбираем цвет на основе рассчитанного ratio
                let colorClass = '';
                if (ratio < 40) {
                    if ((usedWind >= 10 && unit === "MPS") || (usedWind >= 20 && unit !== "MPS")) {
                        colorClass = 'color-yellow';
                    } else if ((usedWind >= 15 && unit === "MPS") || (usedWind >= 30 && unit !== "MPS")) {
                        colorClass = 'color-red';
                    } else if ((usedWind >= 20 && unit === "MPS") || (usedWind >= 40 && unit !== "MPS")) {
                        colorClass = 'color-purple';
                    } else {
                        colorClass = 'color-green';
                    }
                } else if (ratio >= 40 && ratio < 70) {
                    colorClass = 'color-yellow';
                } else if (ratio >= 70 && ratio < 90) {
                    colorClass = 'color-red';
                } else if (ratio >= 90) {
                    colorClass = 'color-purple';
                }

                // Возвращаем HTML
                return `<span class="wind-info ${colorClass}" data-wind="${fullMatch}" data-unit="${unit}" data-dir="${dir}" data-speed="${speedStr}" data-gust="${gustStr||''}">${fullMatch}<i class="fa-solid fa-wind"></i></span>`;
            }
        );

        // Оборачиваем строки, начинающиеся с TEMPO, в контейнер для альтернативного оформления
        text = text.replace(/^(<u>TEMPO<\/u>.*)$/gm, '<span class="tempo-line">$1</span>');
        text = text.replace(/^(<u>PROB30<\/u>.*)$/gm, '<span class="tempo-line">$1</span>');
        text = text.replace(/^(<u>PROB40<\/u>.*)$/gm, '<span class="tempo-line">$1</span>');

        return text;
    }

    /* =========================
       ОБРАБОТЧИКИ КНОПОК
    ========================= */
    function fetchWeather() {
        const icao = icaoInput.value.trim().toUpperCase();
        icaoInput.value = icao;
        getWeather(icao, false, false, true);
        updateFetchBtn();
        updateSystemsButton();

        // --- добавляешь это ---
        const suggestionsContainer = document.getElementById('icaoSuggestions');
        suggestionsContainer.classList.remove('show');
        suggestionsContainer.innerHTML = '';

        updateSelectedPlacard();
    }

    fetchBtn.addEventListener('click', () => {
        fetchWeather();
    });

    /* =========================
       ИСТОРИЯ LAST_COUNT ICAO
    ========================= */
    function saveIcaoToHistory(icao) {
        icao = icao.toUpperCase();
        let history = JSON.parse(localStorage.getItem(ICAO_HISTORY_KEY) || '[]');

        // Обновляем массив
        history = history.filter(item => item !== icao);
        history.unshift(icao);
        history = history.slice(0, LAST_COUNT);
        localStorage.setItem(ICAO_HISTORY_KEY, JSON.stringify(history));

        // Если сейчас "Недавние", то сразу перерисуем
        if (routeSelect.value === 'recent') {
            renderHistory();
        }
    }

    function renderHistory() {
        let history = JSON.parse(localStorage.getItem(ICAO_HISTORY_KEY) || '[]');
        historyContainer.innerHTML = '';

        history.forEach(icao => {
            const btn = document.createElement('button');
            btn.textContent = icao;

            // Сначала применяем общие стили (включая иконку техобслуживания)
            applyIcaoButtonColors(icao, btn);

            let colObj = icaoColors[icao];
            if (colObj) {
                // colObj.metarColor может быть "color-green", "color-yellow"...
                // colObj.tafColor   может быть другое
                const mc = colObj.metarColor || "color-green";
                const tc = colObj.tafColor || "color-green";

                // Превратим эти классы в реальные цвета.
                // Но можно чуть хитрее. Например, прописать в CSS класс .split-button[color-red][color-green] { background: ... }
                // Но проще inline-стилями:
                const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                convertColorClassToBg(mc, isDark);
                convertColorClassToBg(tc, isDark);

                btn.classList.remove('color-green', 'color-yellow', 'color-red', 'color-purple', 'color-darkred');
                // Мы уже вызвали applyIcaoButtonColors выше, но там она могла выйти раньше, если нет colObj.
                // Но техобслуживание мы уже проверили внутри applyIcaoButtonColors.
                // Чтобы не дублировать вызов и не перезатирать градиент, просто оставим как есть.
            }

            btn.addEventListener('click', () => {
                icaoInput.value = icao;
                getWeather(icao, false);
                updateFetchBtn();
            });
            historyContainer.appendChild(btn);
        });
    }

    // Функция для обновления масштаба
    function updateZoom(scale) {
        document.body.style.transformOrigin = 'center top'; // Устанавливаем точку трансформации
        document.body.style.zoom = scale; // Применяем масштаб
        localStorage.setItem('pageZoom', scale); // Сохраняем масштаб в localStorage
    }

    // Увеличить масштаб
    const zoomInBtn = document.getElementById('zoomInBtn');
    zoomInBtn.addEventListener('click', () => {
        let currentZoom = parseFloat(localStorage.getItem('pageZoom') || 1);
        currentZoom = Math.min(currentZoom + 0.1, 2); // Лимит увеличения до 200%
        updateZoom(currentZoom);
    });

    // Уменьшить масштаб
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    zoomOutBtn.addEventListener('click', () => {
        let currentZoom = parseFloat(localStorage.getItem('pageZoom') || 1);
        currentZoom = Math.max(currentZoom - 0.1, 0.5); // Лимит уменьшения до 50%
        updateZoom(currentZoom);
    });

    // Сброс масштаба
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    resetZoomBtn.addEventListener('click', () => {
        const defaultZoom = 1; // Масштаб по умолчанию
        updateZoom(defaultZoom); // Сбросить масштаб
    });

    const savedZoom = parseFloat(localStorage.getItem('pageZoom') || 1);
    updateZoom(savedZoom); // Восстанавливаем масштаб из localStorage

    // Находим элементы второго (подтверждающего) модального окна
    const confirmModalBackdrop = document.getElementById('confirmModalBackdrop');
    const confirmModalTitle = document.getElementById('confirmModalTitle');
    const confirmModalMessage = document.getElementById('confirmModalMessage');
    const closeConfirmModalBtn = document.getElementById('closeConfirmModalBtn');
    const confirmYesBtn = document.getElementById('confirmYesBtn');
    const confirmNoBtn = document.getElementById('confirmNoBtn');

    const confirmModalExtra = document.getElementById('confirmModalExtra');
    const confirmModalCheckbox = document.getElementById('confirmModalCheckbox');
    const confirmModalCheckboxLabel = document.getElementById('confirmModalCheckboxLabel');

    /**
     * Показывает модалку подтверждения с заголовком, сообщением и коллбэком,
     * который вызывается по нажатию "Да".
     */
    function showConfirmModal(title, message, onYes, onYesBgColor = "", onNoBgColor = "", extra = null) {
        confirmModalTitle.textContent = title;
        confirmModalMessage.innerHTML = message.replace(/\n/g, '<br>');

        if (extra && extra.checkbox) {
            confirmModalExtra.style.display = 'block';
            confirmModalCheckbox.checked = extra.checkbox.checked || false;
            confirmModalCheckboxLabel.textContent = extra.checkbox.label || 'Обновить все аэродромы';
            
            if (extra.checkbox.onToggle) {
                confirmModalCheckbox.onchange = () => {
                    extra.checkbox.onToggle(confirmModalCheckbox.checked);
                };
            } else {
                confirmModalCheckbox.onchange = null;
            }
        } else {
            confirmModalExtra.style.display = 'none';
            confirmModalCheckbox.onchange = null;
        }

        // При нажатии на "Да" выполняем нужное действие
        confirmYesBtn.onclick = () => {
            const isChecked = confirmModalCheckbox.checked;
            hideConfirmModal();

            // Передаём во внешний обработчик, если нужно
            if (extra && extra.checkbox) {
                onYes(isChecked);
            } else {
                onYes();
            }
        };

        confirmYesBtn.style.backgroundColor = onYesBgColor;
        confirmNoBtn.style.backgroundColor = onNoBgColor;

        confirmModalBackdrop.classList.add('show');
    }

    function showOfflineAlert() {
        confirmModalTitle.textContent = 'Оффлайн режим включен';
        confirmModalMessage.textContent = 'Отключите оффлайн режим для обновления';
        confirmModalExtra.style.display = 'none';

        // Спрячем кнопку "Да" полностью
        confirmYesBtn.style.display = 'none';

        // Заменим текст второй кнопки на "Закрыть"
        confirmNoBtn.textContent = 'Закрыть';

        // Показываем модалку
        confirmModalBackdrop.classList.add('show');
    }

    /** Скрыть модалку подтверждения */
    function hideConfirmModal() {
        confirmModalBackdrop.classList.remove('show');
        confirmModalExtra.style.display = 'none';
        confirmModalCheckbox.onchange = null;

        // Восстанавливаем кнопки
        confirmYesBtn.style.display = '';
        confirmYesBtn.onclick = null; // сбросим обработчик, чтобы не мешалось

        confirmNoBtn.textContent = 'Нет';
        // Можно сбрасывать и стили backgroundColor, если вы их меняли вручную
        confirmNoBtn.style.backgroundColor = '';
        confirmYesBtn.style.backgroundColor = '';
    }

    // По клику на кнопку закрытия (крестик) — тоже просто скрываем
    closeConfirmModalBtn.addEventListener('click', hideConfirmModal);

    // Или по клику на "Нет"
    confirmNoBtn.addEventListener('click', hideConfirmModal);

    // ------------------------------
    // Заменяем логику для удаления сохранённых ICAO
    // ------------------------------
    removeSavedIcaosBtn.addEventListener('click', () => {
        showConfirmModal(
            'Удаление метеоинформации',
            'Вы действительно хотите удалить всю сохранённую метеоинформацию?',
            () => {
                // Действие, если пользователь подтвердил
                localStorage.removeItem(ICAO_HISTORY_KEY);
                localStorage.removeItem('icaoData');
                location.reload();
            },
            onYesBgColor = "var(--badge-orange-bg)"
        );
    });

    // ------------------------------
    // Заменяем логику для сброса пароля
    // ------------------------------
    resetPasswordBtn.addEventListener('click', () => {
        showConfirmModal(
            'Сброс пароля',
            'Вы действительно хотите сбросить пароль?',
            () => {
                // Действие, если пользователь подтвердил
                localStorage.removeItem(PASSWORD_KEY);
                location.reload();
            },
            onYesBgColor = "var(--badge-orange-bg)"
        );
    });

    function showRunwayInfoModal(content) {
        const modal = document.getElementById('runwayInfoModal');
        const contentElem = document.getElementById('runwayInfoContent');
        contentElem.innerHTML = content;
        modal.classList.add('show');
    }

    function hideRunwayInfoModal() {
        const modal = document.getElementById('runwayInfoModal');
        modal.classList.remove('show');
    }

    // Закрытие модального окна при нажатии на кнопку
    document.getElementById('closeRunwayInfoModalBtn').addEventListener('click', hideRunwayInfoModal);

    // Закрытие модального окна при клике вне его области
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('runwayInfoModal');
        if (e.target === modal) hideRunwayInfoModal();
    });

    function decodeRunwayInfo(runway, info) {
        const [condition, coverage, depth, friction] = [
            parseInt(info[0], 10), // Условия покрытия
            parseInt(info[1], 10), // Степень покрытия
            parseInt(info.slice(2, 4), 10), // Толщина покрытия
            parseInt(info.slice(4, 6), 10) // Коэффициент сцепления
        ];

        let runwayDesc = runway;
        if (runwayDesc === "88") {
            runwayDesc = "для всех ВПП";
        } else if (runwayDesc === "99") {
            runwayDesc = "повторение последнего сообщения";
        }

        const conditionDesc = {
            0: "сухо",
            1: "влажно",
            2: "мокро или вода местами",
            3: "иней или изморозь",
            4: "сухой снег",
            5: "мокрый снег",
            6: "слякоть",
            7: "лёд",
            8: "уплотнённый, укатанный снег",
            9: "замёрзшая или неровная поверхность"
        } [condition] || "нет данных";

        const coverageDesc = {
            1: "менее 10% ВПП",
            2: "от 11% до 25% ВПП",
            5: "от 26% до 50% ВПП",
            9: "от 51% до 100% ВПП"
        } [coverage] || "нет данных";

        const depthDesc = depth ? (depth >= 91 ?
            `${(depth - 90) * 5} см` :
            depth === 0 ?
            "менее 1 мм" :
            `${depth} мм`) : "нет данных";

        let frictionDesc = {
            91: "плохой",
            92: "плохой/средний",
            93: "средний",
            94: "средний/хороший",
            95: "хороший",
            99: "ненадежное измерение"
        } [friction] || "нет данных";

        let nConditionCodeTmp = '-';
        let mConditionCodeTmp = '-';

        function getOptOfferSelection(condition, depth) {
            if (typeof condition !== 'number' || typeof depth !== 'number') return '-';

            try {
                switch (condition) {
                    case 0:
                        return 'DRY';
                    case 1:
                        return 'WET';
                    case 2:
                        return depth && depth <= 3 ? 'WET' : 'WET or MEDIUM';
                    case 3:
                        return 'GOOD';
                    case 4:
                        return depth ? (depth >= 2 ? `DRY SNOW (${depth} mm)` : 'GOOD') : 'MEDIUM';
                    case 5:
                        return depth && depth <= 3 ? 'GOOD' : 'MEDIUM';
                    case 6:
                        return depth ? (depth >= 2 ? `SLUSH (${depth} mm)` : 'GOOD') : 'MEDIUM-POOR';
                    case 7:
                        return 'POOR';
                    case 8:
                        return 'CMPCT SNOW';
                    case 9:
                        return 'PROHIBITED';
                    default:
                        return '-';
                }
            } catch (e) {
                return '-';
            }
        }

        // Если frictionDesc === "Нет данных" и является числом от 10 до 90
        if (frictionDesc === "нет данных" && friction >= 10 && friction <= 90) {
            frictionDesc = `0.${friction}`;

            for (const coef of Object.keys(coefficientBrakingActions.normative.takeoff)) {
                const numCoef = parseFloat(coef);
                if (numCoef > (friction / 100)) {
                    continue;
                }
                nConditionCodeTmp = runwayConditionCaptions[coefficientBrakingActions.normative.takeoff[coef].code];
                break;
            }

            for (const coef of Object.keys(coefficientBrakingActions.by_sft.takeoff)) {
                const numCoef = parseFloat(coef);
                if (numCoef > (friction / 100)) {
                    continue;
                }
                mConditionCodeTmp = runwayConditionCaptions[coefficientBrakingActions.by_sft.takeoff[coef].code];
                break;
            }
        }

        const optSelection = getOptOfferSelection(condition, depth);

        // Получаем данные о полосе из БД
        let runwayHdg = "-";
        let runwaySize = "-";
        if (nowIcao && airportInfoDb[nowIcao] && airportInfoDb[nowIcao].runways) {
            const rwyData = airportInfoDb[nowIcao].runways[runway];
            if (rwyData) {
                runwayHdg = `${rwyData.hdg}°`;
                runwaySize = `${rwyData.xlda}x${rwyData.width} м`;
            }
        }

        return `
            <div class="runway-code-badge">${runway} / ${info}</div>
            
            <div class="runway-header-badges">
                <div class="header-badge">
                    <span class="badge-label">ВПП</span>
                    <span class="badge-value">${runwayDesc}</span>
                </div>
                <div class="header-badge">
                    <span class="badge-label">КУРС</span>
                    <span class="badge-value">${runwayHdg}</span>
                </div>
                <div class="header-badge">
                    <span class="badge-label">РАЗМЕР</span>
                    <span class="badge-value">${runwaySize}</span>
                </div>
            </div>

            <div class="runway-params-grid">
                <div class="runway-param-card">
                    <div class="runway-param-label"><i class="fa-solid fa-cloud-showers-heavy"></i> Условия</div>
                    <div class="runway-param-value">${conditionDesc} <span class="text-secondary">(${condition || "0"})</span></div>
                </div>
                <div class="runway-param-card">
                    <div class="runway-param-label"><i class="fa-solid fa-chart-pie"></i> Степень</div>
                    <div class="runway-param-value">${coverageDesc} <span class="text-secondary">(${coverage || "0"})</span></div>
                </div>
                <div class="runway-param-card">
                    <div class="runway-param-label"><i class="fa-solid fa-arrows-up-down"></i> Толщина</div>
                    <div class="runway-param-value">${depthDesc} <span class="text-secondary">(${depth || "0"})</span></div>
                </div>
                <div class="runway-param-card">
                    <div class="runway-param-label"><i class="fa-solid fa-gauge-high"></i> Коэф сцеп</div>
                    <div class="runway-param-value">${frictionDesc} <span class="text-secondary">(${friction || "0"})</span></div>
                </div>
            </div>

            <div class="opt-section">
                <div class="opt-title"><i class="fa-solid fa-microchip"></i> Для OPT</div>
                <div class="opt-badges-row">
                    <div class="opt-badge">
                        <span class="opt-label">Нормативное</span>
                        <span class="opt-value">${nConditionCodeTmp}</span>
                    </div>
                    <div class="opt-badge">
                        <span class="opt-label">Измеренное</span>
                        <span class="opt-value">${mConditionCodeTmp}</span>
                    </div>
                    <div class="opt-badge">
                        <span class="opt-label">Покрытие</span>
                        <span class="opt-value">${optSelection}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Обработчик клика по элементам информации о ВПП
    document.addEventListener('click', (e) => {
        const target = e.target.closest('.color-description.runway-info');
        if (target) {
            const runway = target.dataset.runway;
            const info = target.dataset.info;
            const content = decodeRunwayInfo(runway, info);
            showRunwayInfoModal(content);
        }
    });

    function showWindInfoModal(content) {
        const modal = document.getElementById('windInfoModal');
        const contentElem = document.getElementById('windInfoContent');
        contentElem.innerHTML = content;
        modal.classList.add('show');
    }

    function hideWindInfoModal() {
        const modal = document.getElementById('windInfoModal');
        modal.classList.remove('show');
    }

    document.getElementById('closeWindInfoModalBtn').addEventListener('click', hideWindInfoModal);

    document.addEventListener('click', (e) => {
        const modal = document.getElementById('windInfoModal');
        if (e.target === modal) hideWindInfoModal();
    });

    function showMaintenanceInfoModal(content) {
        const modal = document.getElementById('maintenanceInfoModal');
        const contentElem = document.getElementById('maintenanceInfoContent');
        contentElem.innerHTML = content;
        modal.classList.add('show');
    }

    function hideMaintenanceInfoModal() {
        const modal = document.getElementById('maintenanceInfoModal');
        modal.classList.remove('show');
    }

    document.getElementById('closeMaintenanceInfoModalBtn').addEventListener('click', hideMaintenanceInfoModal);

    document.addEventListener('click', (e) => {
        const modal = document.getElementById('maintenanceInfoModal');
        if (e.target === modal) hideMaintenanceInfoModal();
    });

    function decodeWeatherPhenomena(prefix, descriptor, phenomenaCodes) {
        let html = '';
        const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

        // Интенсивность / VC
        if (prefix) {
            let prefTextEN = "";
            let prefTextRU = "";
            if (prefix === '+') { prefTextEN = "Heavy"; prefTextRU = "сильный"; }
            else if (prefix === '-') { prefTextEN = "Light"; prefTextRU = "слабый"; }
            else if (prefix === 'VC') { prefTextEN = "In the vicinity"; prefTextRU = "в окрестности"; }
            
            html += `<p><b>Интенсивность / VC:</b> ${capitalize(prefTextRU)} (${capitalize(prefTextEN)})</p>`;
        }

        // Дескриптор
        if (descriptor && WEATHER_DESCRIPTORS[descriptor]) {
            const desc = WEATHER_DESCRIPTORS[descriptor];
            html += `<p><b>Дескриптор:</b> ${capitalize(desc.ru)} (${capitalize(desc.en)})</p>`;
        }

        // Явления
        if (phenomenaCodes) {
            const codes = phenomenaCodes.split(',');
            html += `<hr><h3>Явления</h3>`;
            codes.forEach(code => {
                const phenom = WEATHER_PHENOMENA[code];
                if (phenom) {
                    html += `<div class="runway-detail-item"><b>${code}:</b> ${capitalize(phenom.ru)} (${capitalize(phenom.en)})</div>`;
                }
            });
        }

        return html;
    }

    function showWeatherPhenomenaModal(content) {
        const modal = document.getElementById('weatherPhenomenaModalBackdrop');
        const contentElem = document.getElementById('weatherPhenomenaContent');
        contentElem.innerHTML = content;
        modal.classList.add('show');
    }

    function hideWeatherPhenomenaModal() {
        const modal = document.getElementById('weatherPhenomenaModalBackdrop');
        modal.classList.remove('show');
    }

    document.getElementById('closeWeatherPhenomenaModalBtn').addEventListener('click', hideWeatherPhenomenaModal);

    document.addEventListener('click', (e) => {
        const modal = document.getElementById('weatherPhenomenaModalBackdrop');
        if (e.target === modal) hideWeatherPhenomenaModal();
    });

    // Обработчик клика по элементам погодных явлений
    document.addEventListener('click', (e) => {
        const target = e.target.closest('.weather-phenomena-token');
        if (target) {
            const token = target.dataset.token;
            const prefix = target.dataset.prefix;
            const descriptor = target.dataset.descriptor;
            const phenomena = target.dataset.phenomena;
            
            let content = `<div class="airport-details-modal-info">`;
            content += `<p><b>Группа:</b> <span class="code">${token}</span></p>`;
            content += decodeWeatherPhenomena(prefix, descriptor, phenomena);
            content += `</div>`;
            
            showWeatherPhenomenaModal(content);
        }
    });

    // Вспомогательная функция, которая ищет «противоположную» ВПП в airportInfoDb
    function findOppositeRunway(icao, currentRwyName) {
        const airport = airportInfoDb[icao];
        if (!airport || !airport.runways || !airport.runways[currentRwyName]) {
            return currentRwyName; // fallback
        }

        // Курс текущей полосы
        const currentHdg = airport.runways[currentRwyName].hdg;
        // "Целевой" курс = текуший + 180 (по модулю 360)
        const targetHdg = (currentHdg + 180) % 360;

        let bestName = currentRwyName;
        let minDiff = 999;

        for (const [rwyName, rwyData] of Object.entries(airport.runways)) {
            if (rwyName === currentRwyName) continue;
            const diffRaw = Math.abs(rwyData.hdg - targetHdg) % 360;
            const diff = diffRaw > 180 ? 360 - diffRaw : diffRaw;
            if (diff < minDiff) {
                minDiff = diff;
                bestName = rwyName;
            }
        }
        return bestName;
    }

    // Функция для определения, какая ВПП (heading или headingOpp) ближе к направлению ветра
    function closestRunway(windDirInt, heading, headingOpp) {
        function angularDifference(a, b) {
            const diff = Math.abs(a - b) % 360;
            return diff > 180 ? 360 - diff : diff;
        }
        const diffHeading = angularDifference(windDirInt, heading);
        const diffHeadingOpp = angularDifference(windDirInt, headingOpp);
        return diffHeading <= diffHeadingOpp ? heading : headingOpp;
    }

    function trueToMag(trueDirStr, declinationDeg) {
        let trueDirDeg = parseInt(trueDirStr, 10);

        // Если направление не определено (000) — вернём как есть
        if (trueDirDeg === 0 && trueDirStr === "000") return "000";

        // Перевод в магнитное направление
        let mag = (trueDirDeg - declinationDeg) % 360;
        if (mag < 0) mag += 360;

        // Округление вверх до ближайших 10°
        let rounded = Math.ceil(mag / 10) * 10;
        if (rounded === 360) rounded = 0; // 360° → 000°

        // Возвращаем с ведущими нулями
        return String(rounded).padStart(3, "0");
    }

    // Обработчик клика по .wind-info
    document.addEventListener('click', (e) => {
        const windTarget = e.target.closest('.wind-info');
        if (!windTarget) return;

        // Данные из data-атрибутов
        const dirStr = windTarget.dataset.dir; // например "120" или "VRB"
        const speedStr = windTarget.dataset.speed; // например "06"
        const gustStr = windTarget.dataset.gust; // например "G12" или ""
        const unit = windTarget.dataset.unit; // "MPS" или "KT"

        // Верхняя часть (просто текст)
        let content = "";
        if (gustStr) {
            content += `Ветер: ${dirStr}° ${parseInt(speedStr)} ${unit} (<i class="fa-solid fa-wind"></i> ${parseInt(gustStr.replace('G',''))} ${unit})<br><br>`;
        } else {
            content += `Ветер: ${dirStr}° ${parseInt(speedStr)} ${unit}<br><br>`;
        }

        // Если не знаем текущий ICAO или нет runways, выходим
        if (!nowIcao || !airportInfoDb[nowIcao] || !airportInfoDb[nowIcao].runways) {
            content += "Нет данных о ВПП для " + nowIcao;
            showWindInfoModal(content);
            return;
        }

        // Склонение (если в JSON его нет, берём 0)
        const declination = airportInfoDb[nowIcao].declination || 0;

        // Превращаем строки в числа
        let windDirTrue = (dirStr === 'VRB') ? null : parseInt(dirStr, 10);
        let windSpeed = parseFloat(speedStr);
        let windGust = gustStr ? parseFloat(gustStr.slice(1)) : null;

        // Если ветер VRB — можно вывести что-то одно
        if (windDirTrue === null) {
            content += `Ветер переменный (VRB).`;
            showWindInfoModal(content);
            return;
        }

        // Переводим истинное направление ветра в магнитное
        function normalize(angle) {
            let a = angle % 360;
            return (a < 0) ? a + 360 : a;
        }
        const windDirMag = normalize(windDirTrue - declination);

        // Функции для расчёта
        function calcCrosswind(magHdgRW, spd) {
            let rad = (windDirMag - magHdgRW) * Math.PI / 180;
            return spd * Math.sin(rad);
        }

        function calcHeadwind(magHdgRW, spd) {
            let rad = (windDirMag - magHdgRW) * Math.PI / 180;
            return spd * Math.cos(rad);
        }

        const state = {
            nowIcao: nowIcao,
            worstRunwayFrictionCode: null,
            runwayFrictionMap: {}
        };

        // Перебираем все ВПП
        let windCardsHtml = "";
        const runwaysObj = airportInfoDb[state.nowIcao].runways;
        const worstCond = getWorstRunwayCondition(state);

        let shownSet = new Set();
        for (const [rwyName, rwyData] of Object.entries(runwaysObj)) {
            const hdgMag = rwyData.hdg;
            const oppName = findOppositeRunway(state.nowIcao, rwyName);
            const oppHdgMag = runwaysObj[oppName]?.hdg || hdgMag;

            const chosenHdg = closestRunway(windDirMag, hdgMag, oppHdgMag);
            const chosenName = (chosenHdg === hdgMag) ? rwyName : oppName;

            if (shownSet.has(chosenName)) continue;
            shownSet.add(chosenName);

            const xwMain = calcCrosswind(chosenHdg, windSpeed);
            const hwMain = calcHeadwind(chosenHdg, windSpeed);
            const xwGust = windGust ? calcCrosswind(chosenHdg, windGust) : 0;
            const hwGust = windGust ? calcHeadwind(chosenHdg, windGust) : 0;
            const xwMainAbs = Math.abs(xwMain);
            const xwGustAbs = Math.abs(xwGust);

            let takeoffMax, landingMax;
            if (worstCond.kind === 'reported') {
                const cat = worstCond.category;
                takeoffMax = reportedBrakingActions.takeoff[cat] || reportedBrakingActions.takeoff.good;
                landingMax = reportedBrakingActions.landing[cat] || reportedBrakingActions.landing.good;
            } else {
                const friction = worstCond.frictionValue;
                const relevant = worstCond.relevantData;
                let toObj = { ...relevant.takeoff, currentFriction: friction };
                let ldObj = { ...relevant.landing, currentFriction: friction };
                takeoffMax = getCrosswindLimit('takeoff', toObj, reportedBrakingActions.takeoff.good);
                landingMax = getCrosswindLimit('landing', ldObj, reportedBrakingActions.landing.good);
            }

            const toLimit = (unit === 'MPS') ? takeoffMax.mps : takeoffMax.kts;
            const ldLimit = (unit === 'MPS') ? landingMax.mps : landingMax.kts;

            const ratioSteady = (xwMainAbs / ldLimit) * 100;
            const ratioGust = windGust ? (xwGustAbs / ldLimit) * 100 : 0;

            function pickColor(ratio) {
                if (ratio < 40) return 'color-green';
                if (ratio >= 40 && ratio < 70) return 'color-yellow';
                if (ratio >= 70 && ratio < 90) return 'color-red';
                if (ratio >= 90) return 'color-purple';
                return '';
            }

            const steadyClass = pickColor(ratioSteady);
            const gustClass = windGust ? pickColor(ratioGust) : '';

            const frictionCode = state.runwayFrictionMap[chosenName] ?? null;
            let frictionText = '—';
            if (typeof frictionCode === 'number') {
                if (frictionCode >= 91 && frictionCode <= 95) {
                    const frictionMap = { 91: 'poor', 92: 'poor/med', 93: 'medium', 94: 'med/good', 95: 'good' };
                    frictionText = frictionMap[frictionCode] || '???';
                } else {
                    frictionText = (frictionCode / 100).toFixed(2);
                }
            }

            const rwyLength = runwaysObj[chosenName].xlda;

            windCardsHtml += `
                <div class="wind-rwy-card">
                    <div class="wind-rwy-header">
                        <span class="wind-rwy-id">ВПП ${chosenName}</span>
                        <span class="wind-rwy-hdg">${formatNumber(chosenHdg)}°</span>
                    </div>
                    <div class="wind-rwy-info">
                        <span><i class="fa-solid fa-ruler"></i> ${rwyLength}м</span>
                        <span><i class="fa-solid fa-gauge-simple-high"></i> ${frictionText}</span>
                    </div>
                    <div class="wind-rwy-values">
                        <div class="wind-val-item">
                            <span class="val-label">HW</span>
                            <span class="val-text">${hwMain.toFixed(0)}${unit} ${windGust ? `(<i class="fa-solid fa-wind"></i>${hwGust.toFixed(0)})` : ''}</span>
                        </div>
                        <div class="wind-val-item">
                            <span class="val-label">XW</span>
                            <span class="val-text ${steadyClass}">${xwMainAbs.toFixed(1)}${unit} ${windGust ? `(<span class="${gustClass}"><i class="fa-solid fa-wind"></i>${xwGustAbs.toFixed(1)}</span>)` : ''}</span>
                        </div>
                    </div>
                    <div class="wind-rwy-limits">Limit T/O: ${toLimit}${unit} | LDG: ${ldLimit}${unit}</div>
                </div>
            `;
        }

        content = `
            <div class="wind-info-header">
                <div class="wind-main-text">
                    <i class="fa-solid fa-wind"></i> ${dirStr}° / ${parseInt(speedStr)}${unit} ${gustStr ? `<span class="wind-gust">(G ${parseInt(gustStr.replace('G',''))})</span>` : ''}
                </div>
            </div>
            <div class="wind-cards-container">
                ${windCardsHtml}
            </div>
        `;

        if (worstCond.kind === 'reported') {
            content += `<div class="wind-info-footer"><b>Общее состояние:</b> ${worstCond.category.toUpperCase()}</div>`;
        } else {
            content += `<div class="wind-info-footer"><b>Общий коэф сцеп:</b> ${worstCond.frictionValue.toFixed(2)} (${isRussianAirport(nowIcao) ? 'нормативный' : 'измеренный'})</div>`;
        }

        if (declination) {
            const magWind = trueToMag(dirStr, declination);
            let unitsOpt = unit === 'MPS' ? 'M' : '';
            content += `<div class="wind-info-footer opt"><b>Ветер для OPT:</b> <span class="code">${magWind}/${parseInt(speedStr)}${unitsOpt}</span></div>`;
        }

        showWindInfoModal(content);
    });

    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModalBackdrop = document.getElementById('settingsModalBackdrop');
    const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');

    settingsBtn.addEventListener('click', () => {
        updateExportButtonState();
        settingsModalBackdrop.classList.add('show');
    });

    closeSettingsModalBtn.addEventListener('click', () => {
        settingsModalBackdrop.classList.remove('show');
    });

    // Закрытие модального окна при клике вне его области (необязательно)
    settingsModalBackdrop.addEventListener('click', (e) => {
        if (e.target === settingsModalBackdrop) {
            settingsModalBackdrop.classList.remove('show');
        }
    });

    // Получаем ссылку на кнопку toggling offline режима
    const offlineToggleBtn = document.getElementById('offlineToggleBtn');

    // Функция для обновления внешнего вида кнопки в зависимости от состояния
    function updateOfflineButton() {
        const reloadBtn = document.getElementById('reloadBtn');
        if (offlineMode) {
            offlineToggleBtn.classList.add('offline');
            offlineToggleBtn.classList.remove('online');
            offlineToggleBtn.innerHTML = '<i class="fa-solid fa-plane"></i>';
            document.getElementById('refreshAllBtn').disabled = true;
            document.getElementById('loadGamcUidBtn').disabled = true;
            document.getElementById('exportGamcUidBtn').disabled = true;
            if (reloadBtn) reloadBtn.style.display = 'none';
        } else {
            offlineToggleBtn.classList.add('online');
            offlineToggleBtn.classList.remove('offline');
            offlineToggleBtn.innerHTML = '<i class="fa-solid fa-signal"></i>';
            document.getElementById('refreshAllBtn').disabled = false;
            document.getElementById('loadGamcUidBtn').disabled = false;
            document.getElementById('exportGamcUidBtn').disabled = false;
            if (reloadBtn) reloadBtn.style.display = 'flex';
        }
    }

    // Первоначальное обновление кнопки при загрузке
    updateOfflineButton();

    // Обработчик клика по кнопке для переключения режима
    offlineToggleBtn.addEventListener('click', () => {
        offlineMode = !offlineMode;
        localStorage.setItem('offlineMode', JSON.stringify(offlineMode));
        updateOfflineButton();
        updateSystemsButton();
    });

    const reloadBtn = document.getElementById('reloadBtn');
    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
            if (!offlineMode) {
                window.location.reload();
            }
        });
    }

    function updateSystemsButton(forceDisable=false) {
        if (forceDisable) {
            systemsInfoBtn.disabled = true;
        } else {
            systemsInfoBtn.disabled = !(nowIcao && nowIcao.length === 4);
        }
    }

    function checkInternetConnection() {
        if (!navigator.onLine && !offlineMode && autoGoOffline) {
            offlineMode = true;
            localStorage.setItem('offlineMode', JSON.stringify(offlineMode));
            updateOfflineButton();
        }
    }

    // Проверять соединение каждые 15 секунд
    setInterval(checkInternetConnection, 15000);
    // Выполнить первую проверку сразу при запуске
    checkInternetConnection();

    // Найти чекбокс
    const autoOfflineCheckbox = document.getElementById('autoOfflineCheckbox');
    const doHighlightCheckbox = document.getElementById('doHighlightCheckbox');
    const showAirportInfoCheckbox = document.getElementById('showAirportInfoCheckbox');
    const doMarkBagdeCheckbox = document.getElementById('doMarkBagdeCheckbox');

    // Установить состояние чекбокса при загрузке
    autoOfflineCheckbox.checked = autoGoOffline; // Установить состояние
    doHighlightCheckbox.checked = doHighlight; // Установить состояние
    doMarkBagdeCheckbox.checked = doMarkBagde;
    showAirportInfoCheckbox.checked = canShowAirportInfo;

    // Обработчик изменения чекбокса
    autoOfflineCheckbox.addEventListener('change', () => {
        autoGoOffline = autoOfflineCheckbox.checked; // Обновить переменную
        localStorage.setItem('autoGoOffline', JSON.stringify(autoGoOffline)); // Сохранить в localStorage
    });

    // Обработчик изменения чекбокса
    doHighlightCheckbox.addEventListener('change', () => {
        doHighlight = doHighlightCheckbox.checked; // Обновить переменную
        localStorage.setItem('doHighlight', JSON.stringify(doHighlight)); // Сохранить в localStorage
    });

    doMarkBagdeCheckbox.addEventListener('change', () => {
        doMarkBagde = doMarkBagdeCheckbox.checked; // Обновить переменную
        localStorage.setItem('doMarkBagde', JSON.stringify(doMarkBagde)); // Сохранить в localStorage
        renderSelectedRoute();
    });

    showAirportInfoCheckbox.addEventListener('change', () => {
        canShowAirportInfo = showAirportInfoCheckbox.checked; // Обновить переменную
        localStorage.setItem('canShowAirportInfo', JSON.stringify(canShowAirportInfo)); // Сохранить в localStorage
    });

    function showAddRouteModal() {
        addRouteModalBackdrop.classList.add('show');
    }

    function hideAddRouteModal() {
        addRouteModalBackdrop.classList.remove('show');
        // Включить поля назад:
        departureIcaoInput.disabled = false;
        arrivalIcaoInput.disabled = false;
        deleteRouteBtn.style.display = 'none';

        // Сбросить флаги:
        isEditingRoute = false;
        editRouteIndex = null;

        document.getElementById('departureIcao').value = '';
        document.getElementById('arrivalIcao').value = '';
        document.getElementById('alternatesIcao').value = '';
    }
    closeAddRouteModalBtn.addEventListener('click', hideAddRouteModal);

    saveRouteBtn.addEventListener('click', () => {
        const dep = departureIcaoInput.value.trim().toUpperCase();
        const arr = arrivalIcaoInput.value.trim().toUpperCase();

        if (dep.length !== 4 || arr.length !== 4) {
            alert('Вылет и Назначение должны содержать по 4 латинских буквы!');
            return;
        }

        const alts = alternatesIcaoInput.value.trim().toUpperCase();
        let alternatesList = alts ? alts.split(/\s+/) : [];
        // Убираем повторение из alternatesList.
        alternatesList = [...new Set(alternatesList)];
        alternatesList = alternatesList.slice(0, LAST_COUNT).filter(a => a.length === 4);

        // Ограничим максимум LAST_COUNT
        alternatesList = alternatesList.slice(0, LAST_COUNT).filter(a => a.length === 4);

        if (airportInfoDb[dep]) {
            const depLat = parseFloat(airportInfoDb[dep].latitude);
            const depLon = parseFloat(airportInfoDb[dep].longitude);
            alternatesList.sort((a, b) => {
                if (!airportInfoDb[a] || !airportInfoDb[b]) return 0;
                const distA = computeDistance(depLat, depLon, parseFloat(airportInfoDb[a].latitude), parseFloat(airportInfoDb[a].longitude));
                const distB = computeDistance(depLat, depLon, parseFloat(airportInfoDb[b].latitude), parseFloat(airportInfoDb[b].longitude));
                return distA - distB;
            });
        }

        if (routeSelect.value === 'temp') {
            const newRoute = {
                departure: dep,
                arrival: arr,
                alternates: alternatesList,
                coords: importedRouteCoords
            };

            // Сохраняем временный маршрут в localStorage
            localStorage.setItem('tempRoute', JSON.stringify(newRoute));

            hideAddRouteModal();
            // Перерисовываем список маршрутов и оставляем выбранным "Временный"
            renderRoutesInSelect();
            routeSelect.value = 'temp';
            renderSelectedRoute();
            return;
        }

        if (isEditingRoute) {

            savedRoutes[editRouteIndex].alternates = alternatesList;

            localStorage.setItem(ROUTES_KEY, JSON.stringify(savedRoutes));

            // Возвращаем поля в обычное состояние:
            departureIcaoInput.disabled = false;
            arrivalIcaoInput.disabled = false;

            // Сохраняем индекс редактируемого маршрута
            const editedIndex = editRouteIndex;

            // Сбрасываем флаги редактирования
            isEditingRoute = false;
            editRouteIndex = null;

            // Закрываем модалку
            hideAddRouteModal();

            // Обновляем select, оставляя выбранным редактируемый маршрут
            renderRoutesInSelect(editedIndex);

            // Обновляем отображение плашек в истории
            routeSelect.dispatchEvent(new Event('change'));

            return;
        }

        // Формируем объект нового маршрута
        const newRoute = {
            departure: dep,
            arrival: arr,
            alternates: alternatesList
        };

        // Добавляем в массив savedRoutes
        savedRoutes.push(newRoute);

        // Сохраняем в localStorage
        localStorage.setItem(ROUTES_KEY, JSON.stringify(savedRoutes));

        // Обновим выпадающий список
        renderRoutesInSelect();

        // Закроем модалку
        hideAddRouteModal();

        // Очистим поля
        departureIcaoInput.value = '';
        arrivalIcaoInput.value = '';
        alternatesIcaoInput.value = '';
    });

    const deleteRouteBtn = document.getElementById('deleteRouteBtn');
    deleteRouteBtn.addEventListener('click', () => {
        if (!isEditingRoute) {
            return;
        }

        hideAddRouteModal();

        showConfirmModal(
            'Удаление маршрута',
            'Точно удалить этот маршрут?',
            () => {
                // <-- это будет наш onYes коллбэк

                const currentRouteIndex = routeSelect.value;
                savedRoutes.splice(currentRouteIndex, 1);

                localStorage.setItem(ROUTES_KEY, JSON.stringify(savedRoutes));

                isEditingRoute = false;
                editRouteIndex = null;
                hideAddRouteModal();
                renderRoutesInSelect();
                renderHistory();
            },
            'var(--badge-red-bg)', // onYesBgColor
            '' // onNoBgColor (можно оставить пустым)
        );
    });

    function renderRoutesInSelect(selectedValue = 'recent') {
        // Очистим все <option> сначала
        routeSelect.innerHTML = '';

        // 1) «Недавние»
        let recentOption = document.createElement('option');
        document.getElementById('editRouteBtn').innerHTML = '<i class="fa-solid fa-plus"></i>';
        recentOption.value = 'recent';
        recentOption.innerHTML = 'Недавние';
        routeSelect.appendChild(recentOption);

        // 2) Для каждого сохранённого маршрута
        savedRoutes.forEach((route, index) => {
            const option = document.createElement('option');
            const dep = route.departure;
            const arr = route.arrival;
            // Иконка для маршрутов, например "fa-route" = "\f4d7" (или что угодно)
            // Или можно использовать самолёт: "\f5b0" = fa-plane
            option.value = index;
            option.innerHTML = dep + ' - ' + arr;
            routeSelect.appendChild(option);
        });

        // 3) Пункт «Добавить маршрут»
        // Иконка "fa-plus" = "\f067"
        let addOption = document.createElement('option');
        addOption.value = 'add';
        addOption.innerHTML = 'Добавить маршрут...';
        routeSelect.appendChild(addOption);

        routeSelect.value = selectedValue;
        // Если вдруг такого значения нет (например, маршрут удалён), сбрасываем на 'recent'
        if (routeSelect.value !== selectedValue && selectedValue !== 'recent') {
            routeSelect.value = 'recent';
        }

        // Обновляем иконку кнопки редактирования
        if (routeSelect.value === 'recent' || routeSelect.value === 'add') {
             document.getElementById('editRouteBtn').innerHTML = '<i class="fa-solid fa-plus"></i>';
        } else {
             document.getElementById('editRouteBtn').innerHTML = '<i class="fa-solid fa-pen"></i>';
        }

        // Синхронизируем кастомный селект
        updateRouteSelectLabel();
    }
    renderRoutesInSelect(localStorage.getItem('selectedRouteValue') || 'recent');
    renderSelectedRoute();

    function renderSelectedRoute() {
        const selectedValue = routeSelect.value;
        const editBtn = document.getElementById('editRouteBtn');
        const reverseBtn = document.getElementById('reverseRouteBtn');

        // Сохраняем выбор (кроме 'add', так как он временный)
        if (selectedValue !== 'add') {
            localStorage.setItem('selectedRouteValue', selectedValue);
        }

        if (selectedValue === 'recent') {
            // Показываем "Недавние"
            renderHistory();
            editBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
            reverseBtn.hidden = true;
            return;
        }

        if (selectedValue === 'add') {
            // Показываем модалку
            showAddRouteModal();
            editBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
            reverseBtn.hidden = true;
            routeSelect.value = 'recent';
            return;
        }

        // Иначе это индекс маршрута
        const routeIndex = parseInt(selectedValue, 10);
        const route = savedRoutes[routeIndex];
        if (!route) return;

        // Собираем массив [departure, arrival, ...alternates]
        const routeAerodromes = [route.departure, ...route.alternates, route.arrival];

        // Рендерим их в #historyContainer
        renderRouteAerodromes(routeAerodromes);

        editBtn.innerHTML = (routeSelect.value === 'recent' || routeSelect.value === 'add') ? '<i class="fa-solid fa-plus"></i>' : '<i class="fa-solid fa-pen"></i>';
        reverseBtn.hidden = (routeSelect.value === 'recent' || routeSelect.value === 'add');
    }

    routeSelect.addEventListener('change', renderSelectedRoute);

    const aircraftSelect = document.getElementById('aircraftTypeSelect');
    const atisLangSelect = document.getElementById('atisLangSelect');

    // Добавим в обработчик загрузки страницы
    function updateAircraftTypeBadge() {
        const aircraftTypeShortMap = {
            "B737": "B737",
            "A320N,A321N": "A320N / A321N",
            "A320,A320S,A321,A321S": "A320 / A321",
            "B777": "B777",
            "A330": "A330",
            "A350": "A350"
        };
        const selectedTypeText = aircraftTypeShortMap[getAircraftType()] || '-';
        const badge = document.getElementById('selectedAircraftType');
        if (!badge) return;
        if (badge) badge.textContent = selectedTypeText;
    }

    updateAircraftTypeBadge();

    // Обновим обработчик изменения селекта
    aircraftSelect.addEventListener('change', function() {
        localStorage.setItem('aircraftType', this.value);
        updateMaintenanceBadge();
        updateAircraftTypeBadge();
        renderSelectedRoute();
    });

    // Обновим обработчик изменения селекта
    atisLangSelect.addEventListener('change', function() {
        localStorage.setItem('atisLangSelect', this.value);
        updateMaintenanceBadge();
        updateAircraftTypeBadge();
        renderSelectedRoute();
    });

    function renderRouteAerodromes(aerodromes) {
        // Обновим лейбл, так как маршрут мог быть перевернут или изменен
        updateRouteSelectLabel();
        
        historyContainer.innerHTML = '';
        if (aerodromes.length === 0) return;

        // Рендерим первый аэродром с иконкой взлёта
        const firstBtn = document.createElement('button');
        firstBtn.innerHTML = '<i class="fa-solid fa-plane-departure"></i> ' + aerodromes[0];
        firstBtn.addEventListener('click', () => {
            document.getElementById('icao').value = aerodromes[0];
            getWeather(aerodromes[0], false);
            updateFetchBtn();
            updateSelectedPlacard();
        });
        applyIcaoButtonColors(aerodromes[0], firstBtn);
        historyContainer.appendChild(firstBtn);

        // Если аэродромов больше одного, вставляем разделитель после первого
        if (aerodromes.length > 1) {
            const sep1 = document.createElement('div');
            sep1.className = 'aerodrome-separator';
            historyContainer.appendChild(sep1);
        }

        // Если аэродромов больше двух, рендерим средние аэродромы (без иконок)
        if (aerodromes.length > 2) {
            for (let i = 1; i < aerodromes.length - 1; i++) {
                const btn = document.createElement('button');
                btn.textContent = aerodromes[i];
                btn.addEventListener('click', () => {
                    document.getElementById('icao').value = aerodromes[i];
                    getWeather(aerodromes[i], false);
                    updateFetchBtn();
                    updateSelectedPlacard();
                });
                applyIcaoButtonColors(aerodromes[i], btn);
                historyContainer.appendChild(btn);
            }
        }

        // Если аэродромов больше одного, вставляем разделитель перед последним
        if (aerodromes.length > 1) {
            const sep2 = document.createElement('div');
            sep2.className = 'aerodrome-separator';
            historyContainer.appendChild(sep2);

            // Рендерим последний аэродром с иконкой посадки
            const lastBtn = document.createElement('button');
            lastBtn.innerHTML = '<i class="fa-solid fa-plane-arrival"></i> ' + aerodromes[aerodromes.length - 1];
            lastBtn.addEventListener('click', () => {
                document.getElementById('icao').value = aerodromes[aerodromes.length - 1];
                getWeather(aerodromes[aerodromes.length - 1], false);
                updateFetchBtn();
                updateSelectedPlacard();
            });
            applyIcaoButtonColors(aerodromes[aerodromes.length - 1], lastBtn);
            historyContainer.appendChild(lastBtn);
        }

        updateSelectedPlacard();
    }

    function updateBadgesTimeAndColors() {
        // 1) Обновляем время UTC
        const utcBadge = document.getElementById('utcBadge');
        if (utcBadge) {
            const nowUTC = new Date();
            const hhUTC = String(nowUTC.getUTCHours()).padStart(2, '0');
            const mmUTC = String(nowUTC.getUTCMinutes()).padStart(2, '0');
            
            const valSpan = utcBadge.querySelector('.badge-value');
            if (valSpan) {
                // Если сейчас НЕ показывается Local Time, обновляем
                if (valSpan.textContent.startsWith('UTC')) {
                    valSpan.textContent = `UTC ${hhUTC}:${mmUTC}`;
                }
            }
        }

        // 2) Находим все .time-badge (которые у нас METAR/TAF) и пересчитываем разницу
        const badges = document.querySelectorAll('.time-badge');
        badges.forEach(badge => {
            // Пропускаем плашку UTC, плашку обновления и другие сервисные
            if (badge.id === 'utcBadge' || badge.id === 'airportUpdateBadge' || badge.id === 'airportClassBadge' || 
                badge.id === 'showMaintenanceInfoModal' || badge.id === 'atisFrqBtn' || 
                badge.id === 'offlineWarningBadge' || badge.id === 'offlineWarningNoInfoBadge') return;

            const msgDateStr = badge.dataset.msgDate;
            if (!msgDateStr) return;

            const msgDate = new Date(msgDateStr);
            const now = new Date();
            const diffMin = Math.floor((now - msgDate) / 60000);
            const diffAbs = Math.abs(diffMin);

            // Пересчитываем agoText
            let newAgo = formatTimeAgoRussian(diffMin);
            badge.dataset.agoText = newAgo;

            // Если сейчас на плашке отображается "назад", обновим текст в реальном времени
            const valSpan = badge.querySelector('.badge-value');
            if (valSpan && (valSpan.textContent.includes('назад') || valSpan.textContent.includes('Только что'))) {
                valSpan.textContent = newAgo;
            }

            // Пересчитываем классы (цвета)
            const t = badge.dataset.type;
            const isMetarSpeci = (t === 'METAR' || t === 'SPECI');
            const isTaf = (t && t.startsWith('TAF'));

            badge.classList.remove('badge-green', 'badge-orange', 'badge-red', 'badge-default');

            if (diffAbs <= 10) {
                badge.classList.add('badge-green');
            } else if (isMetarSpeci && diffAbs >= 30) {
                if (diffAbs >= 180) {
                    badge.classList.add('badge-red');
                } else {
                    badge.classList.add('badge-orange');
                }
            } else if (isTaf && diffAbs <= 60) {
                badge.classList.add('badge-green');
            } else if (isTaf && diffAbs >= 360) {
                if (diffAbs >= 18 * 60) {
                    badge.classList.add('badge-red');
                } else {
                    badge.classList.add('badge-orange');
                }
            } else {
                badge.classList.add('badge-default');
            }
        });

        // 3) Обновляем время обновления текущего аэродрома
        const updateBadge = document.getElementById('airportUpdateBadge');
        if (updateBadge && nowIcao) {
            const colObj = icaoColors[nowIcao];
            if (colObj && colObj.updatedAt) {
                const updatedTime = new Date(colObj.updatedAt).getTime();
                const nowTime = Date.now();
                const diffMin = Math.floor((nowTime - updatedTime) / 60000);

                let timeStr = formatTimeAgoRussian(diffMin);
                const valSpan = updateBadge.querySelector('.badge-value');
                if (valSpan) {
                    valSpan.textContent = timeStr;
                }
            }
        }
    }

    function hideAirportInfo() {
        const container = document.getElementById('airportInfoContainer');
        container.style.display = 'none';
    }

    function showAirportInfo(icao) {
        if (!canShowAirportInfo) return;

        const container = document.getElementById('airportInfoContainer');
        const nameElem = document.getElementById('airportName');
        const countryElem = document.getElementById('airportCountry');
        const elevationLength = document.getElementById('airportRunwayLength');
        const codesElem = document.getElementById('airportCodes');

        if (!airportInfoDb[icao]) {
            container.style.display = 'none';
            return;
        }
        const {
            geo,
            iata,
            runways
        } = airportInfoDb[icao];

        const name = geo ? geo[0] : null;
        const country = geo ? geo[1] : null;

        nameElem.textContent = name ? name : `Аэродром ${icao}`;
        countryElem.textContent = country ? country : 'Страна не указана';

        let maxLength = 0;
        let maxLengthRunway = '';
        for (const runwayKey in runways) {
            const runway = runways[runwayKey];
            if (runway.xlda && runway.xlda > maxLength) {
                maxLength = runway.xlda;
                maxLengthRunway = runwayKey;
            }
        }
        elevationLength.textContent = `RW ${maxLengthRunway}: ${maxLength} м`;

        if (iata) {
            codesElem.textContent = `${icao}/${iata}`;
        } else {
            codesElem.textContent = icao;
        }

        container.style.display = 'flex';
    }


    document.getElementById('exportGamcUidBtn').addEventListener('click', () => {
        const currentUid = localStorage.getItem('gamcUid') || '';
        const title = 'Выгрузка информации';
        const message = `Вы уверены, что хотите выгрузить всю информацию на сервер?\n\nЕсли на сервере есть более актуальные данные, они будут перезаписаны.\n\nВаш GAMCUID: ${currentUid}`;

        // Вызываем наше стандартное окно подтверждения:
        showConfirmModal(
            title,
            message,
            () => {
                doUpload();
            },
            'var(--badge-orange-bg)' // Можно поставить любой цвет для "Да"
        );
    });

    document.getElementById('loadGamcUidBtn').addEventListener('click', () => {
        const currentUid = localStorage.getItem('gamcUid') || '';
        const title = 'Загрузка информации';
        const message = `Вы уверены, что хотите загрузить данные с сервера?\n\nЕсли на вашем устройстве есть более актуальные данные, они будут заменены.\n\nВаш GAMCUID: ${currentUid}`;

        showConfirmModal(
            title,
            message,
            () => {
                doDownload();
            },
            'var(--badge-orange-bg)'
        );
    });

    function showResultModal(title, message) {
        const backdrop = document.getElementById('resultModalBackdrop');
        const titleEl = document.getElementById('resultModalTitle');
        const msgEl = document.getElementById('resultModalMessage');

        titleEl.textContent = title;
        msgEl.textContent = message; // или .innerHTML = ... если хотим HTML

        backdrop.classList.add('show');
    }

    function hideResultModal() {
        const backdrop = document.getElementById('resultModalBackdrop');
        backdrop.classList.remove('show');
    }

    // Событие закрытия (по кнопке)
    document.getElementById('closeResultModalBtn').addEventListener('click', hideResultModal);
    document.getElementById('resultOkBtn').addEventListener('click', hideResultModal);

    // Дополнительно, если хотите закрывать по клику вне модалки
    document.getElementById('resultModalBackdrop').addEventListener('click', (e) => {
        if (e.target.id === 'resultModalBackdrop') {
            hideResultModal();
        }
    });

    async function doUpload() {
        // 1) Формируем тело запроса для отправки
        const password = localStorage.getItem('gamcPassword') || '';
        const gamcUid = localStorage.getItem('gamcUid') || '';

        // Собираем нужные ключи localStorage
        const icaoData = localStorage.getItem('icaoData') || '{}';
        const icaoHistory = localStorage.getItem('icaoHistory') || '[]';
        const savedRoutes = localStorage.getItem('savedRoutes') || '[]';
        const icaoColors = localStorage.getItem('icaoColors') || '{}';
        const landingSystems = localStorage.getItem('landingSystems') || '{}';
        const aircraftType = localStorage.getItem('aircraftType') || 'B737';
        const atisFrequencies = localStorage.getItem('atisFrequencies') || '{}';
        const tempRoute = localStorage.getItem('tempRoute') || '{}';

        const payload = {
            action: 'upload',
            password: password,
            gamcUid: gamcUid,
            icaoData: icaoData,
            icaoHistory: icaoHistory,
            savedRoutes: savedRoutes,
            icaoColors: icaoColors,
            landingSystems: landingSystems,
            aircraftType: aircraftType,
            atisFrequencies: atisFrequencies,
            tempRoute: tempRoute
        };

        // 2) Делаем POST-запрос к вашему `api.php`
        try {
            const resp = await fetch('https://myapihelper.na4u.ru/gamc_app/api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const text = await resp.text(); // Ответ в текстовом формате
            // 3) Если всё ОК, показываем окно с результатом
            showResultModal('Выгрузка завершена', text);
        } catch (err) {
            console.error('Ошибка при выгрузке:', err);
            showResultModal('Ошибка при выгрузке', String(err));
        }
        markNowDataAsSynced();
    }

    async function doDownload() {
        // 1) Формируем GET-параметры
        const password = localStorage.getItem('gamcPassword') || '';
        const gamcUid = localStorage.getItem('gamcUid') || '';

        const payload = {
            action: 'download',
            password: password,
            gamcUid: gamcUid
        };

        // 2) Делаем запрос
        try {
            const resp = await fetch('https://myapihelper.na4u.ru/gamc_app/api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!resp.ok) {
                let text = await resp.text();
                throw new Error(text || resp.statusText);
            }
            const serverData = await resp.json(); // ожидаем JSON

            // 3) serverData = { icaoData, icaoHistory, savedRoutes, icaoColors, ... }
            if (serverData.icaoData) {
                localStorage.setItem('icaoData', serverData.icaoData);
            }
            if (serverData.icaoHistory) {
                localStorage.setItem('icaoHistory', serverData.icaoHistory);
            }
            if (serverData.savedRoutes) {
                localStorage.setItem('savedRoutes', serverData.savedRoutes);
            }
            if (serverData.icaoColors) {
                localStorage.setItem('icaoColors', serverData.icaoColors);
            }
            if (serverData.landingSystems) {
                localStorage.setItem('landingSystems', serverData.landingSystems);
            }
            if (serverData.aircraftType) {
                localStorage.setItem('aircraftType', serverData.aircraftType);
            }
            if (serverData.atisFrequencies) {
                localStorage.setItem('atisFrequencies', serverData.atisFrequencies);
            }
            if (serverData.tempRoute) {
                localStorage.setItem('tempRoute', serverData.tempRoute);
            }

            markNowDataAsSynced();

            showResultModal('Загрузка завершена', 'Данные с сервера приняты и сохранены в Local Storage.');

            // Через 2 секунды обновляем страницу.
            setTimeout(() => {
                location.reload();
            }, 2000);

        } catch (err) {
            console.error('Ошибка при загрузке:', err);
            showResultModal('Ошибка при загрузке', String(err));
        }
    }

    document.getElementById('icaoSuggestions').addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        const selectedIcao = li.dataset.icao;
        if (!selectedIcao) return;

        // Проставляем в input
        icaoInput.value = selectedIcao;
        updateFetchBtn();

        // Скрываем список
        const suggestionsContainer = document.getElementById('icaoSuggestions');
        suggestionsContainer.classList.remove('show');
        suggestionsContainer.innerHTML = '';
    });

    // Скрыть подсказки при клике вне инпута и самого списка
    document.addEventListener('click', (e) => {
        const suggestionsContainer = document.getElementById('icaoSuggestions');
        if (!suggestionsContainer.classList.contains('show')) return;

        const inputWrapper = document.querySelector('.icao-input-wrapper');
        if (!inputWrapper.contains(e.target)) {
            suggestionsContainer.classList.remove('show');
            suggestionsContainer.innerHTML = '';
        }
    });

    function updateSuggestionsForInput({
        inputElement,
        suggestionsElement,
        icaoKeys,
        limit = SUGGESTIONS_COUNT
    }) {
        const query = inputElement.value.trim().toUpperCase();
        // Если пустой ввод, скрываем список
        if (!query || !icaoKeys || icaoKeys.length === 0) {
            suggestionsElement.innerHTML = '';
            suggestionsElement.classList.remove('show');
            return;
        }
        // Фильтруем
        const matched = icaoKeys.filter(icao => icao.startsWith(query)).slice(0, limit);
        if (matched.length === 0) {
            suggestionsElement.innerHTML = '';
            suggestionsElement.classList.remove('show');
            return;
        }
        // Генерим HTML
        let html = '';
        matched.forEach(item => {
            html += `<li data-icao="${item}">${item}</li>`;
        });
        suggestionsElement.innerHTML = html;
        suggestionsElement.classList.add('show');
    }

    departureIcaoInput.addEventListener('input', () => {
        // Очищаем не-латинские символы
        departureIcaoInput.value = departureIcaoInput.value.replace(/[^A-Za-z]/g, '').toUpperCase();
        updateSuggestionsForInput({
            inputElement: departureIcaoInput,
            suggestionsElement: document.getElementById('depIcaoSuggestions'),
            icaoKeys
        });
    });

    arrivalIcaoInput.addEventListener('input', () => {
        arrivalIcaoInput.value = arrivalIcaoInput.value.replace(/[^A-Za-z]/g, '').toUpperCase();
        updateSuggestionsForInput({
            inputElement: arrivalIcaoInput,
            suggestionsElement: document.getElementById('arrIcaoSuggestions'),
            icaoKeys
        });
    });

    document.getElementById('depIcaoSuggestions').addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        const selectedIcao = li.dataset.icao;
        if (!selectedIcao) return;

        departureIcaoInput.value = selectedIcao;

        // Скрываем
        const ul = document.getElementById('depIcaoSuggestions');
        ul.classList.remove('show');
        ul.innerHTML = '';
    });

    document.getElementById('arrIcaoSuggestions').addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        const selectedIcao = li.dataset.icao;
        if (!selectedIcao) return;

        arrivalIcaoInput.value = selectedIcao;

        const ul = document.getElementById('arrIcaoSuggestions');
        ul.classList.remove('show');
        ul.innerHTML = '';
    });

    // И при клике в документе вне ul — скрывать:
    document.addEventListener('click', (e) => {
        let depUl = document.getElementById('depIcaoSuggestions');
        let arrUl = document.getElementById('arrIcaoSuggestions');

        // Если подсказки открыты, но клик вне зоны инпута + ul — скрываем
        if (depUl.classList.contains('show')) {
            const depWrapper = departureIcaoInput.parentNode; // или подходящий контейнер
            if (!depWrapper.contains(e.target)) {
                depUl.classList.remove('show');
                depUl.innerHTML = '';
            }
        }

        if (arrUl.classList.contains('show')) {
            const arrWrapper = arrivalIcaoInput.parentNode;
            if (!arrWrapper.contains(e.target)) {
                arrUl.classList.remove('show');
                arrUl.innerHTML = '';
            }
        }
    });

    function updateAlternatesSuggestions() {
        const inputEl = alternatesIcaoInput;
        const listEl = document.getElementById('altsIcaoSuggestions');

        const full = inputEl.value.trim().toUpperCase();
        // Если вообще пусто
        if (!full) {
            listEl.innerHTML = '';
            listEl.classList.remove('show');
            return;
        }
        // Разбиваем по пробелам
        const parts = full.split(/\s+/);
        // Последний кусок
        const lastPart = parts[parts.length - 1];

        if (!lastPart || !icaoKeys) {
            listEl.innerHTML = '';
            listEl.classList.remove('show');
            return;
        }

        // Фильтруем
        const matched = icaoKeys.filter(icao => icao.startsWith(lastPart)).slice(0, SUGGESTIONS_COUNT);

        if (matched.length === 0) {
            listEl.innerHTML = '';
            listEl.classList.remove('show');
            return;
        }

        let html = '';
        matched.forEach(item => {
            html += `<li data-icao="${item}">${item}</li>`;
        });
        listEl.innerHTML = html;
        listEl.classList.add('show');
    }

    document.getElementById('altsIcaoSuggestions').addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        const selected = li.dataset.icao; // например "UUEE"
        if (!selected) return;

        let full = alternatesIcaoInput.value.trim();
        // Разбиваем
        let parts = full.split(/\s+/);
        // Меняем последний кусочек
        parts[parts.length - 1] = selected;

        // Склеиваем обратно
        alternatesIcaoInput.value = parts.join(' ') + ' ';

        // Скрываем подсказки
        const ul = document.getElementById('altsIcaoSuggestions');
        ul.classList.remove('show');
        ul.innerHTML = '';
    });

    document.addEventListener('click', (e) => {
        const ul = document.getElementById('altsIcaoSuggestions');
        if (!ul.classList.contains('show')) return;

        // Проверяем, кликаем ли вне input + список
        const wrapper = alternatesIcaoInput.parentNode;
        if (!wrapper.contains(e.target)) {
            ul.classList.remove('show');
            ul.innerHTML = '';
        }
    });

    function validateRoute() {
        // Считываем и приводим к верхнему регистру
        const dep = departureIcaoInput.value.trim().toUpperCase();
        const arr = arrivalIcaoInput.value.trim().toUpperCase();
        const alts = alternatesIcaoInput.value.trim().toUpperCase();

        // Парсим запасные, убирая лишние пробелы
        const altList = alts ? alts.split(/\s+/) : [];

        // Проверяем вылет: 4 символа и есть в базе
        const depValid = (dep.length === 4 && icaoKeys.includes(dep));

        // Проверяем назначение: 4 символа и есть в базе
        const arrValid = (arr.length === 4 && icaoKeys.includes(arr));

        // Проверяем, что хотя бы 1 запасной
        // и каждый запасной 4 символа и есть в базе
        const altValid = (
            altList.length >= 1 &&
            altList.every(a => a.length === 4 && icaoKeys.includes(a))
        );

        // Если все условия выполнены => enable, иначе => disable
        saveRouteBtn.disabled = !(depValid && arrValid && altValid);
    }

    refreshAllBtn.addEventListener('click', onRefreshAllBtnClick);

    function onRefreshAllBtnClick() {
        if (offlineMode) {
            showOfflineAlert();
            return;
        }

        const isRecent = routeSelect.value === 'recent';
        let routeAerodromes = [];
        let allAerodromes = [];

        // Получаем аэродромы маршрута
        if (routeSelect.value === 'temp') {
            const tempRoute = JSON.parse(localStorage.getItem('tempRoute') || '{}');
            if (tempRoute.departure && tempRoute.arrival) {
                routeAerodromes = [tempRoute.departure, tempRoute.arrival, ...(tempRoute.alternates || [])];
            }
        } else if (!isRecent) {
            const idx = parseInt(routeSelect.value, 10);
            const route = savedRoutes[idx];
            if (route) {
                routeAerodromes = [route.departure, route.arrival, ...route.alternates];
            }
        }

        // Получаем вообще все аэродромы из сохраненных данных
        const savedData = JSON.parse(localStorage.getItem('icaoData') || '{}');
        allAerodromes = Object.keys(savedData);

        // Функция фильтрации
        const cleanList = (list) => list.filter(x => x && x.length === 4).filter((v, i, a) => a.indexOf(v) === i);

        routeAerodromes = cleanList(routeAerodromes);
        allAerodromes = cleanList(allAerodromes);

        if (allAerodromes.length === 0) {
            alert('Нет сохранённых аэродромов для обновления!');
            return;
        }

        const title = 'Обновление информации';
        
        if (isRecent) {
            const msg = `Обновить данные для всех сохраненных аэродромов (${allAerodromes.length})?`;
            showConfirmModal(title, msg, () => {
                startBatchRefresh(allAerodromes);
            });
        } else {
            // Маршрут выбран
            const msg = `Обновить данные для аэродромов маршрута (${routeAerodromes.length})?`;
            
            showConfirmModal(
                title, 
                msg, 
                (refreshAll) => {
                    if (refreshAll) {
                        startBatchRefresh(allAerodromes);
                    } else {
                        startBatchRefresh(routeAerodromes);
                    }
                },
                "", "",
                {
                    checkbox: {
                        label: `Обновить все аэродромы (${allAerodromes.length})`,
                        checked: false,
                        onToggle: (checked) => {
                            if (checked) {
                                confirmModalMessage.textContent = `Обновить данные для всех аэродромов (${allAerodromes.length})?`;
                            } else {
                                confirmModalMessage.textContent = `Обновить данные для аэродромов маршрута (${routeAerodromes.length})?`;
                            }
                        }
                    }
                }
            );
        }
    }

    async function startBatchRefresh(aerodromes) {
        if (!aerodromes || aerodromes.length === 0) return;

        const total = aerodromes.length;
        const progressFill = refreshAllBtn.querySelector('.progress-fill');
        
        refreshAllBtn.disabled = true;
        // Убираем иконку или делаем её прозрачнее, чтобы не мешала? 
        // Или просто пусть будет. Пользователь просил чтобы было видно закрашивание.
        if (progressFill) {
            progressFill.style.width = '0%';
            progressFill.style.display = 'block';
        }

        const batchSize = 5;
        let completed = 0;

        for (let i = 0; i < total; i += batchSize) {
            const batch = aerodromes.slice(i, i + batchSize);
            
            const promises = batch.map(icao => 
                getWeather(icao, false, true, true).then(() => {
                    completed++;
                    const percent = Math.round((completed / total) * 100);
                    if (progressFill) progressFill.style.width = percent + '%';
                }).catch(e => console.error(`Error refreshing ${icao}:`, e))
            );

            await Promise.all(promises);
            // Небольшая задержка между батчами
            await new Promise(r => setTimeout(r, 200));
        }

        if (progressFill) progressFill.style.width = '100%';
        
        // Показываем галочку при завершении
        const icon = refreshAllBtn.querySelector('i');
        const originalClass = icon ? icon.className : '';
        if (icon) icon.className = 'fa-solid fa-check';
        
        // Кратковременная индикация завершения перед включением кнопки
        setTimeout(() => {
            refreshAllBtn.disabled = false;
            updateOfflineButton(); // Восстанавливаем корректное состояние кнопки (online/offline)
            if (progressFill) {
                progressFill.style.width = '0%';
                progressFill.style.display = 'none'; // Скрываем прогресс после завершения
            }
            if (icon) icon.className = originalClass;
        }, 3000);
    }




    function findWorstColor(classes) {
        // classes — это массив вроде ["color-green", "color-red"] и т. п.
        // Сортируем по убыванию плохости, берём первый
        for (let badColor of colorPriority) {
            if (classes.includes(badColor)) {
                return badColor;
            }
        }
        return null;
    }

    function compareWorstColor(currentWorst, newOne) {
        // Если currentWorst ещё null, берём newOne
        if (!currentWorst) return newOne;
        // Иначе смотрим, кто "хуже" (purple или darkred, red, yellow, green)
        // Можно переиспользовать findWorstColor:
        const arr = [];
        if (currentWorst) arr.push(currentWorst);
        if (newOne) arr.push(newOne);
        return findWorstColor(arr);
    }

    function detectWorstMetarOrSpeciColor(rawText, state) {
        // 1. Пропускаем через highlightKeywords
        //    (но учтите, что insertLineBreaks() вы уже делали, если нужно)
        const mainPart = rawText.split(/\s+(?=TEMPO|BECMG|PROB30|PROB40)/i)[0];
        let tmp = highlightKeywords(insertLineBreaks(mainPart), state);

        // 2. Парсим как HTML
        let parser = new DOMParser();
        let doc = parser.parseFromString(tmp, 'text/html');

        // 3. Ищем все спаны с классами color-green / color-red / color-yellow...
        let allSpans = doc.querySelectorAll('span[class*="color-"]');

        // Собираем все классы
        let foundColors = [];
        allSpans.forEach(sp => {
            let cls = sp.classList;
            // например [ 'color-green', 'wind-info' ]
            let color = Array.from(cls).find(c => c.startsWith('color-'));
            if (color) {
                foundColors.push(color);
            }
        });
        // В foundColors, например, ['color-green','color-red','color-yellow']

        return findWorstColor(foundColors); // вернёт наихудший
    }

    function detectWorstTafColor(rawText, state) {
        let tmp = highlightKeywords(insertLineBreaks(rawText), state);

        let parser = new DOMParser();
        let doc = parser.parseFromString(tmp, 'text/html');

        // Удаляем .tempo-line
        doc.querySelectorAll('.tempo-line').forEach(el => el.remove());
        // Вставить вот это, чтобы игнорировать ветер
        doc.querySelectorAll('.wind-info').forEach(el => el.remove());

        // Дополнительно можно удалять строки с PROB30/PROB40.
        // Если у вас всё PROB внутри .tempo-line — можно и не делать.
        // Но, на всякий случай:
        doc.querySelectorAll('span,u,div,p').forEach(el => {
            if (el.textContent.includes("PROB30") || el.textContent.includes("PROB40")) {
                el.remove();
            }
        });

        // Теперь ищем
        let allSpans = doc.querySelectorAll('span[class*="color-"]');
        let foundColors = [];
        allSpans.forEach(sp => {
            let cls = sp.classList;
            let color = Array.from(cls).find(c => c.startsWith('color-'));
            if (color) {
                foundColors.push(color);
            }
        });
        return findWorstColor(foundColors);
    }

    function convertColorClassToBg(cls, isDark) {
        if (isDark) {
            // Темная тема, чуть приглушаем яркость
            switch (cls) {
                case "color-purple":
                    return "#7b3d7b"; // тёмно-фиолетовый
                case "color-darkred":
                    return "#4a0000"; // ещё темнее красный
                case "color-red":
                    return "#803333"; // тёмно-красный
                case "color-yellow":
                    return "#c57c1a"; // темноватый оранжево-жёлтый
                case "color-green":
                    return "#3b7a3b"; // приглушённый зелёный
                default:
                    return "#555"; // fallback
            }
        } else {
            // Светлая тема
            switch (cls) {
                case "color-purple":
                    return "#c44ac4";
                case "color-darkred":
                    return "#5C0000";
                case "color-red":
                    return "#b22222";
                case "color-yellow":
                    return "#d88b16";
                case "color-green":
                    return "#5eaf5e";
                default:
                    return "#a0a0a0";
            }
        }
    }


    // Логика для редактирования gamcUid
    const gamcUidInput = document.getElementById('gamcUidInput');
    const editGamcUidBtn = document.getElementById('editGamcUidBtn');

    // Функция для загрузки текущего gamcUid (использует уже существующую функцию getGamcUID)
    function loadGamcUid() {
        gamcUidInput.value = getGamcUID();
    }
    loadGamcUid();

    let isEditingGamcUid = false;
    editGamcUidBtn.addEventListener('click', () => {
        if (!isEditingGamcUid) {
            // Переключаемся в режим редактирования
            gamcUidInput.removeAttribute('readonly');
            gamcUidInput.style.opacity = '1';
            gamcUidInput.focus();
            editGamcUidBtn.innerHTML = '<i class="fas fa-save"></i>';
            isEditingGamcUid = true;
        } else {
            // При сохранении проверяем: должно быть ровно 6 символов (A-Z и цифры)
            let newUid = gamcUidInput.value.trim().toUpperCase();
            if (/^[A-Z0-9]{6}$/.test(newUid)) {
                localStorage.setItem('gamcUid', newUid);
                gamcUidInput.value = newUid;
                gamcUidInput.setAttribute('readonly', true);
                gamcUidInput.style.opacity = '0.6';
                editGamcUidBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
                isEditingGamcUid = false;
            } else {
                alert('Введите корректный шестизначный код (только заглавные латинские буквы и цифры)');
            }
        }
    });

    // Автоматически переводим вводимые символы в верхний регистр
    gamcUidInput.addEventListener('input', () => {
        gamcUidInput.value = gamcUidInput.value.toUpperCase();
    });

    // В main.js (или extra.js) найди где все остальные close*ModalBtn
    const closeLandingSystemsBtn = document.getElementById('closeLandingSystemsModalBtn');
    closeLandingSystemsBtn.addEventListener('click', () => {
        hideLandingSystemModal();  // вызываем функцию из landingSystems.js
    });

    // Можно также закрывать по клику на фон
    document.getElementById('landingSystemsModalBackdrop').addEventListener('click', (e) => {
        const backdrop = e.target;
        if (backdrop.id === 'landingSystemsModalBackdrop') {
            hideLandingSystemModal();
        }
    });

    function computeDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Радиус Земли в км
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

    setInterval(updateBadgesTimeAndColors, 15000);
});
