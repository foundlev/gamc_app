// Функция форматирования даты с добавлением относительного времени
function formatChangelogDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date(); // Текущая дата и время
    const diffMs = now - date; // Разница в миллисекундах

    // Форматированная дата
    const formattedDate = date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
    }) + ' UTC';

    // Расчёт относительного времени
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    let relativeTime = '';
    if (diffDays >= 1) {
        relativeTime = `${diffDays} дн назад`;
    } else if (diffHours >= 1) {
        relativeTime = `${diffHours} ч назад`;
    } else {
        relativeTime = `${diffMinutes} мин назад`;
    }

    return { formattedDate, relativeTime };
}

async function getCommits() {
    const currentVersion = document.getElementById('changelogBtn').textContent.trim();
    const commitInfo = JSON.parse(localStorage.getItem('commitInfo') || '{}');

    const commitVersion = commitInfo.version;
    const commitValue = commitInfo.value;
    if (commitVersion && commitVersion === currentVersion && commitValue) {
        return commitValue;
    } else {
        const newCommitInfo = await downloadCommitsList();
        localStorage.setItem('commitInfo', JSON.stringify(
            {
                version: currentVersion,
                value: newCommitInfo
            }
        ));
        return newCommitInfo;
    }
}

async function downloadCommitsList() {
    const apiUrl = 'https://api.github.com/repos/foundlev/gamc_app/commits?sha=main&per_page=100';
    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Mozilla/5.0'
            }
        });
        if (!response.ok) {
            console.error('Ошибка запроса API:', response.status);
            return;
        }
        const data = await response.json();
        let newCommits = [];

        for (const item of data) {
            const message = item.commit.message;
            if (!message || message.length < 50) continue;
            const date = item.commit.committer.date || 'Нет даты';

            const commit = {
                message: message,
                date: date
            };
            newCommits.push(commit);
        }
        return newCommits;
    } catch (error) {
        console.error(error);
    }
}

// Функция отображения модального окна
async function showChangelogModal() {
    const changelogContent = document.getElementById('changelogContent');
    if (!changelogContent) return;
    changelogContent.innerHTML = ''; // Очищаем содержимое перед вставкой

    const changelogData = await getCommits();
    if (!changelogData || !Array.isArray(changelogData)) {
        changelogContent.innerHTML = '<p>Нет данных для отображения</p>';
        return;
    }

    let html = '';
    changelogData.forEach(entry => {
        const { formattedDate, relativeTime } = formatChangelogDate(entry.date);
        // Экранируем message, чтобы избежать проблем с HTML-символами
        const safeMessage = entry.message
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        html += `
            <div class="changelog-item">
                <div class="changelog-date">
                    ${formattedDate}
                    <span class="relative-time">${relativeTime}</span>
                </div>
                <div class="changelog-message">${safeMessage}</div>
            </div>
        `;
    });

    changelogContent.innerHTML = html;
}

// Обработчики событий
document.addEventListener('DOMContentLoaded', () => {
    if (typeof offlineMode !== 'undefined' && !offlineMode) {
        getCommits().then();
    } else if (typeof offlineMode === 'undefined') {
        const storedOffline = JSON.parse(localStorage.getItem('offlineMode')) || false;
        if (!storedOffline) {
            getCommits().then();
        }
    }

    const infoBtn = document.getElementById('infoBtn');
    const closeInfoModalBtn = document.getElementById('closeInfoModalBtn');
    const infoModalBackdrop = document.getElementById('infoModalBackdrop');

    if (infoBtn) {
        infoBtn.addEventListener('click', () => {
            showChangelogModal(); // Она теперь отвечает за показ Info модалки
            infoModalBackdrop.classList.add('show');
        });
    }

    if (closeInfoModalBtn) {
        closeInfoModalBtn.addEventListener('click', () => {
            infoModalBackdrop.classList.remove('show');
        });
    }

    if (infoModalBackdrop) {
        infoModalBackdrop.addEventListener('click', (e) => {
            if (e.target === infoModalBackdrop) {
                infoModalBackdrop.classList.remove('show');
            }
        });
    }

    const changelogBtn = document.getElementById('changelogBtn');
});

// Закрытие модального окна
document.getElementById('closeWindDirectionModalBtn').addEventListener('click', () => {
    document.getElementById('windDirectionModalBackdrop').classList.remove('show');
});

// Расчет направления
document.getElementById('calculateWindBtn').addEventListener('click', () => {
    const depIcao = document.getElementById('windDepIcao').value.toUpperCase();
    const arrIcao = document.getElementById('windArrIcao').value.toUpperCase();
    const windType = document.getElementById('windTypeSelect').value;

    if(!airportInfoDb[depIcao] || !airportInfoDb[arrIcao]) {
        showResultModal('Ошибка', 'Один из аэропортов не найден');
        return;
    }

    const dep = airportInfoDb[depIcao];
    const arr = airportInfoDb[arrIcao];

    const course = calculateBearing(
        dep.latitude,
        dep.longitude,
        arr.latitude,
        arr.longitude
    );

    // Используем склонение аэропорта вылета
    const declination = dep.declination || 0; // если склонение не указано, принимаем 0
    // Вычисляем магнитный курс: истинный курс минус склонение, приводим в диапазон 0–359
    const magneticCourse = (course - declination + 360) % 360;

    let resultDirection = windType === 'HW' ?
        formatCourse(magneticCourse) :
        formatCourse((magneticCourse + 180) % 360);

    document.getElementById('windDirectionValue').textContent =
        `${resultDirection}/-`;


    // Расчет времени ожидания
    const finalReserve = parseInt(document.getElementById('finalReserve').value);
    const remf = parseInt(document.getElementById('remf').value);

    if(finalReserve > 0 && remf > 0) {
        const diff = Math.abs(finalReserve - remf);
        const holdingMinutes = Math.round(diff / 2600 * 60);
        document.getElementById('holdingTimeValue').textContent =
            `${holdingMinutes} мин`;
    } else {
        document.getElementById('holdingTimeValue').textContent = '—';
    }
});

// Валидация ввода топлива
document.querySelectorAll('.fuel-input input').forEach(input => {
    input.addEventListener('input', () => {
        input.value = input.value.replace(/[^0-9]/g, '');
    });
});

// Форматирование курса в 3 цифры
function formatCourse(degrees) {
    return String(Math.round(degrees)).padStart(3, '0');
}

// Расчет азимута (формула Хаверсина)
function calculateBearing(lat1, lon1, lat2, lon2) {
    const fi1 = lat1 * Math.PI/180;
    const fi2 = lat2 * Math.PI/180;
    const deltaA = (lon2 - lon1) * Math.PI/180;

    const y = Math.sin(deltaA) * Math.cos(fi2);
    const x = Math.cos(fi1)*Math.sin(fi2) -
              Math.sin(fi1)*Math.cos(fi2)*Math.cos(deltaA);

    let te = Math.atan2(y, x);
    return (te*180/Math.PI + 360) % 360;
}
