const aiAccessedUid = "LEV737"

function getAiAccess() {
    const currentUid = localStorage.getItem('gamcUid') || '';
    return currentUid && currentUid === aiAccessedUid;
}


// Находим кнопку и модалку для NOTAM
const notamBtn = document.getElementById('notamBtn');
const notamModalBackdrop = document.getElementById('notamModalBackdrop');
const closeNotamModalBtn = document.getElementById('closeNotamModalBtn');
const notamContent = document.getElementById('notamContent');
const notamModal = document.getElementById('notamModalWindow');

const loadNotamBtn = document.getElementById('loadNotamBtn');

let lastNotamIcao = null;
const notamScrollPositions = Object.create(null);
let suppressNotamScrollSave = false;

function restoreNotamScroll(icao) {
    const pos = (icao && notamScrollPositions[icao]) ? notamScrollPositions[icao] : 0;
    if (typeof notamModal.scrollTop === 'number') {
        notamModal.scrollTop = pos;
        requestAnimationFrame(() => { notamModal.scrollTop = pos; });
    }
}

if (notamModal) {
    notamModal.addEventListener('scroll', () => {
        if (nowIcao && !suppressNotamScrollSave) {
            notamScrollPositions[nowIcao] = notamModal.scrollTop;
        }
    });
}

function resetNotamScroll() {
    suppressNotamScrollSave = true;
    // Сбрасываем прокрутку основного скролл-контейнера модалки
    const targets = [notamModal, notamContent, notamModalBackdrop];
    for (const el of targets) {
        if (el) {
            if (typeof el.scrollTop === 'number') el.scrollTop = 0;
            if (typeof el.scrollLeft === 'number') el.scrollLeft = 0;
            if (typeof el.scrollTo === 'function') el.scrollTo(0, 0);
        }
    }
    // снимаем подавление на следующем кадре
    requestAnimationFrame(() => { suppressNotamScrollSave = false; });
}


function getAirportPosition(icaoCode) {
    const airportInfo = airportInfoDb[icaoCode] || {};
    if (!airportInfo.latitude || !airportInfo.longitude) return null;
    return {
        lat: airportInfo.latitude,
        lon: airportInfo.longitude
    };
}

function getNotamsForIcao(icao) {
    const notamData = localStorage.getItem('notamData');

    if (!notamData) return [];
    const parsed = JSON.parse(notamData);
    const key = icao.toUpperCase();

    // Если для данного ICAO существуют данные, возвращаем их, иначе пустой массив
    if (parsed[key] && parsed[key].notams && parsed[key].updated && parsed[key].notams?.length !== 0) {
        return parsed[key].notams;
    }
    return [];
}

function getIcaoListUpdatedNotams(ms=86400000) {
    const notamData = localStorage.getItem('notamData') || "{}";
    const parsed = notamData ? JSON.parse(notamData) : {};
    const updated = [];

    // 86400000 - День
    // 3600000 - Час

    for (const key in parsed) {
        if (parsed[key] && parsed[key].notams && parsed[key].updated && parsed[key].notams?.length !== 0) {
            const updatedDate = new Date(parsed[key].updated * 1000);
            const now = Date.now();

            if (now - updatedDate.getTime() <= ms) {
                updated.push(key);
            }
        }
    }

    return updated;
}

function hasNotamsForIcao(icao) {
    const updatedIcao = getIcaoListUpdatedNotams();
    return updatedIcao.includes(icao.toUpperCase());
}

