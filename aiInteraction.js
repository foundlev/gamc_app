// aiInteraction.js

// Промпт для объяснения погоды ИИ (уже предоставлен)
const weatherPrompt = `
Ты — эксперт по авиационной погоде. Твоя задача: проанализировать погодные данные (может содержать METAR, TAF, SIGMET, AIRMET и тд) и дать их понятное объяснение для пилотов и диспетчеров.

**Входные данные:**
- Строка с погодным отчётом (может содержать METAR, TAF, SIGMET, AIRMET и тд).  
  Пример:  
  \`\`\`
METAR: UUEE 051200Z 27010KT 240V300 9999 -RA BKN030 OVC100 05/03 Q1015 R88/290055 NOSIG
TAF: TAF UUEE 051130Z 0512/0612 27012KT 9999 BKN030 TEMPO 0512/0612 27015G25KT 5000 RA
SWX ADVISORY DTG: 20250406/0609Z SWXC: ACFJ ADVISORY NR: 2025/206 SWX EFFECT: GNSS MOD OBS SWX: 06/0608Z HNH HSH W180 - E180 FCST SWX +6 HR: 06/1300Z NOT AVBL FCST SWX +12 HR: 06/1900Z NOT AVBL FCST SWX +18 HR: 07/0100Z NOT AVBL FCST SWX +24 HR: 07/0700Z NOT AVBL=
  \`\`\`

**Выходные данные:**
- Формат: HTML-код с объяснением для каждого отчёта.  
- Для каждого отчёта:  
  1. Заголовок (например, \`<h3>METAR - Объяснение</h3>\`).  
  2. Исходный отчёт (например, \`<p><strong>METAR:</strong> UUEE 051200Z ... </p>\`).  
  3. Объяснение (например, \`<p><strong>Объяснение:</strong> Этот METAR ... (на русском) </p>\`).  
- Если данных нет, укажи это (например, "Данные о ... отсутствуют").  

**Пример вывода:**
\`\`\`html
<div class="weather-section">
    <h3>METAR - Объяснение</h3>
    <p><strong>METAR:</strong> UUEE 051200Z 27010KT 240V300 9999 -RA BKN030 OVC100 05/03 Q1015 R88/290055 NOSIG</p>
    <p><strong>Объяснение:</strong> ...</p>
</div>
<div class="weather-section">
    <h3>TAF - Объяснение</h3>
    <p><strong>TAF:</strong> TAF UUEE 051130Z 0512/0612 27012KT 9999 BKN030 TEMPO 0512/0612 27015G25KT 5000 RA</p>
    <p><strong> Объяснение:</strong> ...</p>
</div>
\`\`\`
`;

