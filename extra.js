

function getAirportPosition(icaoCode) {
    const airportInfo = airportInfoDb[icaoCode] || {};
    if (!airportInfo.latitude || !airportInfo.longitude) return null;
    return {
        lat: airportInfo.latitude,
        lon: airportInfo.longitude
    };
}

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
    if (badge) {
        const selectedAircraft = getAircraftType();
        const maintenanceCodes = getAircraftMaintainanceIcaos();

        const isIncludesMaintenance = maintenanceCodes.includes(nowIcao);

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
    const aircraftTypeBadge = document.getElementById('aircraftTypeBadge');
    if (aircraftTypeBadge) {
        aircraftTypeBadge.addEventListener('click', () => {
            updateExportButtonState();
            document.getElementById('settingsModalBackdrop').classList.add('show');
        });
    }

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

// Логика переключения вкладок в модальных окнах (универсальная)
document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.tab-btn');
    if (!tabBtn) return;

    const modal = tabBtn.closest('.modal');
    if (!modal) return;

    const tabId = tabBtn.dataset.tab;
    if (!tabId) return;

    // Переключаем активную кнопку
    modal.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    tabBtn.classList.add('active');

    // Переключаем активную вкладку
    modal.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    const targetPane = modal.querySelector(`#${tabId}`);
    if (targetPane) {
        targetPane.classList.add('active');
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

