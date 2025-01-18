// Инициализация переменной offlineMode из localStorage или по умолчанию
let offlineMode = JSON.parse(localStorage.getItem('offlineMode')) || false;
// Автоматическое изменение режима в offline, если отсутствует соединение
let autoGoOffline = JSON.parse(localStorage.getItem('autoGoOffline')) || true;
let doHighlight = JSON.parse(localStorage.getItem('doHighlight')) || false;

// Maintenance support for B737 is provided in the following airports (29 NOV 24)
const airportCodes = [
    "UAAA", "UBBB", "UDYZ", "UEEE",
    "UHWW", "UIII", "ULAA", "ULLI", "ULMM", "UMKK", "UMMS", "UNBG", "UNKL", "UNNT", "UNOO",
    "URMG", "URML", "URMM", "URSS", "URWW", "USII", "USPP", "USRR", "USSS", "USTR", "UTTT",
    "UUYY", "UWGG", "UWKD", "UWOO", "UWUU", "UWWW", "HECA", "HEGN", "HESH", "LTAI", "LTFM",
    "OMAA", "OMDB", "OMDW", "VTBS", "ZJSY"
];

let nowIcao = null;

// Ключи для localStorage
const PASSWORD_KEY = 'gamcPassword';
const ICAO_HISTORY_KEY = 'icaoHistory';