// Когда нажимаем кнопку "NOTAM", показываем модалку
function showNotamModal() {
    if (!nowIcao) {
        alert('Сначала выберите аэродром');
        return;
    }
    const sameAirport = (nowIcao === lastNotamIcao);
    if (!sameAirport) {
        // новый аэродром — сбрасываем позицию
        resetNotamScroll();
    }
    // Фильтруем из initialNotams только нужные
    // смотрите, у вас ключи могут быть "icao" или "location", используйте одинаково
    let notamsForIcao = []
    if (hasNotamsForIcao(nowIcao)) {
        notamsForIcao = getNotamsForIcao(nowIcao);
    }
    const loadNotamBtn = document.getElementById('loadNotamBtn');

    if (notamsForIcao.length === 0) {
        notamContent.innerHTML = `Нет NOTAMов для <b>${nowIcao}</b>`;
        if (sameAirport) {
            restoreNotamScroll(nowIcao);
        } else {
            resetNotamScroll();
        }
        notamModal.classList.toggle('download-mode', true);
        loadNotamBtn.style.display = 'block';
    } else {
        notamModal.classList.toggle('download-mode', false);
        loadNotamBtn.style.display = 'none';

        let html = '';

        notamsForIcao.forEach(n => {
            // Если у NOTAM вообще нет текста – пропустим
            if (!n.text) return;

            // Подставляем старые или новые поля (что есть).
            // Если поле отсутствует, используем || '' или || null.
            const rawId       = n.raw_id || n.name || '';          // старый n.raw_id или новый n.name
            const cat         = n.ai_category ? getCategoryAppearance(n.ai_category) : null;
            const shortInterp = n.ai_short_interpretation || '';
            const fullInterp  = n.ai_interpretation || '';
            const startTime   = n.startdate || n.from || null;
            const endTime     = n.enddate || n.to   || null;
            const issuedTime  = n.issuedate || n.created || null;
            const isPerm      = !!n.PERM;
            const schedule    = n.schedule || n.SCHEDULE || '';

            // Формируем HTML (учитывая, что какие-то блоки могут быть пустыми)
            html += `
            <div class="notam-item">
        
                <!-- Шапка с номером NOTAM и категорией, если есть -->
                <div class="notam-header">
                    <div class="notam-id-badge">
                        <i class="fas fa-file-alt notam-doc-icon"></i>
                        <span class="notam-id">${rawId}</span>
                    </div>
        
                    ${cat ? `
                    <div class="notam-category" data-category="${n.ai_category}" 
                         style="background: ${cat.background}; color: ${cat.color};">
                        <i class="${cat.icon}" style="color: ${cat.color};"></i>
                        ${n.ai_category}
                    </div>
                    ` : ''}
                </div>
        
                <!-- Короткая интерпретация (если есть) -->
                ${shortInterp ? `
                <div class="notam-short-info">
                    <i class="fa-solid fa-circle-info"></i>
                    ${shortInterp}
                </div>
                ` : ''}
        
                <!-- Подробная интерпретация (если есть) -->
                ${fullInterp ? `
                <div class="notam-interpretation">
                    ${fullInterp}
                </div>
                ` : ''}
        
                <!-- Исходный текст (обязательно заменяем переносы строк) -->
                <div class="notam-raw">${n.text.replace(/\n/g, '<br>')}</div>
        
                <!-- Метаданные (даты/расписание, если есть) -->
                ${(startTime || issuedTime || schedule) ? `
                <div class="notam-meta">
                    ${startTime ? `
                    <span class="notam-period">
                        <i class="fas fa-calendar-alt"></i>
                        ${formatUTCDate(startTime)} -
                        ${isPerm ? 'Постоянный' : formatUTCDate(endTime)}
                    </span>
                    ` : ''}
                
                    ${schedule ? `
                    <span class="notam-schedule">
                        <i class="fa-regular fa-calendar"></i>
                        Расписание: ${schedule}
                    </span>
                    ` : ''}
                
                    ${issuedTime ? `
                    <span>
                        <i class="fas fa-clock"></i>
                        Выпущен: ${formatUTCDate(issuedTime)}
                    </span>
                    ` : ''}
                </div>
                ` : ''}
        
            </div>
            `;
        });

        notamContent.innerHTML = html;
        if (sameAirport) {
            restoreNotamScroll(nowIcao);
        } else {
            resetNotamScroll();
        }
    }

    notamModalBackdrop.classList.add('show');
    if (sameAirport) {
        restoreNotamScroll(nowIcao);
    } else {
        resetNotamScroll();
    }
    requestAnimationFrame(() => {
        if (sameAirport) restoreNotamScroll(nowIcao); else resetNotamScroll();
    });
    setTimeout(() => {
        if (sameAirport) restoreNotamScroll(nowIcao); else resetNotamScroll();
    }, 120);

    lastNotamIcao = nowIcao;
}

