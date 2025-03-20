// Находим кнопку и модалку для NOTAM
const notamBtn = document.getElementById('notamBtn');
const notamModalBackdrop = document.getElementById('notamModalBackdrop');
const closeNotamModalBtn = document.getElementById('closeNotamModalBtn');
const notamContent = document.getElementById('notamContent');
const notamModal = document.getElementById('notamModalWindow');
const loadNotamBtn = document.getElementById('loadNotamBtn');


function getNotamsForIcao(icao) {
    const notamData = localStorage.getItem('notamData');

    if (!notamData) return [];
    const parsed = JSON.parse(notamData);
    const key = icao.toUpperCase();

    // Если для данного ICAO существуют данные, возвращаем их, иначе пустой массив
    if (parsed[key] && parsed[key].data && !parsed[key].data.error) {
        return parsed[key].data;
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
        if (parsed[key] && parsed[key].updated && !parsed[key].data?.error && parsed[key].data?.length !== 0) {
            const updatedDate = new Date(parsed[key].updated);
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
    // Фильтруем из initialNotams только нужные
    // смотрите, у вас ключи могут быть "icao" или "location", используйте одинаково
    const notamsForIcao = getNotamsForIcao(nowIcao);
    const loadNotamBtn = document.getElementById('loadNotamBtn');

    if (notamsForIcao.length === 0) {
        notamContent.innerHTML = `Нет NOTAMов для <b>${nowIcao}</b>`;
        notamModal.classList.toggle('download-mode', true);
        loadNotamBtn.style.display = 'block';
    } else {
        notamModal.classList.toggle('download-mode', false);
        loadNotamBtn.style.display = 'none';

        let html = '';

        notamsForIcao.forEach(n => {
            const cat = getCategoryAppearance(n.ai_category);
            html += `
                <div class="notam-item">
                    <div class="notam-header">
                        <div class="notam-id-badge">
                            <i class="fas fa-file-alt notam-doc-icon"></i>
                            <span class="notam-id">${n.raw_id}</span>
                        </div>
                        <div class="notam-category" data-category="${n.ai_category}" style="background: ${cat.background}; color: ${cat.color};">
                            <i class="${cat.icon}" style="color: ${cat.color};"></i>
                            ${n.ai_category}
                        </div>
                    </div>
                    
                    <div class="notam-short-info">
                        <i class="fa-solid fa-circle-info"></i>
                        ${n.ai_short_interpretation}
                    </div>
        
                    ${n.ai_interpretation ? `
                    <div class="notam-interpretation">
                        ${n.ai_interpretation}
                    </div>
                    ` : ''}
        
                    <div class="notam-raw">${n.all.replace(/\n/g, '<br>')}</div>
        
                    <div class="notam-meta">
                        <span class="notam-period">
                            <i class="fas fa-calendar-alt"></i>
                            ${formatUTCDate(n.startdate)} - 
                            ${n.PERM ? 'Постоянный' : formatUTCDate(n.enddate)}
                        </span>
                        <span>
                            <i class="fas fa-clock"></i>
                            Выпущен: ${formatUTCDate(n.issuedate)}
                        </span>
                    </div>
                </div>
            `;
        });

        notamContent.innerHTML = html;
    }

    notamModalBackdrop.classList.add('show');
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

function formatUTCDate(dateString) {
    if(!dateString) return 'N/A';

    const issuedDate = new Date(dateString);

    const utcHours = String(issuedDate.getUTCHours()).padStart(2, '0');
    const utcMinutes = String(issuedDate.getUTCMinutes()).padStart(2, '0');
    const utcDay = String(issuedDate.getUTCDate()).padStart(2, '0');
    const utcMonth = String(issuedDate.getUTCMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
    const utcYear = String(issuedDate.getUTCFullYear()).slice(-2);

    return `${utcHours}:${utcMinutes} ${utcDay}.${utcMonth}.${utcYear}`;
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

    // Сохранение при изменении
    aircraftSelect.addEventListener('change', function() {
        localStorage.setItem('aircraftType', this.value);
        updateMaintenanceBadge();
    });
});