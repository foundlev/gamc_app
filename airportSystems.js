// Файл: landingSystems.js

const saveAtisBtn = document.getElementById('saveAtisBtn');
const editAtisBtn = document.getElementById('editAtisBtn');

// Получаем данные систем из localStorage
function getLandingSystems() {
    const ls = localStorage.getItem('landingSystems');
    return ls ? JSON.parse(ls) : {};
}

function hasAirportLandingSystems(icao) {
    const landingSystems = getLandingSystems();
    if (icao in landingSystems) {
        return landingSystems[icao].length !== 0;
    }
    return false;
}

// Сохраняем данные систем в localStorage
function saveLandingSystems(data) {
    localStorage.setItem('landingSystems', JSON.stringify(data));
}

// Функция для рендеринга списка систем захода для текущего аэродрома
function renderLandingSystemsList() {
    const contentElem = document.getElementById('landingSystemsList');
    contentElem.innerHTML = '';

    const landingSystemsData = getLandingSystems();
    const currentIcao = nowIcao ? nowIcao.toUpperCase() : '';
    const systems = landingSystemsData[currentIcao] || [];

    if (systems.length === 0) {
        contentElem.innerHTML = '<p>Нет систем захода для данного аэродрома</p>';
        return;
    }

    // Группируем по ВПП
    const groups = {};
    systems.forEach((item, idx) => {
        if (!groups[item.runway]) {
            groups[item.runway] = [];
        }
        // Записываем индекс, чтобы потом можно было изменить или удалить элемент
        groups[item.runway].push({ ...item, idx });
    });

    // Определяем порядок отображения систем
    const systemOrder = ["ILS (I)", "GLS", "RNAV", "LOC", "VOR", "NDB"];

    // Сортируем внутри каждой группы
    Object.keys(groups).forEach(rwy => {
        groups[rwy].sort((a, b) => {
            const indexA = systemOrder.indexOf(a.system);
            const indexB = systemOrder.indexOf(b.system);
            return (indexA === -1 ? 100 : indexA) - (indexB === -1 ? 100 : indexB);
        });
    });

    // Опционально сортируем группы по номеру ВПП (например, по возрастанию)
    const sortedRunways = Object.keys(groups).sort((a, b) => parseInt(a) - parseInt(b));

    sortedRunways.forEach(rwy => {
        // Заголовок группы
        const header = document.createElement('div');
        header.className = 'landing-system-group-header';
        header.textContent = `ВПП ${rwy}`;
        contentElem.appendChild(header);

        groups[rwy].forEach(item => {
            const row = document.createElement('div');
            row.classList.add('landing-system-item');
            if (!item.active) {
                row.classList.add('inactive-system');
            }
            row.innerHTML = `
                <label class="custom-checkbox">
                    <input type="checkbox" ${item.active ? 'checked' : ''} data-idx="${item.idx}">
                    <span></span>
                </label>
                <div class="landing-system-text">
                    ${item.system}
                    <span class="gray-sep">|</span> RVR: ${item.rvr} м
                    <span class="gray-sep">|</span> DH: ${item.dh} ft
                </div>
                <button class="delete-system-btn" data-idx="${item.idx}"><i class="fa-solid fa-minus"></i></button>
            `;
            contentElem.appendChild(row);
        });
    });

    // Обработчик изменения состояния чекбокса – обновляет active
    contentElem.querySelectorAll('input[type="checkbox"]').forEach(ch => {
        ch.addEventListener('change', (e) => {
            const idx = e.target.dataset.idx;
            const landingSystems = getLandingSystems();
            if (currentIcao in landingSystems && landingSystems[currentIcao][idx] !== undefined) {
                landingSystems[currentIcao][idx].active = e.target.checked;
                saveLandingSystems(landingSystems);
            }
            const parentItem = e.target.closest('.landing-system-item');
            if (!parentItem) return;
            if (e.target.checked) parentItem.classList.remove('inactive-system');
            else parentItem.classList.add('inactive-system');
        });
    });

    // Обработчик кнопки "Удалить" – открывает модальное окно подтверждения
    document.querySelectorAll('.delete-system-btn').forEach(btn => {
        const systemIdx = btn.getAttribute('data-idx');

        btn.addEventListener('click', () => {
            const idx = systemIdx;
            const currentIcao = nowIcao ? nowIcao.toUpperCase() : '';

            // Показываем модальное окно подтверждения
            const confirmModal = document.getElementById('confirmModalBackdrop');
            confirmModal.classList.add('show');

            document.getElementById('confirmModalMessage').textContent = 'Вы уверены?';
            document.getElementById('confirmYesBtn').style.backgroundColor = 'var(--badge-red-bg)';

            // Обработчик кнопки "Да" в модальном окне
            document.getElementById('confirmYesBtn').onclick = () => {
                const landingSystems = getLandingSystems();
                if (currentIcao in landingSystems) {
                    landingSystems[currentIcao].splice(idx, 1);
                    saveLandingSystems(landingSystems);
                    renderLandingSystemsList();
                }
                confirmModal.classList.remove('show');
            };

            // Обработчик кнопки "Нет" в модальном окне
            document.getElementById('confirmNoBtn').onclick = () => {
                confirmModal.classList.remove('show');
            };

            // Обработчик закрытия модального окна
            document.getElementById('closeConfirmModalBtn').onclick = () => {
                confirmModal.classList.remove('show');
            };
        });
    });
}