function getCategoryAppearance(category) {
    const categories = {
        'Fire and Rescue Services': {
            icon: 'fas fa-fire-extinguisher',
            background: 'var(--col-fire)',
            color: '#fff'
        },
        'Weather Services': {
            icon: 'fas fa-cloud-sun',
            background: 'var(--col-rf)', // Используем синий оттенок
            color: '#fff'
        },
        'Runway Operations': {
            icon: 'fas fa-plane-departure',
            background: 'var(--col-special)',
            color: '#fff'
        },
        'Taxiway Operations': {
            icon: 'fas fa-road',
            background: 'var(--col-operating)',
            color: '#fff'
        },
        'Apron Operations': {
            icon: 'fas fa-square-parking',
            background: 'var(--col-airspace)',
            color: '#000'
        },
        'Airport Maintenance': {
            icon: 'fas fa-toolbox',
            background: 'var(--col-instrument)',
            color: '#fff'
        },
        'Airspace Restrictions': {
            icon: 'fas fa-ban',
            background: 'var(--col-airspace)',
            color: '#fff'
        },
        'Navigation Aid Status': {
            icon: 'fas fa-satellite-dish',
            background: 'var(--col-instrument)',
            color: '#fff'
        },
        'ATS Communication': {
            icon: 'fas fa-tower-broadcast',
            background: 'var(--col-special)',
            color: '#fff'
        },
        'Flight Procedures': {
            icon: 'fas fa-map-signs',
            background: 'var(--col-approach)',
            color: '#fff'
        },
        'UAS/Drone Operations': {
            icon: 'fas fa-drone',
            background: 'var(--col-operating)',
            color: '#fff'
        },
        'Construction Activity': {
            icon: 'fas fa-hard-hat',
            background: 'var(--col-crane)',
            color: '#fff'
        },
        'Helicopter Operations': {
            icon: 'fas fa-helicopter',
            background: 'var(--col-security)',
            color: '#fff'
        },
        'Publication Updates': {
            icon: 'fas fa-book-open',
            background: 'var(--col-rf)',
            color: '#fff'
        },
        'SNOWTAM': {
            icon: 'fas fa-snowflake',
            background: 'var(--col-approach)',
            color: '#fff'
        },
        'Charts': {
            icon: 'fas fa-map',
            background: 'var(--col-operating)',
            color: '#fff'
        },
        'Special Use Airspace': {
            icon: 'fas fa-radiation',
            background: 'var(--col-special)',
            color: '#fff'
        },
        'Instrument Landing Systems': {
            icon: 'fas fa-wave-square',
            background: 'var(--col-instrument)',
            color: '#fff'
        },
        'Approach Procedures': {
            icon: 'fas fa-plane-arrival',
            background: 'var(--col-approach)',
            color: '#fff'
        },
        'Security Measures': {
            icon: 'fas fa-shield-alt',
            background: 'var(--col-security)',
            color: '#fff'
        },
        'Radio Frequency Changes': {
            icon: 'fas fa-broadcast-tower',
            background: 'var(--col-rf)',
            color: '#fff'
        },
        'Operating Restrictions': {
            icon: 'fas fa-ban',
            background: 'var(--col-operating)',
            color: '#fff'
        },
        'Temporary Obstacles': {
            icon: 'fas fa-exclamation-triangle',
            background: 'var(--col-temporary)',
            color: '#fff'
        },
        'Crane Operations': {
            icon: 'fas fa-crane',
            background: 'var(--col-crane)',
            color: '#fff'
        },
        'Airspace Closure': {
            icon: 'fas fa-lock',
            background: 'var(--col-airspace)',
            color: '#fff'
        }
    };

    return categories[category] || {
        icon: 'fas fa-info-circle',
        background: 'var(--col-operating)',
        color: '#fff'
    };
}

function formatUTCDate(value) {
    if (!value && value !== 0) return 'N/A';

    let dateObj;
    if (typeof value === 'number') {
        dateObj = new Date(value * 1000); // Unix sec → ms
    } else {
        const asNum = Number(value);
        dateObj = (!isNaN(asNum) && asNum > 1000000000) ? new Date(asNum * 1000) : new Date(value);
    }

    const hh = String(dateObj.getUTCHours()).padStart(2, '0');
    const mm = String(dateObj.getUTCMinutes()).padStart(2, '0');

    // День без ведущего нуля + короткий англ. месяц + полный год, всё в UTC
    const datePart = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'UTC',
        day: 'numeric',        // 6 (без 0)
        month: 'short',        // Aug
        year: 'numeric'        // 2025
    }).format(dateObj);

    return `${hh}:${mm} ${datePart}`;
}

// Закрываем окно NOTAM
closeNotamModalBtn.addEventListener('click', () => {
    notamModalBackdrop.classList.remove('show');
});

// Если хотите закрывать по клику на задний фон:
notamModalBackdrop.addEventListener('click', (e) => {
    if (e.target === notamModalBackdrop) {
        notamModalBackdrop.classList.remove('show');
    }
});

// Добавим в существующий код
const resetPasswordBtn = document.getElementById('resetPasswordBtn');
const showPasswordBtn = document.getElementById('showPasswordBtn');
const passwordBlock = document.querySelector('.password-block');

let isPasswordVisible = false;

showPasswordBtn.addEventListener('click', () => {
    const password = localStorage.getItem(PASSWORD_KEY) || '';

    if (!isPasswordVisible) {
        // Скрываем кнопку сброса и показываем поле
        resetPasswordBtn.style.display = 'none';

        const passwordInput = document.createElement('input');
        passwordInput.type = 'text';
        passwordInput.value = password;
        passwordInput.readOnly = true;
        passwordInput.classList.add('password-input');

        passwordBlock.insertBefore(passwordInput, showPasswordBtn);
        showPasswordBtn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
    } else {
        // Удаляем поле и показываем кнопку сброса
        const input = passwordBlock.querySelector('.password-input');
        if (input) passwordBlock.removeChild(input);
        resetPasswordBtn.style.display = 'inline-block';
        showPasswordBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
    }

    isPasswordVisible = !isPasswordVisible;
});


