let offlineMode = JSON.parse(localStorage.getItem('offlineMode')) || false;
let autoGoOffline = localStorage.getItem('autoGoOffline') !== null ?
    JSON.parse(localStorage.getItem('autoGoOffline')) :
    true;
let doHighlight = JSON.parse(localStorage.getItem('doHighlight')) || false;
let canShowAirportInfo = JSON.parse(localStorage.getItem('canShowAirportInfo')) || false;

// Maintenance support for B737 is provided in the following airports (29 NOV 24)
const airportMaintenanceCodes = [
    "UAAA", "UBBB", "UDYZ", "UEEE",
    "UHWW", "UIII", "ULAA", "ULLI", "ULMM", "UMKK", "UMMS", "UNBG", "UNKL", "UNNT", "UNOO",
    "URMG", "URML", "URMM", "URSS", "URWW", "USII", "USPP", "USRR", "USSS", "USTR", "UTTT",
    "UUYY", "UWGG", "UWKD", "UWOO", "UWUU", "UWWW", "HECA", "HEGN", "HESH", "LTAI", "LTFM",
    "OMAA", "OMDB", "OMDW", "VTBS", "ZJSY"
];

let nowIcao = null;
let showSecondMenu = JSON.parse(localStorage.getItem('showSecondMenu')) || false;
let icaoKeys = null;

// 35
const airportsB = ['VVCR', 'EPKK', 'LTAF', 'ZPPP', 'LTDB', 'ZLLL', 'LCLK', 'UAAA', 'KLAS', 'LFLL', 'KLAX', 'FMMI', 'UHMM', 'USCM', 'VAAH', 'LEBL', 'KMIA', 'VMMC', 'LEMG', 'RPLL', 'SBBR', 'OOMS', 'LEVC', 'URML', 'MUVR', 'URMM', 'LIPX', 'HKMO', 'UHWW', 'DTMB', 'URMO', 'CYUL', 'EGKK', 'VABB', 'VHHH', 'GCLP', 'URMN', 'URMG', 'UTFN', 'ZGGG', 'UOOO', 'UACC', 'VVDN', 'HTDA', 'KONT', 'WADD', 'KMCO', 'KDTW', 'RJBB', 'CYOW', 'HTZA', 'LTBJ', 'LFPG', 'LFPO', 'UCFL', 'ULMK', 'ZBAA', 'OPPS', 'RJTT', 'UNTT', 'VTSP', 'CYYZ', 'LTCG', 'SBRF', 'DTTA', 'LIRF', 'ZMCK', 'LIPR', 'UIUU', 'SBGL', 'VTBU', 'URRP', 'UTFF', 'GVAC', 'KPHL', 'SBSV', 'EDDF', 'UTSS', 'VVNB', 'KSAN', 'ZSHC', 'ZJSY', 'UTDL', 'SBGR', 'KSFO', 'RKSI', 'RKPC', 'ZLXY', 'VOMM', 'URMS', 'UIAA', 'LBSF', 'ZUUU', 'KTPA', 'ZYTX', 'UUEE', 'DTNH', 'GCTS', 'UTST']
// 98
const airportsBz = ['GMAD', 'LEAL', 'OJAI', 'LTAC', 'EGLL', 'LTAI', 'LGAV', 'LEMD', 'OLBA', 'UCFM', 'UHBB', 'LIMC', 'LOWW', 'ULMM', 'UNBG', 'UTSA', 'UBBG', 'LLOV', 'UDYZ', 'LSGG', 'UCFO', 'LEPA', 'UIII', 'LCPH', 'BIKF', 'LBPD', 'BIRK', 'HEGN', 'LSZH', 'LTBA', 'HESH', 'UGTB', 'OIIE', 'LLBG', 'UHSS']
// 37
const airportsC = ['OJAQ', 'FIMP', 'UHMA', 'LFML', 'LFKJ', 'LTFE', 'LIME', 'MMMX', 'RKPK', 'LIRN', 'URKG', 'LFMN', 'LFLS', 'KJFK', 'LTBS', 'UHPP', 'LDDU', 'LYPG', 'UTDD', 'LGTS', 'LOWS', 'FSIA', 'LOWI', 'URSS', 'LGIR', 'LDSP', 'LKKV', 'ZBYN', 'VNKT', 'OIII', 'LGKR', 'LYTV', 'UTDK', 'LIMF', 'LJLJ', 'LFLB', 'LTCE']

const reportedBrakingActions = {
    takeoff: {
        dry: {
            kts: 34,
            mps: 17.5
        },
        good: {
            kts: 25,
            mps: 12.9
        },
        good_to_medium: {
            kts: 22,
            mps: 11.3
        },
        medium: {
            kts: 20,
            mps: 10.3
        },
        medium_to_poor: {
            kts: 15,
            mps: 7.7
        },
        poor: {
            kts: 13,
            mps: 6.7
        }
    },
    landing: {
        dry: {
            kts: 40,
            mps: 20.6
        },
        good: {
            kts: 40,
            mps: 20.6
        },
        good_to_medium: {
            kts: 35,
            mps: 18.0
        },
        medium: {
            kts: 25,
            mps: 12.9
        },
        medium_to_poor: {
            kts: 17,
            mps: 8.7
        },
        poor: {
            kts: 15,
            mps: 7.7
        }
    }
};
const coefficientBrakingActions = {
    normative: {
        takeoff: {
            0.5: {
                kts: 34,
                mps: 17.5
            },
            0.42: {
                kts: 25,
                mps: 12.9
            },
            0.4: {
                kts: 22,
                mps: 11.3
            },
            0.37: {
                kts: 20,
                mps: 10.3
            },
            0.35: {
                kts: 15,
                mps: 7.7
            },
            0.3: {
                kts: 13,
                mps: 6.7
            }
        },
        landing: {
            0.5: {
                kts: 40,
                mps: 20.6
            },
            0.42: {
                kts: 40,
                mps: 20.6
            },
            0.4: {
                kts: 35,
                mps: 18.0
            },
            0.37: {
                kts: 25,
                mps: 12.9
            },
            0.35: {
                kts: 17,
                mps: 8.7
            },
            0.3: {
                kts: 15,
                mps: 7.7
            }
        }
    },
    by_sft: {
        takeoff: {
            0.51: {
                kts: 34,
                mps: 17.5
            },
            0.4: {
                kts: 25,
                mps: 12.9
            },
            0.36: {
                kts: 22,
                mps: 11.3
            },
            0.3: {
                kts: 20,
                mps: 10.3
            },
            0.26: {
                kts: 15,
                mps: 7.7
            },
            0.17: {
                kts: 13,
                mps: 6.7
            }
        },
        landing: {
            0.51: {
                kts: 40,
                mps: 20.6
            },
            0.4: {
                kts: 40,
                mps: 20.6
            },
            0.36: {
                kts: 35,
                mps: 18.0
            },
            0.3: {
                kts: 25,
                mps: 12.9
            },
            0.26: {
                kts: 17,
                mps: 8.7
            },
            0.17: {
                kts: 15,
                mps: 7.7
            }
        }
    }
};