// Функция для получения объяснения от ИИ (аналог getAiExplanation в Python)
async function getAiExplanation(prompt, text) {
    const url = "https://myapihelper.na4u.ru/gamc_app/ai.php"; // API-эндпоинт
    const payload = {
        password: "737800", // Локальный пароль
        prompt: prompt,
        text: text
    };
    const headers = {
        "Content-Type": "application/json"
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Ошибка HTTP! Статус: ${response.status}`);
        }

        const data = await response.json();
        let content = data.choices[0].message.content;

        // Удаляем маркеры ```html и ```, если они есть
        content = content.replace(/^```html\s*/, '').replace(/\s*```$/, '');

        return content;
    } catch (error) {
        console.error("Ошибка при получении объяснения от ИИ:", error);
        throw error;
    }
}

// Функция для форматирования разницы во времени для текста "Обновлено: ..."
function formatTimeDifference(updatedTimestamp) {
    const now = Date.now();
    const diffMs = now - updatedTimestamp;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return "только что";
    if (diffMinutes < 60) return `${diffMinutes} минут назад`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} часов назад`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} дней назад`;
}

// Функция для создания и отображения модального окна с объяснением от ИИ
function showAIExplanationModal() {
    // Удаляем существующее модальное окно, если оно есть
    let aiModalBackdrop = document.getElementById('aiExplanationModalBackdrop');
    if (aiModalBackdrop) {
        aiModalBackdrop.remove();
    }

    // Создаём фон модального окна
    aiModalBackdrop = document.createElement('div');
    aiModalBackdrop.id = 'aiExplanationModalBackdrop';
    aiModalBackdrop.className = 'modal-backdrop';

    // Создаём содержимое модального окна
    const disableString = offlineMode ? 'disabled' : '';

    aiModalBackdrop.innerHTML = `
        <div class="modal ai-explanation-modal">
            <button class="modal-close-btn" id="closeAIExplanationModalBtn">
                <i class="fas fa-times"></i>
            </button>
            <h2><i class="fa-solid fa-wand-magic-sparkles"></i>Объяснение погоды</h2>
            <div class="ai-explanation-content" id="aiExplanationContent">
                <div class="loading-overlay" id="aiLoadingOverlay">
                    <div class="neuro-loader"></div>
                    <p>Загрузка...</p>
                </div>
                <p class="no-data-message" id="aiNoDataMessage">Нет данных. Нажмите "Обновить", чтобы загрузить объяснение.</p>
                <div id="aiExplanationData"></div>
            </div>
            <div class="ai-explanation-footer">
                <span id="aiLastUpdated">Обновлено: только что</span>
                <button id="refreshAIExplanationBtn" ${disableString}>
                    <i class="fa-solid fa-retweet"></i> Обновить
                </button>
            </div>
        </div>
    `;

    // Добавляем модальное окно в тело документа
    document.body.appendChild(aiModalBackdrop);

    // Добавляем обработчики событий для закрытия модального окна
    const closeBtn = document.getElementById('closeAIExplanationModalBtn');
    closeBtn.addEventListener('click', () => {
        aiModalBackdrop.classList.remove('show');
    });

    // Закрываем модальное окно при клике вне его
    aiModalBackdrop.addEventListener('click', (e) => {
        if (e.target === aiModalBackdrop) {
            aiModalBackdrop.classList.remove('show');
        }
    });

    // Добавляем обработчик события для кнопки обновления
    const refreshBtn = document.getElementById('refreshAIExplanationBtn');
    refreshBtn.addEventListener('click', showConfirmationModal);

    // Загружаем данные из localStorage на основе текущего ICAO
    const icaoInput = document.getElementById('icao').value.toUpperCase();
    const aiExplanationContent = document.getElementById('aiExplanationContent');
    const aiExplanationData = document.getElementById('aiExplanationData'); // Новый контейнер для данных
    const aiLastUpdated = document.getElementById('aiLastUpdated');
    const loadingOverlay = document.getElementById('aiLoadingOverlay');
    const noDataMessage = document.getElementById('aiNoDataMessage');

    // Отладка: проверяем, существуют ли элементы
    console.log('showAIExplanationModal - loadingOverlay:', loadingOverlay);
    console.log('showAIExplanationModal - noDataMessage:', noDataMessage);
    console.log('showAIExplanationModal - aiExplanationData:', aiExplanationData);

    let storedData = localStorage.getItem('aiWeatherExplanation');
    storedData = storedData ? JSON.parse(storedData) : {};

    if (storedData[icaoInput]) {
        aiExplanationData.innerHTML = storedData[icaoInput].html; // Вставляем данные в отдельный контейнер
        aiLastUpdated.textContent = `Обновлено: ${formatTimeDifference(storedData[icaoInput].updated)}`;
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
            console.log('Скрываем loadingOverlay при наличии данных');
        }
        if (noDataMessage) {
            noDataMessage.style.display = 'none';
            console.log('Скрываем noDataMessage при наличии данных');
        }
    } else {
        // Показываем сообщение "нет данных"
        aiExplanationData.innerHTML = ''; // Очищаем контейнер данных
        aiLastUpdated.textContent = 'Обновлено: никогда';
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
            console.log('Скрываем loadingOverlay при отсутствии данных');
        }
        if (noDataMessage) {
            noDataMessage.style.display = 'block';
            console.log('Показываем noDataMessage при отсутствии данных');
        }
    }

    // Показываем модальное окно
    aiModalBackdrop.classList.add('show');
}

// Функция для получения и обновления объяснения от ИИ
async function fetchAndUpdateAIExplanation(icao, contentElement, updatedElement, loadingOverlay, noDataMessage) {
    // Отладка: проверяем, существуют ли элементы
    console.log('fetchAndUpdateAIExplanation - loadingOverlay:', loadingOverlay);
    console.log('fetchAndUpdateAIExplanation - noDataMessage:', noDataMessage);

    // Показываем анимацию загрузки, если элемент существует
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        console.log('Показываем анимацию загрузки');
    } else {
        console.warn('Элемент loadingOverlay не найден в DOM');
    }
    if (noDataMessage) {
        noDataMessage.style.display = 'none'; // Скрываем сообщение "нет данных" во время загрузки
        console.log('Скрываем noDataMessage во время загрузки');
    }

    // Находим контейнер для данных
    const aiExplanationData = document.getElementById('aiExplanationData');
    console.log('fetchAndUpdateAIExplanation - aiExplanationData:', aiExplanationData);

    try {
        const weatherData = document.getElementById('responseContainer').textContent;
        const aiResponse = await getAiExplanation(weatherPrompt, weatherData);
        if (aiExplanationData) {
            aiExplanationData.innerHTML = aiResponse; // Вставляем данные в отдельный контейнер
        } else {
            console.warn('Элемент aiExplanationData не найден в DOM');
        }

        // Сохраняем в localStorage
        let storedData = localStorage.getItem('aiWeatherExplanation');
        storedData = storedData ? JSON.parse(storedData) : {};
        storedData[icao] = {
            html: aiResponse,
            updated: Date.now()
        };
        localStorage.setItem('aiWeatherExplanation', JSON.stringify(storedData));

        updatedElement.textContent = 'Обновлено: только что';
    } catch (error) {
        if (aiExplanationData) {
            aiExplanationData.innerHTML = '<p class="error">Ошибка загрузки объяснения. Попробуйте снова.</p>';
        }
        updatedElement.textContent = 'Обновлено: ошибка';
    } finally {
        // Скрываем анимацию загрузки, если элемент существует
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
            console.log('Скрываем анимацию загрузки после завершения');
        } else {
            console.warn('Элемент loadingOverlay не найден в DOM при попытке скрыть');
        }
    }
}

// Функция для показа модального окна подтверждения обновления
function showConfirmationModal() {
    if (offlineMode) return;

    const confirmModalBackdrop = document.getElementById('confirmModalBackdrop');
    const confirmModalTitle = document.getElementById('confirmModalTitle');
    const confirmModalMessage = document.getElementById('confirmModalMessage');
    const confirmNotamContainer = document.getElementById('confirmNotamContainer');
    const confirmYesBtn = document.getElementById('confirmYesBtn');
    const confirmNoBtn = document.getElementById('confirmNoBtn');

    // Обновляем содержимое модального окна
    confirmModalTitle.textContent = 'Подтверждение';
    confirmModalMessage.textContent = 'Вы уверены, что хотите обновить объяснение погоды?';
    confirmNotamContainer.style.display = 'none'; // Скрываем чекбокс NOTAM

    // Удаляем существующие обработчики событий, чтобы избежать дублирования
    const newYesBtn = confirmYesBtn.cloneNode(true);
    const newNoBtn = confirmNoBtn.cloneNode(true);
    confirmYesBtn.parentNode.replaceChild(newYesBtn, confirmYesBtn);
    confirmNoBtn.parentNode.replaceChild(newNoBtn, confirmNoBtn);

    // Добавляем новые обработчики событий для кнопок
    newYesBtn.addEventListener('click', () => {
        confirmModalBackdrop.classList.remove('show');
        const icaoInput = document.getElementById('icao').value.toUpperCase();
        const aiExplanationContent = document.getElementById('aiExplanationContent');
        const aiLastUpdated = document.getElementById('aiLastUpdated');
        const loadingOverlay = document.getElementById('aiLoadingOverlay');
        const noDataMessage = document.getElementById('aiNoDataMessage');
        fetchAndUpdateAIExplanation(icaoInput, aiExplanationContent, aiLastUpdated, loadingOverlay, noDataMessage);
    });

    newNoBtn.addEventListener('click', () => {
        confirmModalBackdrop.classList.remove('show');
    });

    // Показываем модальное окно
    confirmModalBackdrop.classList.add('show');
}

// Добавляем обработчик события для иконки ИИ (внутри #aiCheckBtn)
document.addEventListener('DOMContentLoaded', () => {
    const aiIcon = document.getElementById('aiCheckBtn');
    if (aiIcon) {
        aiIcon.addEventListener('click', showAIExplanationModal);
    }
});