function getAircraftType() {
    return localStorage.getItem('aircraftType') || 'B737';
}


function getAircraftMaintainanceIcaos() {
    const aircraftType = getAircraftType();
    return maintenance[aircraftType].icao || [];
}


function updateMaintenanceBadge() {
    const badge = document.getElementById('showMaintenanceInfoModal');
    console.log(badge);
    if (badge) {
        const selectedAircraft = getAircraftType();
        const maintenanceCodes = getAircraftMaintainanceIcaos();

        const isIncludesMaintenance = maintenanceCodes.includes(nowIcao);
        console.log(isIncludesMaintenance);

        badge.classList.toggle('badge-green', isIncludesMaintenance);
        badge.classList.toggle('badge-red', !isIncludesMaintenance);
    }
}


// В файле main.js или отдельном скрипте
document.addEventListener('DOMContentLoaded', function() {
    const aircraftSelect = document.getElementById('aircraftTypeSelect');

    // Загрузка сохраненного значения
    const savedType = getAircraftType();
    if (savedType) {
        aircraftSelect.value = savedType;
    }

    // Клик по бейджу для открытия настроек
    document.getElementById('aircraftTypeBadge').addEventListener('click', () => {
        updateExportButtonState();
        document.getElementById('settingsModalBackdrop').classList.add('show');
    });

    updateExportButtonState();
});

// Обработчики для модального окна ограничений
document.getElementById('restrBtn').addEventListener('click', showLimitationsModal);
document.getElementById('closeLimitationsModalBtn').addEventListener('click', hideLimitationsModal);

function showLimitationsModal() {
    document.getElementById('limitationsModalBackdrop').classList.add('show');
}

function hideLimitationsModal() {
    document.getElementById('limitationsModalBackdrop').classList.remove('show');
}

// Закрытие по клику вне модалки
document.getElementById('limitationsModalBackdrop').addEventListener('click', (e) => {
    if(e.target === document.getElementById('limitationsModalBackdrop')) {
        hideLimitationsModal();
    }
});

// Копирование запасных аэродромов
document.getElementById('copyAlternatesBtn').addEventListener('click', function() {
    const alternates = document.getElementById('alternatesIcao').value;
    if (alternates.trim()) {
        navigator.clipboard.writeText(alternates);

        // На 1 секунду меняем иконку на <i class="fa-solid fa-check"></i>
        document.getElementById('copyAlternatesBtn').innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => document.getElementById('copyAlternatesBtn').innerHTML = '<i class="fa-solid fa-copy"></i>', 1000);
    }
});

// Удаление запасных аэродромов
document.getElementById('deleteAlternatesBtn').addEventListener('click', function() {
    document.getElementById('alternatesIcao').value = '';

    // На 1 секунду меняем иконку на <i class="fa-solid fa-check"></i>
    document.getElementById('deleteAlternatesBtn').innerHTML = '<i class="fa-solid fa-check"></i>';
    setTimeout(() => document.getElementById('deleteAlternatesBtn').innerHTML = '<i class="fa-solid fa-trash"></i>', 1000);
});

// Функция показа уведомления (если уже существует в коде - не дублировать)
function showResultModal(title, message) {
    if (window.showResultModal) { // Проверка на существование функции
        window.showResultModal(title, message);
    } else {
        alert(message); // Фолбэк если модалка не реализована
    }
}

function updateSelectedPlacard() {
    // Получаем все кнопки в контейнере с плашками аэродромов
    const placards = document.querySelectorAll('#historyContainer button');

    // Перебираем все найденные плашки
    placards.forEach(placard => {
        // Пытаемся получить ICAO из data-атрибута
        let icao = placard.textContent.trim();
        // Если data-атрибут не задан, пробуем извлечь ICAO из текста (ищем 4 подряд идущие заглавные буквы)
        if (!icao) {
            const text = placard.textContent.trim();
            const match = text.match(/\b[A-Z]{4}\b/);
            if (match) {
                icao = match[0];
            }
        }
        // Если найден ICAO и он совпадает с глобальной переменной nowIcao, добавляем класс "selected",
        // иначе удаляем этот класс
        if (icao && nowIcao && icao === nowIcao) {
            placard.classList.add('selected');
        } else {
            placard.classList.remove('selected');
        }
    });
}

document.getElementById('btnUrlToGamc').addEventListener('click', () => {
    if (offlineMode) return;
    // Открываем в новой вкладке http://meteoinfo.gamc.ru
    window.open('http://meteoinfo.gamc.ru', '_blank');
});