// Ключи для localStorage
const PASSWORD_KEY = 'gamcPassword';
const ICAO_HISTORY_KEY = 'icaoHistory';

const LAST_COUNT = 30;
const SUGGESTIONS_COUNT = 7;

let airportInfoDb = {};
// Вместо:
// let icaoColors = {};

let storedIcaoColors = JSON.parse(localStorage.getItem('icaoColors') || '{}');
let icaoColors = storedIcaoColors;

// Загружаем базу аэродромов (icao, iata, geo[0]=название, geo[1]=страна)
fetch('data/airports_db.json')
    .then(response => response.json())
    .then(data => {
        data.forEach(item => {
            airportInfoDb[item.icao] = item;
        });
        icaoKeys = Object.keys(airportInfoDb).sort();
    })
    .catch(err => {
        console.error('Не удалось загрузить airports_db.json:', err);
    });

// Приоритет цветов от худшего к лучшему
// (darkred и purple можно тоже расставить, если нужно)
const colorPriority = [
    "color-purple", // считаем экстремально худшим
    "color-darkred",
    "color-red",
    "color-yellow",
    "color-green"
];

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
    const gpsBtn = document.getElementById('gpsBtn');
    const aiBtn = document.getElementById('aiBtn');
    const resetPasswordBtn = document.getElementById('resetPasswordBtn');
    const removeSavedIcaosBtn = document.getElementById('removeSavedIcaos');
    const responseContainer = document.getElementById('responseContainer');
    const historyContainer = document.getElementById('historyContainer');
    const timeBadgeContainer = document.getElementById('timeBadgeContainer');

    const refreshAllBtn = document.getElementById('refreshAllBtn');
    const batchRefreshModalBackdrop = document.getElementById('batchRefreshModalBackdrop');
    const closeBatchRefreshModalBtn = document.getElementById('closeBatchRefreshModalBtn');
    const batchRefreshInfo = document.getElementById('batchRefreshInfo');
    const batchRefreshProgress = document.getElementById('batchRefreshProgress');
    const batchRefreshCurrentIcao = document.getElementById('batchRefreshCurrentIcao');

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

    // Модальное окно для добавления маршрута
    const addRouteModalBackdrop = document.getElementById('addRouteModalBackdrop');
    const closeAddRouteModalBtn = document.getElementById('closeAddRouteModalBtn');
    const saveRouteBtn = document.getElementById('saveRouteBtn');

    // Поля ввода внутри модалки
    const departureIcaoInput = document.getElementById('departureIcao');
    const arrivalIcaoInput = document.getElementById('arrivalIcao');
    const alternatesIcaoInput = document.getElementById('alternatesIcao');

    const savedPassword = localStorage.getItem(PASSWORD_KEY);
    if (!savedPassword) {
        showModal();
    } else {
        hideModal();
    }
    renderHistory();

    function getGamcUID() {
        let gamcUid = localStorage.getItem('gamcUid');
        if (!gamcUid) {
            gamcUid = generateUID();
            localStorage.setItem('gamcUid', gamcUid);
        }
        return gamcUid;
    }

    function addTimeBadgeContainerBottomGap() {
        if (timeBadgeContainer.classList.contains('remove-bottom-gap')) {
            timeBadgeContainer.classList.remove('remove-bottom-gap');
        }
    }

    function removeTimeBadgeContainerBottomGap() {
        if (!timeBadgeContainer.classList.contains('remove-bottom-gap')) {
            timeBadgeContainer.classList.add('remove-bottom-gap');
        }
    }

    function generateUID() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
        let uid = '';
        for (let i = 0; i < 6; i++) {
            uid += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return uid;
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
    editRouteBtn.addEventListener('click', () => {
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

    function updateFetchBtn() {
        const icao = icaoInput.value.trim().toUpperCase();

        if (nowIcao && nowIcao === icao && icao.length === 4) {
            fetchBtn.innerHTML = '<i class="fas fa-sync-alt"></i>Обновить';
        } else {
            fetchBtn.innerHTML = '<i class="fas fa-cloud-download-alt"></i>Запросить';
        }

        fetchBtn.disabled = icao.length !== 4;
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
    titleButton.addEventListener('click', () => {
        location.reload();
    });


    function showModal() {
        modalBackdrop.classList.add('show');
    }

    function hideModal() {
        modalBackdrop.classList.remove('show');
    }

    function showOfflineWarning() {
        const warning = document.createElement('div');
        warning.className = 'offline-warning';
        warning.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation"></i>Нет подключения. Данные взяты из сохраненных.
        `;
        timeBadgeContainer.insertAdjacentElement('afterend', warning);
        addTimeBadgeContainerBottomGap();
    }

    function showOfflineWarningNoInfo() {
        const warning = document.createElement('div');
        warning.className = 'offline-warning-no-info';
        warning.innerHTML = `
            <i class="fa-solid fa-ban"></i>Нет подключения. Нет сохраненных данных.
        `;
        timeBadgeContainer.insertAdjacentElement('afterend', warning);
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

    /* =========================
       ЗАПРОС ПОГОДЫ
    ========================= */
    async function getWeather(icao, isRefresh = false, silent = false) {
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

        nowIcao = icao;
        hideAirportInfo();

        if (!silent) {
            responseContainer.textContent = 'Здесь будет отображаться погода...';
            timeBadgeContainer.innerHTML = '';
            removeTimeBadgeContainerBottomGap();
        }

        const existingWarning = document.querySelector('.offline-warning');
        if (existingWarning) {
            existingWarning.remove();
        }

        const existingWarningNoInfo = document.querySelector('.offline-warning-no-info');
        if (existingWarningNoInfo) {
            existingWarningNoInfo.remove();
        }

        const gamcUid = getGamcUID();
        const url = `https://myapihelper.na4u.ru/gamc_app/api.php?password=${encodeURIComponent(password)}&icao=${encodeURIComponent(icao)}&gamcUid=${encodeURIComponent(gamcUid)}`;

        if (silent) {
            responseContainer.textContent = 'Здесь будет отображаться погода...';
            state.worstRunwayFrictionCode = null;
        } else {
            responseContainer.textContent = 'Загрузка...';
            state.worstRunwayFrictionCode = null;
        }
        timeBadgeContainer.innerHTML = '';
        removeTimeBadgeContainerBottomGap();

        let toShowOfflineWarning = false;

        // Проверка сохраненных данных
        const savedData = JSON.parse(localStorage.getItem('icaoData') || '{}');
        if ((!navigator.onLine) || offlineMode) {
            showAirportInfo(icao);
            if (savedData[icao]) {
                responseContainer.innerHTML = savedData[icao];
                toShowOfflineWarning = true;
            } else {
                showOfflineWarningNoInfo(); // Показать предупреждение
                responseContainer.innerHTML = 'Нет данных.';
                return;
            }
        }

        try {
            let rawData;
            if (offlineMode && toShowOfflineWarning) {
                rawData = savedData[icao];
            } else {
                const res = await fetch(url);
                rawData = await res.text();
                rawData = rawData.replace(/<br>/g, ' ');
            }

            if (silent) {
                const savedData = JSON.parse(localStorage.getItem('icaoData') || '{}');
                savedData[icao] = rawData;
                localStorage.setItem('icaoData', JSON.stringify(savedData));
            }

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

            // ========= Формируем плашки с временем в новом порядке =======
            timeBadgeContainer.innerHTML = '';
            removeTimeBadgeContainerBottomGap();

            const nowUTC = new Date();
            const hhUTC = String(nowUTC.getUTCHours()).padStart(2, '0');
            const mmUTC = String(nowUTC.getUTCMinutes()).padStart(2, '0');

            const utcBadge = document.createElement('div');
            utcBadge.className = 'time-badge';
            utcBadge.id = 'utcBadge';
            utcBadge.textContent = `UTC ${hhUTC}:${mmUTC}`;

            // Добавляем в контейнер первым
            if (toShowOfflineWarning) {
                showOfflineWarning();
            }

            if (!silent) {
                timeBadgeContainer.appendChild(utcBadge);
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
                    const nowUTC = new Date(); // текущее время (локально), но сравнение будем вести в UTC
                    const diffMin = (nowUTC - msgDate) / 60000;
                    const diffAbs = Math.abs(diffMin);

                    // Делаем плашку
                    const badge = document.createElement('div');
                    badge.className = 'time-badge';
                    badge.textContent = `${t} ${hh}:${String(mm).padStart(2,'0')}`;
                    badge.dataset.msgDate = msgDate.toISOString();

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

                    if (!silent) {
                        // Добавляем плашку в контейнер
                        timeBadgeContainer.appendChild(badge);
                    }
                }
            });

            const airportClassBadge = document.createElement('div');
            airportClassBadge.className = 'time-badge';
            airportClassBadge.id = 'showMaintenanceInfoModal';
            airportClassBadge.classList.add(getAirportColorClass(state.nowIcao));
            airportClassBadge.classList.add('content-clickable');
            airportClassBadge.innerHTML = getAirportIconClass(state.nowIcao);

            airportClassBadge.addEventListener('click', () => {
                showMaintenanceInfoModal(getAirportClassInfoText(state.nowIcao));
            });

            if (!silent) {
                timeBadgeContainer.appendChild(airportClassBadge);
            }

            if (airportMaintenanceCodes.includes(icao)) {
                const maintenanceBadge = document.createElement('div');
                maintenanceBadge.className = 'time-badge';
                maintenanceBadge.id = 'showMaintenanceInfoModal';
                maintenanceBadge.classList.add('badge-green');
                maintenanceBadge.classList.add('content-clickable');
                maintenanceBadge.innerHTML = `<i class="fa-solid fa-wrench"></i>`;

                maintenanceBadge.addEventListener('click', () => {
                    showMaintenanceInfoModal(`На аэродроме <b>${icao}</b> осуществляется техническое обслуживание B737<br><br>NOTAM AFL 9EMIH/24 (29 NOV 24)`);
                });

                if (!silent) {
                    timeBadgeContainer.appendChild(maintenanceBadge);
                }
            }

            const isNotamUpdated = hasNotamsForIcao(icao);

            const notamsBadge = document.createElement('div');
            notamsBadge.className = 'time-badge';
            notamsBadge.id = 'notamBtn';
            notamsBadge.classList.add(isNotamUpdated ? 'badge-default' : 'badge-red');
            notamsBadge.classList.add('content-clickable');
            notamsBadge.onclick = showNotamModal;
            notamsBadge.innerHTML = `<i class="fa-solid fa-file-alt"></i>`;

            if (!silent && (isNotamUpdated || !offlineMode)) {
                timeBadgeContainer.appendChild(notamsBadge);
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

            // Выводим как HTML (чтобы теги <b>, <u> работали)
            if (!silent) {
                responseContainer.innerHTML = finalText;
                showAirportInfo(icao);
            }

            // Создадим переменные
            let metarWorstColor = null;
            let tafWorstColor = null;

            // Возьмём массив blockObjects (у вас он выше называется именно так),
            // чтобы понять, какой из блоков METAR/SPECI, а какой TAF
            blockObjects.forEach(block => {
                if (block.type === "METAR" || block.type === "SPECI") {
                    // Ищем худший цвет в block.text
                    const color = detectWorstMetarOrSpeciColor(block.text, state);
                    if (color) {
                        // Сравниваем с текущим metarWorstColor
                        metarWorstColor = compareWorstColor(metarWorstColor, color);
                    }
                } else if (block.type === "TAF") {
                    // Ищем худший цвет в block.text (но без TEMPO/PROB)
                    const color = detectWorstTafColor(block.text, state);
                    if (color) {
                        tafWorstColor = compareWorstColor(tafWorstColor, color);
                    }
                }
            });

            // Запишем в некий глобальный объект
            // (объявите его где-нибудь наверху: let icaoColors = {}; )

            if (!toShowOfflineWarning) {
                if (!icaoColors[icao]) {
                    icaoColors[icao] = {};
                }
                icaoColors[icao].metarColor = metarWorstColor;
                icaoColors[icao].tafColor = tafWorstColor;
                icaoColors[icao].updatedAt = new Date().toISOString();

                localStorage.setItem('icaoColors', JSON.stringify(icaoColors));
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

            updateGpsButton();
        } catch (err) {
            responseContainer.textContent = 'Ошибка при запросе: ' + err;
        }
    }

    function setButtonColorSplit(btn, metarColor, tafColor) {
        btn.style.background =
            `linear-gradient(to right, var(--col-${metarColor}) 50%, var(--col-${tafColor}) 50%)`;
        btn.style.color = 'white';
    }

    function applyIcaoButtonColors(icao, btn) {
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
        text = text.replace(/\b(WS)\b/g, '<span class="color-purple">$1</span>');

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

            return `<span class="color-description runway-info" data-runway="${rwy}" data-info="${info}">${match} <i class="fa fa-info-circle" aria-hidden="true"></i></span>`;
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
                    colorClass = 'color-green';
                } else if (ratio >= 40 && ratio < 70) {
                    colorClass = 'color-yellow';
                } else if (ratio >= 70 && ratio < 90) {
                    colorClass = 'color-red';
                } else if (ratio >= 90) {
                    colorClass = 'color-purple';
                }

                //                let colorClass = '';
                //                if (ratio < 40) {
                //                    colorClass = 'color-green';
                //                } else if (ratio >= 40 && ratio < 70) {
                //                    colorClass = 'color-yellow';
                //                } else if (ratio >= 70 && ratio < 90) {
                //                    colorClass = 'color-red';
                //                } else if (ratio >= 90) {
                //                    colorClass = 'color-purple';
                //                }
                // Если попали в 35..40 => colorClass = "" (без цвета)

                // Возвращаем HTML
                return `<span class="wind-info ${colorClass}" data-wind="${fullMatch}" data-unit="${unit}" data-dir="${dir}" data-speed="${speedStr}" data-gust="${gustStr||''}">${fullMatch} <i class="fa-solid fa-wind"></i></span>`;
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
        getWeather(icao, false);
        updateFetchBtn();
        updateGpsButton();

        // --- добавляешь это ---
        const suggestionsContainer = document.getElementById('icaoSuggestions');
        suggestionsContainer.classList.remove('show');
        suggestionsContainer.innerHTML = '';
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

    function updateHistoryBtnNotam() {
        // Получаем кнопки из historyContainer
        const historyBtns = historyContainer.querySelectorAll('button');
        const icaoUpdatedNotam = getIcaoListUpdatedNotams();

        // Обновляем кнопки
        historyBtns.forEach(btn => {
            const i = btn.textContent.trim();
            const isUpdated = icaoUpdatedNotam.includes(i);
            btn.classList.toggle('not-updated-notam', !isUpdated);
        });
    }

    function renderHistory() {
        let history = JSON.parse(localStorage.getItem(ICAO_HISTORY_KEY) || '[]');
        historyContainer.innerHTML = '';

        history.forEach(icao => {
            const btn = document.createElement('button');
            btn.textContent = icao;

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
                applyIcaoButtonColors(icao, btn);
            }

            btn.addEventListener('click', () => {
                icaoInput.value = icao;
                getWeather(icao, false);
                updateFetchBtn();
            });
            historyContainer.appendChild(btn);
        });

        updateHistoryBtnNotam();
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

    /**
     * Показывает модалку подтверждения с заголовком, сообщением и коллбэком,
     * который вызывается по нажатию "Да".
     */
    function showConfirmModal(title, message, onYes, onYesBgColor = "", onNoBgColor = "", showNotamCheckbox = false) {
        confirmModalTitle.textContent = title;
        confirmModalMessage.textContent = message;

        const notamContainer = document.getElementById('confirmNotamContainer');
        notamContainer.style.display = showNotamCheckbox ? 'flex' : 'none';
        document.getElementById('confirmNotamCheckbox').checked = false;

        // При нажатии на "Да" выполняем нужное действие
        confirmYesBtn.onclick = () => {
            hideConfirmModal();

            // Считаем галочку
            const isLoadNotam = document.getElementById('confirmNotamCheckbox').checked;

            // Передаём во внешний обработчик, если нужно
            onYes(isLoadNotam);
        };

        confirmYesBtn.style.backgroundColor = onYesBgColor;
        confirmNoBtn.style.backgroundColor = onNoBgColor;

        confirmModalBackdrop.classList.add('show');
    }

    function showOfflineAlert() {
        confirmModalTitle.textContent = 'Оффлайн режим включен';
        confirmModalMessage.textContent = 'Отключите оффлайн режим для обновления';

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

        // Если frictionDesc === "Нет данных" и является числом от 10 до 90
        if (frictionDesc === "нет данных" && friction >= 10 && friction <= 90) {
            frictionDesc = `0.${friction}`;
        }

        return `
            <strong class='strong-header'>Код:</strong> ${runway} / ${info}<br><br>
            <strong>ВПП:</strong> ${runwayDesc}<br>
            <strong>Условия:</strong> ${conditionDesc} (${condition || "-"})<br>
            <strong>Степень:</strong> ${coverageDesc} (${coverage || "-"})<br>
            <strong>Толщина:</strong> ${depthDesc} (${depth || "-"})<br>
            <strong>Коэф. сцепления:</strong> ${frictionDesc} (${friction || "-"})
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
            content += `Ветер переменный (VRB), сложно вычислить боковую/встречную.`;
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
        let shownSet = new Set();
        const runwaysObj = airportInfoDb[state.nowIcao].runways;
        const worstCond = getWorstRunwayCondition(state);

        // Вставьте полностью этот вариант:
        for (const [rwyName, rwyData] of Object.entries(runwaysObj)) {
            // Магнитный курс полосы
            const hdgMag = rwyData.hdg;

            // Ищем противоположную полосу
            const oppName = findOppositeRunway(state.nowIcao, rwyName);
            const oppHdgMag = runwaysObj[oppName]?.hdg || hdgMag;

            // Выбираем ту ВПП, которая ближе к ветру
            const chosenHdg = closestRunway(windDirMag, hdgMag, oppHdgMag);
            // Если chosenHdg совпадает с hdgMag, значит это rwyName, иначе oppName
            const chosenName = (chosenHdg === hdgMag) ? rwyName : oppName;

            // Чтобы не дублировать «парную» ВПП (например, 06L и 24R),
            // если мы её уже выводили — пропускаем
            if (shownSet.has(chosenName)) {
                continue;
            }
            shownSet.add(chosenName);

            // Считаем боковую/встречную (steady ветер)
            const xwMain = calcCrosswind(chosenHdg, windSpeed);
            const hwMain = calcHeadwind(chosenHdg, windSpeed);

            // Если есть порыв – считаем и для порыва
            const xwGust = windGust ? calcCrosswind(chosenHdg, windGust) : 0;
            const hwGust = windGust ? calcHeadwind(chosenHdg, windGust) : 0;

            const xwMainAbs = Math.abs(xwMain);
            const xwGustAbs = Math.abs(xwGust);

            // Определяем предельные значения (takeoff/landing) для худшего состояния
            let takeoffMax, landingMax;
            if (worstCond.kind === 'reported') {
                const cat = worstCond.category; // например 'poor','medium','good'
                takeoffMax = reportedBrakingActions.takeoff[cat] || reportedBrakingActions.takeoff.good;
                landingMax = reportedBrakingActions.landing[cat] || reportedBrakingActions.landing.good;
            } else {
                // measured
                const friction = worstCond.frictionValue;
                const relevant = worstCond.relevantData;
                // Подставляем "currentFriction"
                let toObj = {
                    ...relevant.takeoff,
                    currentFriction: friction
                };
                let ldObj = {
                    ...relevant.landing,
                    currentFriction: friction
                };
                takeoffMax = getCrosswindLimit('takeoff', toObj, reportedBrakingActions.takeoff.good);
                landingMax = getCrosswindLimit('landing', ldObj, reportedBrakingActions.landing.good);
            }

            // Приводим к нужным единицам (MPS или KTS)
            const toLimit = (unit === 'MPS') ? takeoffMax.mps : takeoffMax.kts;
            const ldLimit = (unit === 'MPS') ? landingMax.mps : landingMax.kts;

            // Считаем проценты для steady и порыва (используем landingLimit, как раньше)
            const ratioSteady = (xwMainAbs / ldLimit) * 100;
            const ratioGust = windGust ? (xwGustAbs / ldLimit) * 100 : 0;

            // Функция для выбора цвета
            function pickColor(ratio) {
                if (ratio < 40) return 'color-green';
                if (ratio >= 40 && ratio < 70) return 'color-yellow';
                if (ratio >= 70 && ratio < 90) return 'color-red';
                if (ratio >= 90) return 'color-purple';
                return '';
            }

            const steadyClass = pickColor(ratioSteady);
            const gustClass = windGust ? pickColor(ratioGust) : '';

            // ---- Читаем индивидуальный коэффициент сцепления для chosenName
            const frictionCode = state.runwayFrictionMap[chosenName] ?? null;
            let frictionText = '(нет данных)';
            if (typeof frictionCode === 'number') {
                if (frictionCode >= 91 && frictionCode <= 95) {
                    // 91=poor, 92=poor_to_medium, 93=medium, ...
                    // Можно написать decodeFrictionCode, но коротко:
                    const frictionMap = {
                        91: 'poor',
                        92: 'poor/medium',
                        93: 'medium',
                        94: 'medium/good',
                        95: 'good'
                    };
                    frictionText = frictionMap[frictionCode] || '???';
                } else {
                    // 10..90 => 0.xx
                    frictionText = (frictionCode / 100).toFixed(2);
                }
            }

            // Формируем вывод
            content += `
                <strong>ВПП ${chosenName}</strong> (${formatNumber(chosenHdg)}°):
                <br>
                Коэф. сцепления: <b>${frictionText}</b>
                <br>
                <i class="fa-solid fa-chevron-right"></i> HW: ${hwMain.toFixed(1)} ${unit}
            `;
            if (windGust) {
                content += `, (<i class="fa-solid fa-wind"></i> ${hwGust.toFixed(1)} ${unit})`;
            }
            content += `<br><i class="fa-solid fa-chevron-right"></i> XW: `;

            if (steadyClass) {
                content += `<span class="${steadyClass}">${xwMainAbs.toFixed(1)} ${unit}</span>`;
            } else {
                content += `${xwMainAbs.toFixed(1)} ${unit}`;
            }

            if (windGust) {
                if (gustClass) {
                    content += ` (<span class="${gustClass}">
                        <i class="fa-solid fa-wind"></i> ${xwGustAbs.toFixed(1)} ${unit}
                    </span>)`;
                } else {
                    content += ` (${xwGustAbs.toFixed(1)} ${unit})`;
                }
            }

            content += `<br><small>(Limit T/O=${toLimit} ${unit}, LDG=${ldLimit} ${unit})</small>`;
            content += `<br><br>`;
        }

        // После цикла
        if (worstCond.kind === 'reported') {
            content += `<hr><p><b>Состояние ВПП:</b> ${worstCond.category.toUpperCase()}</p>`;
        } else {
            content += `<hr><p><b>Коэф сцеп:</b> ${worstCond.frictionValue.toFixed(2)} (тип: ${isRussianAirport(nowIcao) ? 'нормативный' : 'измеренный'})</p>`;
        }

        showWindInfoModal(content);
    });

    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModalBackdrop = document.getElementById('settingsModalBackdrop');
    const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');

    settingsBtn.addEventListener('click', () => {
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
        if (offlineMode) {
            offlineToggleBtn.classList.add('offline');
            offlineToggleBtn.classList.remove('online');
            offlineToggleBtn.innerHTML = '<i class="fa-solid fa-plane"></i>';
            document.getElementById('refreshAllBtn').disabled = true;
            document.getElementById('loadGamcUidBtn').disabled = true;
            document.getElementById('exportGamcUidBtn').disabled = true;
        } else {
            offlineToggleBtn.classList.add('online');
            offlineToggleBtn.classList.remove('offline');
            offlineToggleBtn.innerHTML = '<i class="fa-solid fa-signal"></i>';
            document.getElementById('refreshAllBtn').disabled = false;
            document.getElementById('loadGamcUidBtn').disabled = false;
            document.getElementById('exportGamcUidBtn').disabled = false;
        }
    }

    // Первоначальное обновление кнопки при загрузке
    updateOfflineButton();

    // Обработчик клика по кнопке для переключения режима
    offlineToggleBtn.addEventListener('click', () => {
        offlineMode = !offlineMode;
        localStorage.setItem('offlineMode', JSON.stringify(offlineMode));
        updateOfflineButton();
        updateGpsButton();
    });

    function updateGpsButton() {
        gpsBtn.disabled = !(nowIcao && nowIcao.length === 4 && !offlineMode);
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

    // Установить состояние чекбокса при загрузке
    autoOfflineCheckbox.checked = autoGoOffline; // Установить состояние
    doHighlightCheckbox.checked = doHighlight; // Установить состояние
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
        if (isEditingRoute) {
            // Редактируем существующий
            const alts = alternatesIcaoInput.value.trim().toUpperCase();
            let alternatesList = alts ? alts.split(/\s+/) : [];
            alternatesList = alternatesList.slice(0, LAST_COUNT).filter(a => a.length === 4);

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

        const dep = departureIcaoInput.value.trim().toUpperCase();
        const arr = arrivalIcaoInput.value.trim().toUpperCase();
        const alts = alternatesIcaoInput.value.trim().toUpperCase();

        if (dep.length !== 4 || arr.length !== 4) {
            alert('Вылет и Назначение должны содержать по 4 латинских буквы!');
            return;
        }

        // Парсим запасные
        let alternatesList = alts ? alts.split(/\s+/) : [];
        // Ограничим максимум LAST_COUNT
        alternatesList = alternatesList.slice(0, LAST_COUNT).filter(a => a.length === 4);

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
                savedRoutes.splice(editRouteIndex, 1);
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
        document.getElementById('editRouteBtn').disabled = true;
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

        // Всегда оставляем «Недавние» выбранным по умолчанию (если нужно)
        document.getElementById('editRouteBtn').disabled = true;
    }
    renderRoutesInSelect();

    routeSelect.addEventListener('change', () => {
        const selectedValue = routeSelect.value;
        const editBtn = document.getElementById('editRouteBtn');

        if (selectedValue === 'recent') {
            // Показываем "Недавние"
            renderHistory();
            editBtn.disabled = true;
            return;
        }

        if (selectedValue === 'add') {
            // Показываем модалку
            showAddRouteModal();
            editBtn.disabled = true;
            routeSelect.value = 'recent';
            return;
        }

        // Иначе это индекс маршрута
        const routeIndex = parseInt(selectedValue, 10);
        const route = savedRoutes[routeIndex];
        if (!route) return;

        // Собираем массив [departure, arrival, ...alternates]
        const routeAerodromes = [route.departure, route.arrival, ...route.alternates];

        // Рендерим их в #historyContainer
        renderRouteAerodromes(routeAerodromes);

        editBtn.disabled = routeSelect.value === 'recent' || routeSelect.value === 'add';
    });

    function renderRouteAerodromes(aerodromes) {
        // Очищаем
        historyContainer.innerHTML = '';
        // По аналогии с renderHistory(), но вместо history делаем buttons из массива aerodromes
        aerodromes.forEach(icao => {
            const btn = document.createElement('button');
            btn.textContent = icao;
            // Если хотим, чтобы при нажатии запрашивалась погода:
            btn.addEventListener('click', () => {
                document.getElementById('icao').value = icao;
                getWeather(icao, false);
                updateFetchBtn();
            });
            applyIcaoButtonColors(icao, btn);
            historyContainer.appendChild(btn);
        });

        updateHistoryBtnNotam();
    }

    function updateBadgesTimeAndColors() {
        // 1) Обновляем время UTC
        const utcBadge = document.getElementById('utcBadge');
        if (utcBadge) {
            const nowUTC = new Date();
            const hhUTC = String(nowUTC.getUTCHours()).padStart(2, '0');
            const mmUTC = String(nowUTC.getUTCMinutes()).padStart(2, '0');
            utcBadge.textContent = `UTC ${hhUTC}:${mmUTC}`;
        }

        // 2) Находим все .time-badge (которые у нас METAR/TAF) и пересчитываем разницу
        const badges = document.querySelectorAll('.time-badge');
        badges.forEach(badge => {
            // Пропускаем плашку UTC и плашку «Wrench»
            if (badge.id === 'utcBadge' || badge.id === 'showMaintenanceInfoModal') return;

            // Извлекаем дату, которую мы записали в badge.dataset.msgDate
            const msgDateStr = badge.dataset.msgDate;
            if (!msgDateStr) return; // если дата не задана — уходим

            const msgDate = new Date(msgDateStr);
            const now = new Date();
            const diffMin = (now - msgDate) / 60000;
            const diffAbs = Math.abs(diffMin);

            // Сначала убираем все «цветные» классы, чтобы потом назначить заново
            badge.classList.remove('badge-green', 'badge-orange', 'badge-red', 'badge-default');

            // Восстанавливаем оригинальный тип (METAR, TAF и т.п.) из badge.textContent или ещё откуда:
            const text = badge.textContent;
            // Можно отловить "METAR", "SPECI", "TAF" и т.д.
            // Здесь покажу самый короткий путь – просто проверить, содержит ли текст "METAR/TAF"
            const isMetarSpeci = /^(METAR|SPECI)/i.test(text);
            const isTaf = /^TAF/i.test(text);

            // Пересчитываем классы
            if (diffAbs <= 10) {
                // до 10 минут — badge-green
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
        const elevationElem = document.getElementById('airportElevation');
        const codesElem = document.getElementById('airportCodes');
        const notamModalName = document.getElementById('notamModalName');

        if (!airportInfoDb[icao]) {
            container.style.display = 'none';
            return;
        }
        const {
            geo,
            iata,
            elevation
        } = airportInfoDb[icao];

        const name = geo ? geo[0] : null;
        const country = geo ? geo[1] : null;

        nameElem.textContent = name ? name : `Аэродром ${icao}`;
        countryElem.textContent = country ? country : 'Страна не указана';
        elevationElem.textContent = `${elevation} ft`;

        let airportCodesText;
        if (iata) {
            codesElem.textContent = `${icao}/${iata}`;
            airportCodesText = `(${icao}/${iata})`;
        } else {
            codesElem.textContent = icao;
            airportCodesText = `(${icao})`;
        }

        notamModalName.textContent = 'NOTAM ' + (name ? name : `Аэродром ${icao}`) + ' ' + airportCodesText;

        container.style.display = 'flex';
    }

    function updateMenuShow() {
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const refreshAllBtn = document.getElementById('refreshAllBtn');
        const settingsBtn = document.getElementById('settingsBtn');

        if (showSecondMenu) {
            zoomInBtn.hidden = true;
            zoomOutBtn.hidden = true;
            gpsBtn.hidden = false;
            aiBtn.hidden = false;
            refreshAllBtn.hidden = false;
            settingsBtn.hidden = true;
        } else {
            zoomInBtn.hidden = false;
            zoomOutBtn.hidden = false;
            gpsBtn.hidden = true;
            aiBtn.hidden = true;
            refreshAllBtn.hidden = true;
            settingsBtn.hidden = false;
        }

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
        const notamData = localStorage.getItem('notamData') || '{}';

        const payload = {
            action: 'upload',
            password: password,
            gamcUid: gamcUid,
            icaoData: icaoData,
            icaoHistory: icaoHistory,
            savedRoutes: savedRoutes,
            icaoColors: icaoColors,
            notamData: notamData
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
            if (serverData.notamData) {
                localStorage.setItem('notamData', serverData.notamData);
            }

            showResultModal('Загрузка завершена', 'Данные с сервера приняты и сохранены в Local Storage.');
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
        // Если оффлайн режим включён, показываем наше сообщение и уходим
        if (offlineMode) {
            showOfflineAlert();
            return;
        }

        // 1) Определяем, какие аэродромы хотим обновить
        let aerodromesToRefresh = [];

        if (routeSelect.value === 'recent') {
            // Берём все аэродромы, которые ЕСТЬ в localStorage icaoData
            // (или те, что есть в истории). Ниже — вариант с icaoData:
            const savedData = JSON.parse(localStorage.getItem('icaoData') || '{}');
            aerodromesToRefresh = Object.keys(savedData);
            // Если хотите брать из истории, то вместо этого
            // можно aerodromesToRefresh = JSON.parse(localStorage.getItem(ICAO_HISTORY_KEY) || '[]');
        } else {
            // Иначе выбрана "маршрут"
            const idx = parseInt(routeSelect.value, 10);
            const route = savedRoutes[idx];
            if (route) {
                aerodromesToRefresh = [
                    route.departure,
                    route.arrival,
                    ...route.alternates
                ];
            }
        }

        // Убираем дубли, фильтруем 4-буквенные
        aerodromesToRefresh = aerodromesToRefresh
            .filter(x => x && x.length === 4)
            .filter((value, index, arr) => arr.indexOf(value) === index);

        // Если совсем нет аэродромов, просто alert
        if (aerodromesToRefresh.length === 0) {
            alert('Нет сохранённых аэродромов для обновления!');
            return;
        }

        // 2) Показываем confirmModal: "Вы уверены, X аэродромов?"
        const count = aerodromesToRefresh.length;
        const title = 'Обновление информации';
        const msg = `Обновить данные для ${count} аэродромов?`;

        showConfirmModal(
            title,
            msg,
            (isLoadNotam) => {
                // Если нажали "Да" — запускаем пакетное обновление
                startBatchRefresh(aerodromesToRefresh, true, isLoadNotam);
            },
            "",
            "",
            true
        );
    }

    async function startBatchRefresh(aerodromes, loadMeteo, isLoadNotam) {
        showBatchRefreshModal();
        if (loadMeteo) {
            const total = aerodromes.length;
            batchRefreshInfo.textContent = `Аэродромов: ${total}`;
            batchRefreshProgress.style.width = '0%';
            batchRefreshCurrentIcao.textContent = '...';

            const batchSize = 10; // количество запросов одновременно
            for (let i = 0; i < total; i += batchSize) {
                // Берём батч из 10 аэродромов (или меньше, если оставшихся меньше 10)
                const batch = aerodromes.slice(i, i + batchSize);
                // Обновляем текущий статус: показываем аэродромы из текущего батча
                batchRefreshCurrentIcao.textContent = `Обновление метео: ${batch.join(', ')}`;

                // Отправляем запросы асинхронно в рамках батча и ждем, пока все завершатся
                // await Promise.all(batch.map(icao => getWeather(icao, true, true)));
                for (let i = 0; i < batch.length; i++) {
                    await getWeather(batch[i], true, true);
                }
                // Обновляем прогресс
                const percent = Math.round(((i + batch.length) / total) * 100);
                batchRefreshProgress.style.width = percent + '%';

                // Небольшая задержка между батчами для плавности (необязательно)
                await new Promise(r => setTimeout(r, 400));
            }
            batchRefreshProgress.style.width = '100%';
            batchRefreshCurrentIcao.textContent = 'Завершено обновление метео';

            // Делаем паузу на 1 секунду
            await new Promise(resolve => setTimeout(resolve, 1000));
        }


        if (isLoadNotam) {
            // Получаем список обновленных аэродромов за последние 3 часа.
            const icaoRecentlyUpdatedNotam = getIcaoListUpdatedNotams(3600000 * 3)

            let aerodromesToUpdate = []
            aerodromes.forEach(i => {
                if (!icaoRecentlyUpdatedNotam.includes(i)) {
                    aerodromesToUpdate.push(i)
                }
            })
            const total = aerodromesToUpdate.length;

            const batchNotamSize = 2;
            const failedAttempts = 3;

            batchRefreshInfo.textContent = `Аэродромов: ${total}`;
            batchRefreshProgress.style.width = '0%';
            batchRefreshCurrentIcao.textContent = '...';

            let updatedNow = 0;
            let failedUpdated = [];

            while (aerodromesToUpdate.length > 0) {
                // Берём батч из 10 аэродромов (или меньше, если оставшихся меньше 10)
                const batch = aerodromesToUpdate.slice(0, batchNotamSize);

                if (batch.length === 0) {
                    break;
                }

                // Обновляем текущий статус: показываем аэродромы из текущего батча
                batchRefreshCurrentIcao.textContent = `Обновление NOTAM: ${batch.join(', ')}`;

                // Отправляем запросы асинхронно в рамках батча и ждем, пока все завершатся
                const results = await Promise.all(batch.map(icao => getNotam(icao)));
                // Удаляем из aerodromesToUpdate все аэродромы, которые в results
                aerodromesToUpdate = aerodromesToUpdate.filter(icao => !results.includes(icao));

                updatedNow = total - aerodromesToUpdate.length;
                // Заносим в failedUpdated те, которые есть в batch, но нет в results.
                failedUpdated = failedUpdated.concat(batch.filter(icao => !results.includes(icao)));
                
                // Если в failedUpdated аэродром повторяется failedAttempts раз, то удаляем их из aerodromesToUpdate.
                const failedCount = {};
                failedUpdated.forEach(icao => {
                    failedCount[icao] = (failedCount[icao] || 0) + 1;
                });

                // Удаляем аэродромы из aerodromesToUpdate, если они повторяются failedAttempts раз в failedUpdated
                aerodromesToUpdate = aerodromesToUpdate.filter(icao => !(failedCount[icao] >= failedAttempts));

                // Обновляем прогресс
                const percent = Math.round((updatedNow / total) * 100);
                batchRefreshProgress.style.width = percent + '%';

                // Небольшая задержка между батчами для плавности (необязательно)
                await new Promise(r => setTimeout(r, 1000));
            }

            batchRefreshProgress.style.width = '100%';
            batchRefreshCurrentIcao.textContent = `Обновлено NOTAM: ${updatedNow} из ${total}`;
        }

        updateHistoryBtnNotam();

        setTimeout(() => {
            hideBatchRefreshModal();
        }, 1000);
    }

    async function getNotam(icao) {
        const password = localStorage.getItem(PASSWORD_KEY) || '';

        const payload = {
            password: password,
            action: "get_notams",
            icao: icao.toUpperCase()
        };

        try {
            const response = await fetch('https://myapihelper.na4u.ru/gamc_app/api.php', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }

            // Предполагаем, что API возвращает JSON (если нет, замени response.json() на response.text())
            const notams = await response.json();

            // Получаем из localStorage словарь по ключу "notamData" или создаем новый
            let notamData = localStorage.getItem('notamData');
            notamData = notamData ? JSON.parse(notamData) : {};

            if (notams.error) {
                throw new Error(`Не удалось получить NOTAM: ${notams.error}`);
            }

            // Сохраняем полученные NOTAMы вместе с датой обновления под ключом аэродрома
            notamData[icao.toUpperCase()] = {
                data: notams,
                updated: new Date().toISOString()
            };
            localStorage.setItem('notamData', JSON.stringify(notamData));

            return icao;
        } catch (err) {
            console.error('Ошибка при получении NOTAM:', err);
            return null;
        }
    }

    function showBatchRefreshModal() {
        batchRefreshModalBackdrop.classList.add('show');
    }

    function hideBatchRefreshModal() {
        batchRefreshModalBackdrop.classList.remove('show');
    }

    closeBatchRefreshModalBtn.addEventListener('click', () => {
        hideBatchRefreshModal();
    });

    batchRefreshModalBackdrop.addEventListener('click', (e) => {
        if (e.target === batchRefreshModalBackdrop) {
            hideBatchRefreshModal();
        }
    });

    const calcModalBackdrop = document.getElementById('calcModalBackdrop');
    const closeCalcModalBtn = document.getElementById('closeCalcModalBtn');

//    gpsBtn.addEventListener('click', () => {
//        if (!nowIcao) {
//            alert('Сначала введите ICAO аэродрома!');
//            return;
//        }
//        showCalcModal(nowIcao);
//    });

    closeCalcModalBtn.addEventListener('click', hideCalcModal);

    function showCalcModal(icao) {
        // ...
        const runwaySelect = document.getElementById('runwaySelect');
        const taxiwaySelect = document.getElementById('taxiwaySelect');

        // Очищаем
        runwaySelect.innerHTML = '';
        taxiwaySelect.innerHTML = '';

        const airport = airportInfoDb[icao];
        if (!airport || !airport.runways) {
            // ...
            return;
        }

        const runwayList = airport.runways; // { "12": {...}, "30": {...} }
        const directions = Object.keys(runwayList);
        if (!directions.length) {
            // ...
            return;
        }

        // Заполним <option> в #runwaySelect
        directions.forEach(dir => {
            const opt = document.createElement('option');
            opt.value = dir;
            opt.textContent = dir;
            runwaySelect.appendChild(opt);
        });

        // Берём первую ВПП по умолчанию
        runwaySelect.value = directions[0];

        // Наполняем #taxiwaySelect (рулёжки) под выбранную ВПП
        updateTaxiways(icao, runwaySelect.value);

        // Отрисовываем
        renderSingleTaxiway(icao, runwaySelect.value, taxiwaySelect.value);

        // Вешаем обработчики:
        runwaySelect.addEventListener('change', () => {
            // Обновляем список РД в taxiwaySelect
            updateTaxiways(icao, runwaySelect.value);
            // И заново рендерим
            renderSingleTaxiway(icao, runwaySelect.value, taxiwaySelect.value);
        });

        taxiwaySelect.addEventListener('change', () => {
            renderSingleTaxiway(icao, runwaySelect.value, taxiwaySelect.value);
        });

        calcModalBackdrop.classList.add('show');
    }

    function updateTaxiways(icao, dir) {
        const airport = airportInfoDb[icao];
        const taxiwaySelect = document.getElementById('taxiwaySelect');
        taxiwaySelect.innerHTML = '';

        if (!airport || !airport.runways[dir]) return;

        const intersections = airport.runways[dir].intersections || {};
        // Object.keys(intersections) -> ["B", "C", "D" ...]
        const keys = Object.keys(intersections).sort(); // сортируем по алфавиту

        keys.forEach(key => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = key;
            taxiwaySelect.appendChild(opt);
        });

        // Если есть хотя бы одна рулёжка, выбираем первую
        if (keys.length) {
            taxiwaySelect.value = keys[0];
        }
    }

    function hideCalcModal() {
        calcModalBackdrop.classList.remove('show');
    }

    // Реализация рендера
    function renderSingleTaxiway(icao, dir, taxiway) {
        const runwayIntersectionsInfo = document.getElementById('runwayIntersectionsInfo');
        const runwaySchematicContainer = document.getElementById('runwaySchematicContainer');

        // Очищаем
        runwayIntersectionsInfo.innerHTML = '';
        runwaySchematicContainer.innerHTML = '';

        const airport = airportInfoDb[icao];
        if (!airport || !airport.runways || !airport.runways[dir]) {
            runwayIntersectionsInfo.textContent = 'Нет данных о ВПП для ' + icao;
            return;
        }

        const runwayData = airport.runways[dir]; // { xlda: 3200, intersections: {...} }
        const intersections = runwayData.intersections || {};

        const headingDegrees = runwayData['hdg'];
        const isEast = (headingDegrees < 180);

        // Если нет такой РД, сообщаем
        if (!intersections[taxiway]) {
            runwayIntersectionsInfo.textContent = `Нет данных для РД ${taxiway}`;
            return;
        }

        // Определяем LDA этой рулёжки
        const lda = intersections[taxiway].LDA;
        const fullLda = runwayData.xlda || 0;

        // Пишем текст
        runwayIntersectionsInfo.innerHTML = `
    <p><strong>LDA RW ${dir}:</strong> ${fullLda} м</p>
    <p><strong>From THR to <b>${taxiway}</b>:</strong> ${lda} м</p>
  `;

        // Высота полосы
        const runwayHeight = 40; // px

        // Рассчитываем пиксели для метки РД
        const offsetPct = Math.round(lda / fullLda * 90) + 5;

        // Генерим HTML для схемы
        // Внутри — "сплошная" полоса, 0м справа, <конец> слева...
        let schemeHtml = '';

        if (isEast) {
            // "Слева → направо": 0м слева, конечная длина справа
            // Самолёт (стрелка) "смотрит" вправо (rotation(0deg))
            schemeHtml = `
        <div class="runway-scheme-wrapper">
            <!-- Подпись 0 м слева -->
            <div class="runway-zero-label" style="left: 15px;">
                0 м
            </div>
            <!-- Подпись полной длины справа -->
            <div class="runway-end-label" style="right: -15px;">
                ${fullLda} м
            </div>

            <!-- Иконка самолёта, направленная вправо -->
            <i class="fa-solid fa-plane landing-arrow"
               style="left: 10%; transform: translate(-50%, -50%) rotate(0deg);">
            </i>

            <!-- Маркер рулёжки -->
            <div class="taxiway-marker" style="left: ${offsetPct}%;"></div>
            <div class="taxiway-marker-label" style="left: ${offsetPct}%; top: 48px;">
                <b>${taxiway}</b> (${lda} м)
            </div>
        </div>
    `;
        } else {
            // "Справа → налево" (как было раньше): 0м справа, конечная длина слева
            // Самолёт (стрелка) «смотрит» влево (rotation(180deg))
            const taxiwayLabelPct = (offsetPct - 10) <= 75 ? (offsetPct - 10) : 75;
            schemeHtml = `
        <div class="runway-scheme-wrapper">
            <div class="runway-zero-label" style="right: -10px;">
                0 м
            </div>
            <div class="runway-end-label" style="left: 25px;">
                ${fullLda} м
            </div>

            <i class="fa-solid fa-plane landing-arrow"
               style="left: 90%; transform: translate(-50%, -50%) rotate(180deg);">
            </i>

            <div class="taxiway-marker" style="right: ${offsetPct}%;"></div>
            <div class="taxiway-marker-label" style="right: ${taxiwayLabelPct}%;">
                <b>${taxiway}</b> (${lda} м)
            </div>
        </div>
    `;
        }
        runwaySchematicContainer.innerHTML = schemeHtml;
    }

    const switchBtn = document.getElementById('switchMenuBtn');
    switchBtn.addEventListener('click', () => {
        showSecondMenu = !showSecondMenu;
        localStorage.setItem('showSecondMenu', JSON.stringify(showSecondMenu));
        updateMenuShow();
    });


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

    // Найдите сразу после других обработчиков внутри document.addEventListener('DOMContentLoaded', ...)
    const gpsModalBackdrop = document.getElementById('gpsModalBackdrop');
    const gpsIframe = document.getElementById('gpsIframe');
    const closeGpsModalBtn = document.getElementById('closeGpsModalBtn');
    
    gpsBtn.addEventListener('click', () => {
        // Устанавливаем адрес в iframe
        const now = new Date();
        const yesterday = new Date(now.getTime() - 86400000); // 86400000 мс = 24 часа
        const year = yesterday.getFullYear();
        const month = String(yesterday.getMonth() + 1).padStart(2, '0');
        const day = String(yesterday.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const airport = airportInfoDb[nowIcao];
        gpsIframe.src = `https://gpsjam.org/?lat=${airport.latitude}&lon=${airport.longitude}&z=7&date=${dateStr}`;

        // Показываем модальное окно, добавляя класс "show"
        gpsModalBackdrop.classList.add('show');
    });
    
    closeGpsModalBtn.addEventListener('click', () => {
        // Скрываем модальное окно и очищаем src, чтобы остановить загрузку сайта
        gpsModalBackdrop.classList.remove('show');
        gpsIframe.src = "";
    });

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

    function updateNotamButton() {
        const notamBtn = document.getElementById('notamBtn');
        if (notamBtn) {
            if (hasNotamsForIcao(nowIcao)) {
                notamBtn.classList.toggle('badge-default', true);
                notamBtn.classList.toggle('badge-red', false);
            } else {
                notamBtn.classList.toggle('badge-default', false);
                notamBtn.classList.toggle('badge-red', true);
            }
        }
    }

    loadNotamBtn.addEventListener('click', async () => {
        notamModalBackdrop.classList.remove('show');
        const nowIcaoList = [nowIcao];
        await startBatchRefresh(nowIcaoList, false, true);
        updateNotamButton();
    });

    updateMenuShow();
    setInterval(updateBadgesTimeAndColors, 15000);
});