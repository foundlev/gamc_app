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

    const url = `https://myapihelper.na4u.ru/gamc_app/api.php?password=${encodeURIComponent(password)}&icao=${encodeURIComponent(icao)}`;

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
function highlightKeywords(text) {
    // 1) Подчёркиваем TEMPO, BECMG, PROB40, PROB30:
    text = text.replace(/\b(TEMPO|BECMG|PROB40|PROB30)\b/g, '<u>$1</u>');

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