document.addEventListener('DOMContentLoaded', () => {
    // Селекторы
    const icaoInput = document.getElementById('icao');
    const fetchBtn = document.getElementById('fetchBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const resetPasswordBtn = document.getElementById('resetPasswordBtn');
    const removeSavedIcaosBtn = document.getElementById('removeSavedIcaos');
    const responseContainer = document.getElementById('responseContainer');
    const historyContainer = document.getElementById('historyContainer');
    const timeBadgeContainer = document.getElementById('timeBadgeContainer');

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
        } else {
            fetchBtn.disabled = true;
        }
    }

    icaoInput.addEventListener('input', () => {
        // Удаляем все символы, кроме английских букв, и преобразуем оставшееся в верхний регистр
        icaoInput.value = icaoInput.value.replace(/[^A-Za-z]/g, '').toUpperCase();
        updateFetchBtn();
    });

    departureIcaoInput.addEventListener('input', () => {
        // Удаляем все символы, кроме английских букв, и преобразуем оставшееся в верхний регистр
        departureIcaoInput.value = departureIcaoInput.value.replace(/[^A-Za-z]/g, '').toUpperCase();
    });

    arrivalIcaoInput.addEventListener('input', () => {
        // Удаляем все символы, кроме английских букв, и преобразуем оставшееся в верхний регистр
        arrivalIcaoInput.value = arrivalIcaoInput.value.replace(/[^A-Za-z]/g, '').toUpperCase();
    });

    alternatesIcaoInput.addEventListener('input', () => {
        // Удаляем все символы, кроме английских букв, и преобразуем оставшееся в верхний регистр
        alternatesIcaoInput.value = alternatesIcaoInput.value.replace(/[^A-Za-z| ]/g, '').toUpperCase();
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
    async function getWeather(icao, isRefresh = false) {
        const password = localStorage.getItem(PASSWORD_KEY) || '';
        if (!password) {
            showModal();
            return;
        }

        if (!icao) {
            alert('Введите ICAO!');
            return;
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

        responseContainer.textContent = 'Загрузка...';
        timeBadgeContainer.innerHTML = '';
        removeTimeBadgeContainerBottomGap();

        let toShowOfflineWarning = false;

        // Проверка сохраненных данных
        const savedData = JSON.parse(localStorage.getItem('icaoData') || '{}');
        if ((!navigator.onLine) || offlineMode) {
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

                    // Добавляем классы в зависимости от условий
                    if (diffAbs <= 10) {
                        badge.classList.add('badge-green');
                    } else if ((t === 'METAR' || t === 'SPECI') && diffAbs >= 30) {
                        badge.classList.add('badge-orange');
                    } else if ((t === 'TAF' || t === 'TAF AMD' || t === 'TAF COR' || t === 'TAF RTD') && diffAbs <= 60) {
                        badge.classList.add('badge-green');
                    } else if ((t === 'TAF' || t === 'TAF AMD' || t === 'TAF COR' || t === 'TAF RTD') && diffAbs >= 360) {
                        badge.classList.add('badge-orange');
                    } else {
                        badge.classList.add('badge-default');
                    }

                    // Добавляем плашку в контейнер
                    timeBadgeContainer.appendChild(badge);
                }
            });

            if (airportCodes.includes(icao)) {
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
            responseContainer.innerHTML = finalText;

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
        text = text.replace(/\b([A-Z]{4}\s+SIGMET\s+\d{1})\b/g, '<b>$1</b>');
        text = text.replace(/\b([A-Z]{4}\s+AIRMET\s+\d{1})\b/g, '<b>$1</b>');

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

        // Ищем группы ветра по формату dddff(f)(Ggg)?(MPS|KT)
        //    text = text.replace(/\b(\d{3})(\d{2,3})(G\d{2,3})?(MPS|KT)\b/g, (match, dir, speed, gust, unit) => {
        //        let speedNum = parseInt(speed, 10);
        //        let highlight = false;
        //
        //        if(unit === 'MPS') {
        //            // Проверяем скорость ветра в м/с
        //            if(speedNum >= 15) {
        //                highlight = true;
        //            }
        //            // Проверяем порывы в м/с
        //            else if(gust) {
        //                let gustNum = parseInt(gust.slice(1), 10); // удаляем букву "G"
        //                if(gustNum >= 15) {
        //                    highlight = true;
        //                }
        //            }
        //        } else if(unit === 'KT') {
        //            // Проверяем скорость ветра в узлах
        //            if(speedNum >= 30) {
        //                highlight = true;
        //            }
        //            // Проверяем порывы в узлах
        //            else if(gust) {
        //                let gustNum = parseInt(gust.slice(1), 10);
        //                if(gustNum >= 30) {
        //                    highlight = true;
        //                }
        //            }
        //        }
        //
        //        if(highlight) {
        //            return `<span class="color-purple">${match}</span>`;
        //        }
        //        return match;
        //    });

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
            return `<span class="color-description wind-info ${colorClass}" data-wind="${match}" data-unit="${unit}" data-dir="${dir}" data-speed="${speed}" data-gust="${gust||''}"><span>${match}</span> <i class="fa-solid fa-calculator"></i></span>`;
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
       ИСТОРИЯ 10 ICAO
    ========================= */
    function saveIcaoToHistory(icao) {
        icao = icao.toUpperCase();
        let history = JSON.parse(localStorage.getItem(ICAO_HISTORY_KEY) || '[]');

        // Обновляем массив
        history = history.filter(item => item !== icao);
        history.unshift(icao);
        history = history.slice(0, 10);
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

    /** Скрыть модалку подтверждения */
    function hideConfirmModal() {
        confirmModalBackdrop.classList.remove('show');
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
        } [condition] || "Нет данных";

        const coverageDesc = {
            1: "менее 10% ВПП",
            2: "от 11% до 25% ВПП",
            5: "от 26% до 50% ВПП",
            9: "от 51% до 100% ВПП"
        } [coverage] || "нет данных";

        const depthDesc = depth >= 91 ?
            `${(depth - 90) * 5} см` :
            depth === 0 ?
            "менее 1 мм" :
            `${depth} мм`;

        let frictionDesc = {
            91: "плохой",
            92: "плохой/средний",
            93: "средний",
            94: "средний/хороший",
            95: "хороший"
        } [friction] || "нет данных";

        // Если frictionDesc === "Нет данных" и является числом от 10 до 90
        if (frictionDesc === "нет данных" && friction >= 10 && friction <= 90) {
            frictionDesc = `0.${friction}`;
        }

        return `
            <strong class='strong-header'>Код:</strong> ${runway} / ${info}<br><br>
            <strong>ВПП:</strong> ${runwayDesc}<br>
            <strong>Условия:</strong> ${conditionDesc} (${condition})<br>
            <strong>Степень:</strong> ${coverageDesc} (${coverage})<br>
            <strong>Толщина:</strong> ${depthDesc} (${depth})<br>
            <strong>Коэф. сцепления:</strong> ${frictionDesc} (${friction})
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

    document.addEventListener('click', (e) => {
        const windTarget = e.target.closest('.wind-info');
        if (windTarget) {
            const dir = windTarget.dataset.dir;
            const speed = windTarget.dataset.speed;
            const gust = windTarget.dataset.gust;
            const unit = windTarget.dataset.unit;

            const runwayElems = document.querySelectorAll('.runway-info');
            let content = "";

            if (gust) {
                content += `Ветер: ${dir}° ${parseInt(speed)} <i class="fa-solid fa-wind"></i> ${parseInt(gust.replace('G', ''))} ${unit}<br><br>`;
            } else {
                content += `Ветер: ${dir}° ${parseInt(speed)} ${unit}<br><br>`;
            }

            let uniqueRunways = new Set();
            runwayElems.forEach(elem => {
                const rwy = elem.dataset.runway;
                let rwyNumber = rwy;
                let heading = null;
                let headingOpp = null;
                let reciprocalRunway = rwy; // название обратной ВПП

                if (/[LCR]$/.test(rwyNumber)) {
                    let num = rwyNumber.slice(0, 2);
                    let suffix = rwyNumber.slice(2);
                    let numVal = parseInt(num, 10);

                    // Определяем обратный суффикс
                    let oppSuffix = suffix;
                    if (suffix === 'L') oppSuffix = 'R';
                    else if (suffix === 'R') oppSuffix = 'L';
                    // Для "C" оставляем без изменений

                    let oppNumVal = (numVal + 18) % 36;
                    if (oppNumVal === 0) oppNumVal = 36;
                    heading = numVal * 10;
                    headingOpp = oppNumVal * 10;

                    reciprocalRunway = String(oppNumVal).padStart(2, '0') + oppSuffix;
                } else {
                    let numVal = parseInt(rwyNumber, 10);
                    heading = numVal * 10;
                    let oppNumVal = (numVal + 18) % 36;
                    if (oppNumVal === 0) oppNumVal = 36;
                    headingOpp = oppNumVal * 10;

                    reciprocalRunway = String(oppNumVal).padStart(2, '0');
                }

                let windDir = (dir === 'VRB') ? null : parseInt(dir, 10);
                let windSpeed = parseFloat(speed);
                let windGust = gust ? parseFloat(gust.slice(1)) : null;

                function calcCrosswind(angle, spd) {
                    let rad = (windDir - angle) * Math.PI / 180;
                    return spd * Math.sin(rad);
                }

                function calcLatwind(angle, spd) {
                    let rad = (windDir - angle) * Math.PI / 180;
                    return spd * Math.cos(rad);
                }

                let crossConst = (windDir !== null) ? calcCrosswind(heading, windSpeed) : null;
                let crossGust = (windDir !== null && windGust) ? calcCrosswind(heading, windGust) : null;
                let crossConstOpp = (windDir !== null) ? calcCrosswind(headingOpp, windSpeed) : null;
                let crossGustOpp = (windDir !== null && windGust) ? calcCrosswind(headingOpp, windGust) : null;

                let latConst = (windDir !== null) ? calcLatwind(heading, windSpeed) : null;
                let latGust = (windDir !== null && windGust) ? calcLatwind(heading, windGust) : null;
                let latConstOpp = (windDir !== null) ? calcLatwind(headingOpp, windSpeed) : null;
                let latGustOpp = (windDir !== null && windGust) ? calcLatwind(headingOpp, windGust) : null;

                if (windDir === null) {
                    content += `Ветер переменный`;
                } else {
                    if (closestRunway(windDir, heading, headingOpp) === heading) {

                        if (!uniqueRunways.has(rwy)) {

                            // Добавляем в список уникальных ВПП
                            uniqueRunways.add(rwy);

                            // Формируем вывод для основного направления ВПП
                            content += `<strong>ВПП ${rwy}</strong>: `;
                            if (windDir === null) {
                                content += `Ветер переменный<br><br>`;
                            } else {
                                if (windGust) {
                                    const result = crossConst ?
                                        (crossConst < 0 ?
                                            '' + Math.abs(crossConst).toFixed(0) :
                                            '' + Math.abs(crossConst).toFixed(0)) :
                                        'N/A';
                                    content += `HW: ${latConst.toFixed(1)} <i class="fa-solid fa-wind"></i> ${latGust.toFixed(1)} ${unit}, XW: ${result} <i class="fa-solid fa-wind"></i> ${crossGust ? Math.abs(crossGust).toFixed(1) : 'N/A'} ${unit}<br><br>`;
                                } else {
                                    const result = crossConst ?
                                        (crossConst < 0 ?
                                            '' + Math.abs(crossConst).toFixed(1) :
                                            '' + Math.abs(crossConst).toFixed(1)) :
                                        'N/A';
                                    content += `HW: ${latConst.toFixed(1)} ${unit}, XW: ${result} ${unit}<br><br>`;
                                }
                            }
                        }

                    } else {
                        if (!uniqueRunways.has(reciprocalRunway)) {

                            // Добавляем в список уникальных ВПП
                            uniqueRunways.add(reciprocalRunway);

                            // Формируем вывод для обратного направления с новым названием ВПП
                            content += `<strong>ВПП ${reciprocalRunway}</strong>: `;
                            if (windDir === null) {
                                content += `Ветер переменный<br><br>`;
                            } else {
                                if (windGust) {
                                    const result = crossConst ?
                                        (crossConst < 0 ?
                                            '' + Math.abs(crossConst).toFixed(1) :
                                            '' + Math.abs(crossConst).toFixed(1)) :
                                        'N/A';
                                    content += `HW: ${latConstOpp.toFixed(1)} <i class="fa-solid fa-wind"></i> ${latGustOpp.toFixed(1)} ${unit}, XW: ${result} <i class="fa-solid fa-wind"></i> ${crossGustOpp ? Math.abs(crossGustOpp).toFixed(1) : 'N/A'} ${unit}<br><br>`;
                                } else {
                                    const result = crossConst ?
                                        (crossConst < 0 ?
                                            '' + Math.abs(crossConst).toFixed(1) :
                                            '' + Math.abs(crossConst).toFixed(1)) :
                                        'N/A';
                                    content += `HW: ${latConstOpp.toFixed(1)} ${unit}, XW: ${result} ${unit}<br><br>`;
                                }
                            }
                        }
                    }
                }
            });

            showWindInfoModal(content);
        }
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

    // Установить состояние чекбокса при загрузке
    autoOfflineCheckbox.checked = autoGoOffline; // Установить состояние
    doHighlightCheckbox.checked = doHighlight; // Установить состояние

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
        // Ограничим максимум 10
        alternatesList = alternatesList.slice(0, 10).filter(a => a.length === 4);

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

});