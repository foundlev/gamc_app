// Проверка отсутствия интернета
const checkLostConnection = false;

let nowIcao = null;

// Ключи для localStorage
const PASSWORD_KEY = 'gamcPassword';
const ICAO_HISTORY_KEY = 'icaoHistory';

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

/* =========================
   ИНИЦИАЛИЗАЦИЯ
========================= */
document.addEventListener('DOMContentLoaded', () => {
    const savedPassword = localStorage.getItem(PASSWORD_KEY);
    if (!savedPassword) {
        showModal();
    } else {
        hideModal();
    }
    renderHistory();
});

function getGamcUID() {
    let gamcUid = localStorage.getItem('gamcUid');
    if (!gamcUid) {
        gamcUid = generateUID();
        localStorage.setItem('gamcUid', gamcUid);
    }
    return gamcUid;
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
    updateFetchBtn();
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
}

function showOfflineWarningNoInfo() {
    const warning = document.createElement('div');
    warning.className = 'offline-warning-no-info';
    warning.innerHTML = `
        <i class="fa-solid fa-ban"></i>Нет подключения. Нет сохраненных данных.
    `;
    timeBadgeContainer.insertAdjacentElement('afterend', warning);
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

    // Проверка сохраненных данных
    const savedData = JSON.parse(localStorage.getItem('icaoData') || '{}');
    if ((!navigator.onLine) || checkLostConnection) {
        if (savedData[icao]) {
            showOfflineWarning(); // Показать предупреждение
            responseContainer.innerHTML = savedData[icao];
            return;
        } else {
            showOfflineWarningNoInfo(); // Показать предупреждение
            responseContainer.innerHTML = 'Нет данных.';
            return;
        }
    }

    try {
        const res = await fetch(url);
        let rawData = await res.text();
        rawData = rawData.replaceAll('<br>', ' ');

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

        const nowUTC = new Date();
        const hhUTC = String(nowUTC.getUTCHours()).padStart(2, '0');
        const mmUTC = String(nowUTC.getUTCMinutes()).padStart(2, '0');

        const utcBadge = document.createElement('div');
        utcBadge.className = 'time-badge';
        utcBadge.textContent = `UTC ${hhUTC}:${mmUTC}`;

        // Добавляем в контейнер первым
        timeBadgeContainer.appendChild(utcBadge);

        blockObjects.forEach(obj => {
            const re = /^(TAF|TAF AMD|TAF COR|METAR|SPECI)\s+[A-Z]{4}\s+(\d{6})Z/i;
            const match = obj.text.match(re);
            if (match) {
                const t = match[1].toUpperCase(); // METAR / SPECI / TAF / TAF AMD / TAF COR
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
                } else if ((t === 'TAF' || t === 'TAF AMD' || t === 'TAF COR') && diffAbs <= 60) {
                    badge.classList.add('badge-green');
                } else if ((t === 'TAF' || t === 'TAF AMD' || t === 'TAF COR') && diffAbs >= 360) {
                    badge.classList.add('badge-orange');
                } else {
                    badge.classList.add('badge-default');
                }

                // Добавляем плашку в контейнер
                timeBadgeContainer.appendChild(badge);
            }
        });

        // ========= Добавляем HTML-выделение =========
        //  1) слова TEMPO, BECMG, PROB40, PROB30, FMXXXXXX (подчёркивание)
        //  2) "METAR LTAI 111030Z" или "SPECI ...", а также "TAF" - делаем жирным
        finalText = insertLineBreaks(finalText);
        finalText = highlightKeywords(finalText);

        if (!finalText.includes("НЕТ В КАТАЛОГЕ,ОБРАЩАЙТЕСЬ К СИНОПТИКУ=")) {
            // Сохраняем icao, если нужно
            if (!isRefresh && icao.length === 4) {
                saveIcaoToHistory(icao);
            }

            // Сохранение finalText в localStorage
            if (icao && finalText) {
                const savedData = JSON.parse(localStorage.getItem('icaoData') || '{}');
                savedData[icao] = finalText;
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
function highlightWind(text) {
    // Ищем группы ветра по формату dddff(f)(Ggg)?(MPS|KT)
    return text.replace(/\b(\d{3})(\d{2,3})(G\d{2,3})?(MPS|KT)\b/g, (match, dir, speed, gust, unit) => {
        let speedNum = parseInt(speed, 10);
        let highlight = false;

        if(unit === 'MPS') {
            // Проверяем скорость ветра в м/с
            if(speedNum >= 15) {
                highlight = true;
            }
            // Проверяем порывы в м/с
            else if(gust) {
                let gustNum = parseInt(gust.slice(1), 10); // удаляем букву "G"
                if(gustNum >= 15) {
                    highlight = true;
                }
            }
        } else if(unit === 'KT') {
            // Проверяем скорость ветра в узлах
            if(speedNum >= 30) {
                highlight = true;
            }
            // Проверяем порывы в узлах
            else if(gust) {
                let gustNum = parseInt(gust.slice(1), 10);
                if(gustNum >= 30) {
                    highlight = true;
                }
            }
        }

        if(highlight) {
            return `<span class="color-purple">${match}</span>`;
        }
        return match;
    });
}

function highlightCloudBase(text) {
    // Ищем групп облачности типа BKN или OVC с указанием высоты, например, BKN020 или OVC100
    return text.replace(/\b(OVC|BKN)(\d{3})\b/g, (match, type, heightStr) => {
        let height = parseInt(heightStr, 10);
        let colorClass = '';

        if (height < 2) {
            colorClass = 'color-darkred';
        } else if (height >= 2 && height <= 4 ) {
            colorClass = 'color-red';
        } else if (height >= 5 && height <= 10 ) {
            colorClass = 'color-yellow';
        } else {
            colorClass = 'color-green';
        }

        return `<span class="${colorClass}">${match}</span>`;
    });
}

function insertLineBreaks(text) {
    // Вставляем перенос строки перед PROB40 и PROB30
    text = text.replace(/\b(PROB40|PROB30)\b/g, '\n$1');

    // Вставляем перенос строки перед FMXXXXXX
    text = text.replace(/\b(FM\d{6})\b/g, '\n$1');

    // Вставляем перенос строки перед TEMPO и BECMG
    // (без проверки на PROBXX для упрощения; для сложной логики потребуются расширенные проверки или lookbehind)
    text = text.replace(/\b(TEMPO|BECMG|RMK|INTER)\b/g, '\n$1');

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
    // LTBB SIGMET 4
    text = text.replace(/\b([A-Z]{4}\s+SIGMET\s+\d{1})\b/g, '<b>$1</b>');
    text = text.replace(/\b([A-Z]{4}\s+AIRMET\s+\d{1})\b/g, '<b>$1</b>');

    // 3) Выделение именно четырехзначных чисел как отдельных слов

    text = text.replace(/(^|\s)(\d{4})(?=$|\s)/g, (match, prefix, numStr) => {
        let num = parseInt(numStr, 10);
        let colorClass = '';
        if(num > 3500) {
            colorClass = 'color-green';
        } else if(num > 1200 && num <= 3500) {
            colorClass = 'color-yellow';
        } else if(num >= 550 && num <= 1200) {
            colorClass = 'color-red';
        } else if(num < 550) {
            colorClass = 'color-darkred';
        }
        return prefix + (colorClass ? `<span class="${colorClass}">${numStr}</span>` : numStr);
    });

    // Выделение CAVOK и NSC зелёным цветом
    text = text.replace(/\b(CAVOK|NSC)\b/g, '<span class="color-green">$1</span>');
    text = text.replace(/\b(WS)\b/g, '<span class="color-purple">$1</span>');

    text = highlightWind(text);
    text = highlightCloudBase(text);

    // Распознавание и выделение информации о ВПП с учётом буквенного суффикса (L, C, R)
    text = text.replace(/\bR(\d{2}[LCR]?)\/(\d{6})\b/g, (match, rwy, info) => {
        if (/^\/{6}$/.test(info)) return match; // Пропускаем пустую информацию

        // Добавляем всплывающее окно с информацией
        return `<span class="color-description runway-info" data-runway="${rwy}" data-info="${info}">${match} <i class="fa fa-info-circle" aria-hidden="true"></i></span>`;
    });

    return text;
}

/* =========================
   ОБРАБОТЧИКИ КНОПОК
========================= */
fetchBtn.addEventListener('click', () => {
    const icao = icaoInput.value.trim().toUpperCase();
    icaoInput.value = icao;
    getWeather(icao, false);
    nowIcao = icao;
    updateFetchBtn();
});

/* =========================
   ИСТОРИЯ 10 ICAO
========================= */
function saveIcaoToHistory(icao) {
    icao = icao.toUpperCase();
    let history = JSON.parse(localStorage.getItem(ICAO_HISTORY_KEY) || '[]');

    history = history.filter(item => item !== icao);
    history.unshift(icao);
    history = history.slice(0, 10);

    localStorage.setItem(ICAO_HISTORY_KEY, JSON.stringify(history));
    renderHistory();
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

document.addEventListener('DOMContentLoaded', () => {
    const savedZoom = parseFloat(localStorage.getItem('pageZoom') || 1);
    updateZoom(savedZoom); // Восстанавливаем масштаб из localStorage
});

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
function showConfirmModal(title, message, onYes) {
    confirmModalTitle.textContent = title;
    confirmModalMessage.textContent = message;

    // При нажатии на "Да" выполняем нужное действие
    confirmYesBtn.onclick = () => {
        hideConfirmModal();
        onYes(); // вызываем переданный коллбэк
    };

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
        'Удаление сохранённых ICAO',
        'Вы действительно хотите удалить все сохранённые аэродромы?',
        () => {
            // Действие, если пользователь подтвердил
            localStorage.removeItem(ICAO_HISTORY_KEY);
            localStorage.removeItem('icaoData');
            location.reload();
        }
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
        }
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
    }[condition] || "Нет данных";

    const coverageDesc = {
        1: "менее 10% ВПП",
        2: "от 11% до 25% ВПП",
        5: "от 26% до 50% ВПП",
        9: "от 51% до 100% ВПП"
    }[coverage] || "нет данных";

    const depthDesc = depth >= 91
        ? `${(depth - 90) * 5} см`
        : depth === 0
            ? "менее 1 мм"
            : `${depth} мм`;

    let frictionDesc = {
        91: "плохой",
        92: "плохой/средний",
        93: "средний",
        94: "средний/хороший",
        95: "хороший"
    }[friction] || "нет данных";

    // Если frictionDesc === "Нет данных" и является числом от 10 до 90
    if (frictionDesc === "нет данных" && friction >= 10 && friction <= 90) {
        frictionDesc = `0.${friction}`;
    }

    return `
        <strong class='strong-header'>Код:</strong> ${runway} / ${info}<br><br>
        <strong>ВПП:</strong> ${runway}<br>
        <strong>Условия покрытия:</strong> ${conditionDesc} (${condition})<br>
        <strong>Степень покрытия:</strong> ${coverageDesc} (${coverage})<br>
        <strong>Толщина покрытия:</strong> ${depthDesc} (${depth})<br>
        <strong>Коэффициент сцепления:</strong> ${frictionDesc} (${friction})
    `;
}

// Обработчик клика по элементам информации о ВПП
document.addEventListener('click', (e) => {
    const target = e.target.closest('.runway-info');
    if (target) {
        const runway = target.dataset.runway;
        const info = target.dataset.info;
        const content = decodeRunwayInfo(runway, info);
        showRunwayInfoModal(content);
    }
});