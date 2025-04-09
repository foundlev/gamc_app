// Функция форматирования даты
function formatChangelogDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
    }) + ' UTC';
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
        let newCommits = []

        for (const item of data) {
            const message = item.commit.message;
            // Пропускаем коммиты с пустым сообщением или коротким сообщением (< 50 символов)
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
    let html = '';

    const changelogData = await getCommits();

    changelogData.forEach(entry => {
        html += `
            <div class="changelog-item">
                <div class="changelog-date">${formatChangelogDate(entry.date)}</div>
                <div class="changelog-message">${entry.message}</div>
            </div>
        `;
    });

    changelogContent.innerHTML = html;
    document.getElementById('changelogModalBackdrop').classList.add('show');
}

// Обработчики событий
document.addEventListener('DOMContentLoaded', () => {
    if (!offlineMode) {
        getCommits().then();
    }

    const changelogBtn = document.getElementById('changelogBtn');
    const closeChangelogModalBtn = document.getElementById('closeChangelogModalBtn');
    const changelogModalBackdrop = document.getElementById('changelogModalBackdrop');

    changelogBtn.addEventListener('click', showChangelogModal);

    closeChangelogModalBtn.addEventListener('click', () => {
        changelogModalBackdrop.classList.remove('show');
    });

    changelogModalBackdrop.addEventListener('click', (e) => {
        if (e.target === changelogModalBackdrop) {
            changelogModalBackdrop.classList.remove('show');
        }
    });
});