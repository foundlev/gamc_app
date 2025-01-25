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
let showSecondMenu = false;
let icaoKeys = null;

// Ключи для localStorage
const PASSWORD_KEY = 'gamcPassword';
const ICAO_HISTORY_KEY = 'icaoHistory';

const LAST_COUNT = 15;
const SUGGESTIONS_COUNT = 7;

let airportInfoDb = {};

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

document.addEventListener('DOMContentLoaded', () => {
    // Селекторы
    const icaoInput = document.getElementById('icao');
    const fetchBtn = document.getElementById('fetchBtn');
    const calcBtn = document.getElementById('calcBtn');
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
        nowIcao = null;
    });

    const closeModalBtn = document.getElementById('closeModalBtn');

    closeModalBtn.addEventListener('click', () => {
        hideModal();
    });

    function updateFetchBtn() {
        const icao = icaoInput.value.trim().toUpperCase();

        if (nowIcao && nowIcao === icao && icao.length === 4) {
            fetchBtn.innerHTML = '<i class="fas fa-sync-alt"></i>Обновить';
        } else {
            fetchBtn.innerHTML = '<i class="fas fa-cloud-download-alt"></i>Запросить';
        }

        if (icao.length === 4) {
            fetchBtn.disabled = false;
            calcBtn.disabled = false;
            airportSettingsBtn.disabled = false;
        } else {
            fetchBtn.disabled = true;
            calcBtn.disabled = true;
            airportSettingsBtn.disabled = true;
        }
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
        } else {
            responseContainer.textContent = 'Загрузка...';
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
            let rawData = null;
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
                return;
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
                let type = '';
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
            timeBadgeContainer.appendChild(utcBadge);
            addTimeBadgeContainerBottomGap();

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

                    // Добавляем плашку в контейнер
                    timeBadgeContainer.appendChild(badge);
                }
            });

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

                timeBadgeContainer.appendChild(maintenanceBadge);
            }

            finalText = insertLineBreaks(finalText);
            if (doHighlight) {
                finalText = highlightKeywords(finalText);
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

        } catch (err) {
            responseContainer.textContent = 'Ошибка при запросе: ' + err;
        }
    }

    /**
     * Функция, которая подменяет ключевые слова на HTML-теги
     * (bold или underline).
     */


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

    function highlightKeywords(text) {
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
            let colorClass = '';

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

        // Распознавание и выделение информации о ВПП с учётом буквенного суффикса (L, C, R)
        text = text.replace(/\bR(\d{2}[LCR]?)\/([0-9/]{6,})(?=[^0-9/]|$)/g, (match, rwy, info) => {
            if (/^\/{6,}$/.test(info)) return match; // Пропускаем информацию, состоящую только из слэшей

            // Добавляем всплывающее окно с информацией
            return `<span class="color-description runway-info" data-runway="${rwy}" data-info="${info}">${match} <i class="fa fa-info-circle" aria-hidden="true"></i></span>`;
        });

        // Распознавание и выделение информации о ветре
        text = text.replace(/\b((\d{3})\d{2,3}(?:G\d{2,3})?(?:MPS|KT))\b/g, (match) => {
            let pattern = /^(\d{3})(\d{2,3})(G\d{2,3})?(MPS|KT)$/;
            let m = match.match(pattern);
            if (!m) return match;
            let [, dir, speed, gust, unit] = m;
            let highlight = false;
            let speedNum = parseInt(speed, 10);
            if (unit === 'MPS') {
                if (speedNum >= 15) highlight = true;
                else if (gust) {
                    let gustNum = parseInt(gust.slice(1), 10);
                    if (gustNum >= 15) highlight = true;
                }
            } else if (unit === 'KT') {
                if (speedNum >= 30) highlight = true;
                else if (gust) {
                    let gustNum = parseInt(gust.slice(1), 10);
                    if (gustNum >= 30) highlight = true;
                }
            }
            let colorClass = highlight ? "color-purple" : "";
            return `<span class="color-description wind-info ${colorClass}" data-wind="${match}" data-unit="${unit}" data-dir="${dir}" data-speed="${speed}" data-gust="${gust||''}"><span>${match}</span> <i class="fa-solid fa-wind"></i></span>`;
        });

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
        nowIcao = icao;
        updateFetchBtn();
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
            btn.addEventListener('click', () => {
                icaoInput.value = icao;
                nowIcao = icao;
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

    /**
     * Показывает модалку подтверждения с заголовком, сообщением и коллбэком,
     * который вызывается по нажатию "Да".
     */
    function showConfirmModal(title, message, onYes, onYesBgColor = "", onNoBgColor = "") {
        confirmModalTitle.textContent = title;
        confirmModalMessage.textContent = message;

        // При нажатии на "Да" выполняем нужное действие
        confirmYesBtn.onclick = () => {
            hideConfirmModal();
            onYes(); // вызываем переданный коллбэк
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

    function closestRunway(windDirInt, heading, headingOpp) {
        // Функция для расчета минимальной разницы углов
        function angularDifference(angle1, angle2) {
            const diff = Math.abs(angle1 - angle2) % 360;
            return diff > 180 ? 360 - diff : diff;
        }

        // Разница между направлением ветра и курсами ВПП
        const diffHeading = angularDifference(windDirInt, heading);
        const diffHeadingOpp = angularDifference(windDirInt, headingOpp);

        // Определение ближайшего курса
        return diffHeading <= diffHeadingOpp ? heading : headingOpp;
    }

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

        const dir = windTarget.dataset.dir;       // напр. "120"
        const speed = windTarget.dataset.speed;   // напр. "06"
        const gust = windTarget.dataset.gust;     // напр. "G12" или пусто
        const unit = windTarget.dataset.unit;     // "MPS" или "KT"

        // Формируем шапку контента (ветер, порывы)
        let content = "";
        if (gust) {
            content += `Ветер: ${dir}° ${parseInt(speed)} <i class="fa-solid fa-wind"></i> ${parseInt(gust.replace('G',''))} ${unit}<br><br>`;
        } else {
            content += `Ветер: ${dir}° ${parseInt(speed)} ${unit}<br><br>`;
        }

        // Если current ICAO не задан или база не загружена, покажем предупреждение
        if (!nowIcao || !airportInfoDb[nowIcao] || !airportInfoDb[nowIcao].runways) {
            content += "Нет данных о ВПП в airportInfoDb для " + nowIcao;
            showWindInfoModal(content);
            return;
        }

        // Приводим ветер к числу (windDir может быть null, если VRB)
        let windDirNum = (dir === 'VRB') ? null : parseInt(dir, 10);
        let windSpeed = parseFloat(speed);
        let windGust = gust ? parseFloat(gust.slice(1)) : null;

        // Вспомогательные функции
        function calcCrosswind(angle, spd) {
            let rad = (windDirNum - angle) * Math.PI / 180;
            return spd * Math.sin(rad);
        }
        function calcHeadwind(angle, spd) {
            let rad = (windDirNum - angle) * Math.PI / 180;
            return spd * Math.cos(rad);
        }

        // Перебираем все ВПП из базы
        let uniqueRunways = new Set();
        for (const [rwyName, rwyData] of Object.entries(airportInfoDb[nowIcao].runways)) {
            // Достаём курс
            const heading = rwyData.hdg;

            // Ищем «обратную» полосу
            const oppName = findOppositeRunway(nowIcao, rwyName);
            let headingOpp = airportInfoDb[nowIcao].runways[oppName]?.hdg || heading;

            // Если ветер переменный (VRB), добавим соответствующий текст 1 раз
            if (windDirNum === null) {
                // Чтобы не дублировать «Ветер переменный» на каждую ВПП — если нужно, можно
                // вывести один раз и прерваться, либо вывести для всех.
                if (!uniqueRunways.has('VRB-shown')) {
                    content += `Ветер переменный<br><br>`;
                    uniqueRunways.add('VRB-shown');
                }
                continue;
            }

            // Определяем, какой курс ближе к ветру
            let chosenHeading = closestRunway(windDirNum, heading, headingOpp);
            // Если chosenHeading === heading, значит «прямая» ВПП, иначе — «обратка» (oppName)
            // Для удобства запомним, с каким названием ВПП мы работаем
            let chosenRwyName = (chosenHeading === heading) ? rwyName : oppName;

            // Чтобы не показывать одну и ту же ВПП несколько раз, ставим проверку
            // (к примеру, если выяснилось, что oppName = rwyName (редко, но бывает))
            if (uniqueRunways.has(chosenRwyName)) {
                continue;
            }
            uniqueRunways.add(chosenRwyName);

            // Считаем попутную/боковую составляющие
            let crosswindMain = calcCrosswind(chosenHeading, windSpeed);
            let crosswindGust = (windGust) ? calcCrosswind(chosenHeading, windGust) : null;
            let headwindMain = calcHeadwind(chosenHeading, windSpeed);
            let headwindGust = (windGust) ? calcHeadwind(chosenHeading, windGust) : null;

            // Формируем вывод
            content += `<strong>ВПП ${chosenRwyName}</strong>: `;

            // Сначала headwind
            if (windGust) {
                const xwConst = crosswindMain ? Math.abs(crosswindMain).toFixed(1) : 'N/A';
                const xwGust = crosswindGust ? Math.abs(crosswindGust).toFixed(1) : 'N/A';
                content += `HW: ${headwindMain.toFixed(1)} <i class="fa-solid fa-wind"></i> ${headwindGust.toFixed(1)} ${unit}, `;
                content += `XW: ${xwConst} <i class="fa-solid fa-wind"></i> ${xwGust} ${unit}<br><br>`;
            } else {
                const xwConst = crosswindMain ? Math.abs(crosswindMain).toFixed(1) : 'N/A';
                content += `HW: ${headwindMain.toFixed(1)} ${unit}, XW: ${xwConst} ${unit}<br><br>`;
            }
        }

        // Показываем готовое
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
        } else {
            offlineToggleBtn.classList.add('online');
            offlineToggleBtn.classList.remove('offline');
            offlineToggleBtn.innerHTML = '<i class="fa-solid fa-signal"></i>';
        }
    }

    // Первоначальное обновление кнопки при загрузке
    updateOfflineButton();

    // Обработчик клика по кнопке для переключения режима
    offlineToggleBtn.addEventListener('click', () => {
        offlineMode = !offlineMode;
        localStorage.setItem('offlineMode', JSON.stringify(offlineMode));
        updateOfflineButton();
    });

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
    }
    closeAddRouteModalBtn.addEventListener('click', hideAddRouteModal);

    saveRouteBtn.addEventListener('click', () => {
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

    function renderRoutesInSelect() {
        // Очистим все <option> сначала
        routeSelect.innerHTML = '';

        // 1) «Недавние»
        // Иконка font-awesome "clock-rotate-left" = "\f017"
        let recentOption = document.createElement('option');
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

        // Всегда оставляем «Недавние» выбранным по умолчанию (если нужно)
        routeSelect.value = 'recent';
    }
    renderRoutesInSelect();

    routeSelect.addEventListener('change', () => {
        const selectedValue = routeSelect.value;

        if (selectedValue === 'recent') {
            // Показываем "Недавние"
            renderHistory();
            return;
        }

        if (selectedValue === 'add') {
            // Показываем модалку
            showAddRouteModal();
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
                nowIcao = icao;
                getWeather(icao, false);
                updateFetchBtn();
            });
            historyContainer.appendChild(btn);
        });
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

        if (iata) {
            codesElem.textContent = `${icao}/${iata}`;
        } else {
            codesElem.textContent = icao;
        }

        container.style.display = 'flex';
    }

    function updateMenuShow() {
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const airportSettingsBtn = document.getElementById('airportSettingsBtn');
        const refreshAllBtn = document.getElementById('refreshAllBtn');
        const settingsBtn = document.getElementById('settingsBtn');
        const offlineToggleBtn = document.getElementById('offlineToggleBtn');

        if (showSecondMenu) {
            zoomInBtn.hidden = true;
            zoomOutBtn.hidden = true;
            airportSettingsBtn.hidden = false;
            calcBtn.hidden = false;
            aiBtn.hidden = false;
            refreshAllBtn.hidden = false;
            settingsBtn.hidden = true;
            offlineToggleBtn.hidden = true;
        } else {
            zoomInBtn.hidden = false;
            zoomOutBtn.hidden = false;
            airportSettingsBtn.hidden = true;
            calcBtn.hidden = true;
            aiBtn.hidden = true;
            refreshAllBtn.hidden = true;
            settingsBtn.hidden = false;
            offlineToggleBtn.hidden = false;
        }

    }

    document.getElementById('icaoSuggestions').addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        const selectedIcao = li.dataset.icao;
        if (!selectedIcao) return;

        // Проставляем в input
        icaoInput.value = selectedIcao;
        nowIcao = selectedIcao;
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
        if (depValid && arrValid && altValid) {
            saveRouteBtn.disabled = false;
        } else {
            saveRouteBtn.disabled = true;
        }
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
        const title = 'Подтверждение';
        const msg = `Обновить метео для ${count} аэродромов?`;

        showConfirmModal(
            title,
            msg,
            () => {
                // Если нажали "Да" — запускаем пакетное обновление
                startBatchRefresh(aerodromesToRefresh);
            }
        );
    }

    async function startBatchRefresh(aerodromes) {
        // Показываем модалку прогресса
        showBatchRefreshModal();

        batchRefreshInfo.textContent = `Аэродромов: ${aerodromes.length}`;
        batchRefreshProgress.style.width = '0%';
        batchRefreshCurrentIcao.textContent = '...';

        for (let i = 0; i < aerodromes.length; i++) {
            const icao = aerodromes[i];
            // Обновляем прогресс (в %)
            const percent = Math.round(((i) / aerodromes.length) * 100);
            batchRefreshProgress.style.width = percent + '%';

            // Показываем текущий ICAO
            batchRefreshCurrentIcao.textContent = `Обновляется: ${icao || '...'}`;

            // Асинхронно вызываем getWeather(icao, true), но не отключаем offlineMode
            // потому что в offline смысла нет? Считаем, что getWeather всё же сходит в сеть
            await getWeather(icao, /* isRefresh = */ true, /* silent = */ true);

            // Небольшая задержка, чтобы анимация прогресса успевала отображаться
            // (необязательно)
            await new Promise(r => setTimeout(r, 400));
        }

        // Финальная установка 100%
        batchRefreshProgress.style.width = '100%';
        batchRefreshCurrentIcao.textContent = `Готово!`;

        // Например, через 1 секунду — закрываем модалку
        setTimeout(() => {
            hideBatchRefreshModal();
        }, 1000);
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

    calcBtn.addEventListener('click', () => {
        if (!nowIcao) {
            alert('Сначала введите ICAO аэродрома!');
            return;
        }
        showCalcModal(nowIcao);
    });

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
        updateMenuShow();
    });

    setInterval(updateBadgesTimeAndColors, 15000);
});