function changeLangAtis() {
    const atisFrqBtn = document.getElementById('atisFrqBtn');
    let newLang = null;

    if (atisFrqBtn.textContent.includes('EN')) {
        newLang = 'ru';
    } else if (atisFrqBtn.textContent.includes('RU')) {
        newLang = 'en';
    } else {
        return;
    }

    const newFrqInfo = getAtisFrequencyByIcao(nowIcao, 'arrival', newLang);
    atisFrqBtn.innerHTML = `<i class="fa-solid fa-tower-cell"></i> ${newFrqInfo.frq}` +
                    (newFrqInfo.lang ? ` ${newFrqInfo.lang.toUpperCase()}` : '');
}

// Функция открытия модального окна систем захода
function showLandingSystemModal() {
    // Запускаем валидацию формы
    validateLandingSystemForm();
    document.getElementById('systemRunwaySelect').addEventListener('change', validateLandingSystemForm);
    document.getElementById('systemTypeSelect').addEventListener('change', validateLandingSystemForm);
    document.getElementById('rvrInput').addEventListener('input', validateLandingSystemForm);
    document.getElementById('dhInput').addEventListener('input', validateLandingSystemForm);

    const backdrop = document.getElementById('landingSystemsModalBackdrop');

    const landingSystemsModalCaption = document.getElementById('landingSystemsModalCaption');
    landingSystemsModalCaption.textContent = `ATIS аэродрома ${nowIcao}`;

    const uid = getGamcUID();
    if (isTechUID()) {
        editAtisBtn.hidden = false;
        saveAtisBtn.hidden = false;

        editAtisBtn.disabled = false;

        document.getElementById('atisDep1').readOnly = true;
        document.getElementById('atisDep2').readOnly = true;
        document.getElementById('atisArr1').readOnly = true;
        document.getElementById('atisArr2').readOnly = true;

        saveAtisBtn.disabled = true;
    }

    // Заполняем select ВПП данными из текущего аэродрома
    const runwaySelect = document.getElementById('systemRunwaySelect');
    runwaySelect.innerHTML = '';
    if (nowIcao && airportInfoDb[nowIcao] && airportInfoDb[nowIcao].runways) {
        Object.keys(airportInfoDb[nowIcao].runways).forEach(rwy => {
            const option = document.createElement('option');
            option.value = rwy;
            option.textContent = rwy;
            runwaySelect.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Нет данных';
        runwaySelect.appendChild(option);
    }

    // Открываем модалку
    backdrop.classList.add('show');

    // Рендерим сохранённые системы для текущего ICAO
    renderLandingSystemsList();
    // Загружаем сохранённые ATIS частоты для текущего аэродрома
    loadAtisFrequenciesForModal();

    // Обработчик кнопки "Добавить"
    const addBtn = document.getElementById('addSystemBtn');
    addBtn.onclick = () => {
        const runway = document.getElementById('systemRunwaySelect').value;
        const system = document.getElementById('systemTypeSelect').value;
        const rvr = document.getElementById('rvrInput').value.trim();
        const dh = document.getElementById('dhInput').value.trim();
        // Новая система по умолчанию активная
        const isActive = true;

        const landingSystems = getLandingSystems();
        const currentIcao = nowIcao ? nowIcao.toUpperCase() : '';
        if (!landingSystems[currentIcao]) {
            landingSystems[currentIcao] = [];
        }
        landingSystems[currentIcao].push({ runway, system, rvr, dh, active: isActive });
        saveLandingSystems(landingSystems);

        // Очищаем поля ввода (при необходимости)
        document.getElementById('rvrInput').value = '';
        document.getElementById('dhInput').value = '';
        validateLandingSystemForm();

        // Перерисовываем список
        renderLandingSystemsList();
    };
}

// Функция закрытия модалки
function hideLandingSystemModal() {
    const backdrop = document.getElementById('landingSystemsModalBackdrop');
    backdrop.classList.remove('show');
}

function validateLandingSystemForm() {
    const runwaySelect = document.getElementById('systemRunwaySelect');
    const systemTypeSelect = document.getElementById('systemTypeSelect');
    const rvrInput = document.getElementById('rvrInput');
    const dhInput = document.getElementById('dhInput');
    const addBtn = document.getElementById('addSystemBtn');

    // Проверка: выбран ли ВПП (и не пустая опция)
    const runwayValid = runwaySelect.value.trim() !== '' && runwaySelect.value !== 'Нет данных';
    // Проверка: выбран ли тип системы (не пустой)
    const systemValid = systemTypeSelect.value.trim() !== '';
    // Проверка: введено ли число от 0 до 9999 в RVR
    const rvrValue = rvrInput.value.trim();
    const rvrValid = rvrValue !== '' && !isNaN(rvrValue) &&
        parseInt(rvrValue, 10) >= 0 && parseInt(rvrValue, 10) <= 9999;
    // Аналогично для DH
    const dhValue = dhInput.value.trim();
    const dhValid = dhValue !== '' && !isNaN(dhValue) &&
        parseInt(dhValue, 10) >= 0 && parseInt(dhValue, 10) <= 9999;

    if (runwayValid && systemValid && rvrValid && dhValid) {
        addBtn.disabled = false;
        addBtn.style.opacity = '1';
    } else {
        addBtn.disabled = true;
        addBtn.style.opacity = '0.5';
    }
}

function getAtisFrequencies() {
    const data = localStorage.getItem('atisFrequencies');
    return data ? JSON.parse(data) : {};
}

function saveAtisFrequencies(data) {
    localStorage.setItem('atisFrequencies', JSON.stringify(data));
}

function getAtisFrequencyByIcao(icao, direction='arrival', lang='en') {
    if (!lang) return;

    const frq = getAtisFrequencies();
    const currentFrq = frq[icao] || atisFrequenciesDict[icao];
    lang = lang.toLowerCase();

    if (!currentFrq) return;

    let frqLang = {
        departure: {
            en: null,
            ru: null,
            common: null
        },
        arrival: {
            en: null,
            ru: null,
            common: null
        }
    };

    if (currentFrq.arrival[0] && currentFrq.arrival[1]) {
        frqLang.arrival.en = currentFrq.arrival[0];
        frqLang.arrival.ru = currentFrq.arrival[1];
    } else if (currentFrq.arrival[0] || currentFrq.arrival[1]) {
        frqLang.arrival.common = currentFrq.arrival[0] || currentFrq.arrival[1];
    }

    if (currentFrq.departure[0] && currentFrq.departure[1]) {
        frqLang.departure.en = currentFrq.departure[0];
        frqLang.departure.ru = currentFrq.departure[1];
    } else if (currentFrq.departure[0] || currentFrq.departure[1]) {
        frqLang.departure.common = currentFrq.departure[0] || currentFrq.departure[1];
    }

    const oppositeDirection = {
        'arrival': 'departure',
        'departure': 'arrival'
    }

    let result = {
        'frq': null,
        'lang': null
    }
    if (frqLang.departure.common || frqLang.arrival.common) {
        result.frq = frqLang.arrival.common || frqLang.departure.common;
    } else {
        result.frq = frqLang[direction][lang] || frqLang[oppositeDirection[direction]][lang] || null;
        result.lang = lang;
    }
    return result;
}

editAtisBtn.onclick = () => {
    editAtisBtn.disabled = true;

    document.getElementById('atisDep1').readOnly = false;
    document.getElementById('atisDep2').readOnly = false;
    document.getElementById('atisArr1').readOnly = false;
    document.getElementById('atisArr2').readOnly = false;

    saveAtisBtn.disabled = false;
};

saveAtisBtn.onclick = () => {
    const currentIcao = nowIcao ? nowIcao.toUpperCase() : '';
    let atisData = getAtisFrequencies();
    if (!atisData[currentIcao]) {
        atisData[currentIcao] = { departure: [], arrival: [] };
    }
    // Считываем значения из полей (если поле не пустое, добавляем)
    const dep1 = document.getElementById('atisDep1').value.trim() || '';
    const dep2 = document.getElementById('atisDep2').value.trim() || '';
    const arr1 = document.getElementById('atisArr1').value.trim() || '';
    const arr2 = document.getElementById('atisArr2').value.trim() || '';

    atisData[currentIcao].departure = [];
    atisData[currentIcao].arrival = [];

    atisData[currentIcao].departure.push(dep1);
    atisData[currentIcao].departure.push(dep2);
    atisData[currentIcao].arrival.push(arr1);
    atisData[currentIcao].arrival.push(arr2);

    saveAtisFrequencies(atisData);

    // на 1 секунду меняем на Сохранено
    const saveAtisBtn = document.getElementById('saveAtisBtn');
    saveAtisBtn.innerHTML = '<i class="fa-solid fa-check"></i> Сохранено';
    // Таймер на 1 секунду
    setTimeout(() => {
        saveAtisBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Сохранить ATIS';
    }, 1000);
};

function loadAtisFrequenciesForModal() {
    const currentIcao = nowIcao ? nowIcao.toUpperCase() : '';
    const atisData = getAtisFrequencies();
    const currentFrq = atisData[currentIcao] || atisFrequenciesDict[currentIcao];

    if (currentFrq) {
        document.getElementById('atisDep1').value = currentFrq.departure[0] || '';
        document.getElementById('atisDep2').value = currentFrq.departure[1] || '';
        document.getElementById('atisArr1').value = currentFrq.arrival[0] || '';
        document.getElementById('atisArr2').value = currentFrq.arrival[1] || '';
    } else {
        document.getElementById('atisDep1').value = '';
        document.getElementById('atisDep2').value = '';
        document.getElementById('atisArr1').value = '';
        document.getElementById('atisArr2').value = '';
    }
}
