// search.js
(function () {
    'use strict';

    // Ждём, пока DOM готов
    document.addEventListener('DOMContentLoaded', () => {
        const icaoInput = document.getElementById('icao');
        const searchBtn = document.getElementById('searchBtn');

        // Глобальные шорткаты открытия: Cmd/Ctrl+K и /
        document.addEventListener('keydown', (e) => {
            const targetTag = (e.target && (e.target.tagName || '')).toLowerCase();
            const typing = targetTag === 'input' || targetTag === 'textarea' || e.target.isContentEditable;
            const cmdK = (e.key.toLowerCase() === 'k') && (e.metaKey || e.ctrlKey);
            const slash = (e.key === '/') && !typing;
            if (cmdK || slash) {
                e.preventDefault();
                openModal();
            }
        });

        // Создаём модалку поиска (используем существующие базовые стили .modal-backdrop/.modal)
        // Вставляем один раз в <body>
        const backdrop = document.createElement('div');
        backdrop.id = 'searchModalBackdrop';
        backdrop.className = 'modal-backdrop';

        // Фиксируем модалку ближе к верхней части экрана, чтобы инпут не прыгал
        backdrop.style.display = 'none';
        backdrop.style.alignItems = 'flex-start';
        backdrop.style.justifyContent = 'center';
        backdrop.style.padding = '8vh 2vw 4vh';

        backdrop.innerHTML = `
            <div class="modal search-modal" style="position:relative; max-width:min(760px,92vw); margin:0 auto; overflow-y: hidden;">
                <button class="modal-close-btn" id="closeSearchModalBtn" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
                <h2 style="margin:0 0 10px;display:flex;align-items:center;gap:8px;">
                    <i class="fa-solid fa-magnifying-glass"></i> Поиск аэродрома
                </h2>
                <input id="searchInput" type="text"
                    placeholder="ICAO / IATA / NAME (EN)"
                    autocomplete="off"
                    inputmode="latin"
                    style="margin:10px 0 8px; font-size:1.25rem; padding:14px 16px; border-radius:12px; width:100%; text-transform:uppercase;">
                <div id="searchHint" style="font-size:0.85rem;opacity:.75;margin-bottom:8px;">
                    Ввод только латиницей. Поиск по ICAO, IATA и названию аэродрома.
                </div>
                <ul id="searchResults" class="search-suggestions" style="display:none;"></ul>
            </div>
        `;
        document.body.appendChild(backdrop);

        // Локальные ссылки на элементы
        const closeBtn = backdrop.querySelector('#closeSearchModalBtn');
        const searchInput = backdrop.querySelector('#searchInput');
        const resultsEl = backdrop.querySelector('#searchResults');
        const emptyEl = backdrop.querySelector('#searchHint');
        const footerEl = backdrop.querySelector('footer');

        // Небольшая защита: ждём базу, если она ещё не подгрузилась в main.js
        // (main.js грузит airports_db.json и кладёт в airportsList/airportInfoDb).  [oai_citation:3‡main.js](file-service://file-3ksfbN2wFrd53PYSTsTkfX)
        function airportsReady() {
            return typeof airportsList !== 'undefined' && Array.isArray(airportsList) && airportsList.length > 0;
        }

        // Открыть/закрыть модалку
        function openModal() {
            document.documentElement.style.overflow = 'hidden';
            backdrop.style.display = 'flex';
            if (!airportsReady()) {
                // Мягкая задержка: подождать подгрузки базы
                const tryLater = setInterval(() => {
                    if (airportsReady()) {
                        clearInterval(tryLater);
                        renderResults(''); // отрисуем пустое
                    }
                }, 150);
            }
            backdrop.classList.add('show'); // у тебя уже есть .modal-backdrop.show в CSS.  [oai_citation:4‡main.css](file-service://file-Dk4MryjG6VW3S6QYzp9WMV)
            searchInput.value = '';
            resultsEl.innerHTML = '';
            searchInput.focus();
            activeIndex = -1;
        }
        function closeModal() {
            document.documentElement.style.overflow = '';
            backdrop.classList.remove('show');
            backdrop.style.display = 'none';
            resultsEl.style.display = 'none';
        }

        // Клик по кнопке поиска
        searchBtn.addEventListener('click', openModal);
        // Закрытие модалки
        closeBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeModal();
        });

        // Навигация по списку стрелками/Enter
        let activeIndex = -1;
        function updateActiveItem() {
            const items = [...resultsEl.querySelectorAll('li')];
            items.forEach((li, idx) => {
                li.classList.toggle('is-active', idx === activeIndex);
            });
            if (activeIndex >= 0 && items[activeIndex]) {
                items[activeIndex].scrollIntoView({ block: 'nearest' });
            }
        }

        // Транслит RU -> LAT (в верхнем регистре) для поиска
        function ruToLatUpper(str) {
            if (!str) return '';
            const map = {
                'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'E','Ё':'E','Ж':'ZH','З':'Z','И':'I','Й':'Y',
                'К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R','С':'S','Т':'T','У':'U','Ф':'F',
                'Х':'H','Ц':'C','Ч':'CH','Ш':'SH','Щ':'SCH','Ъ':'','Ы':'Y','Ь':'','Э':'E','Ю':'YU','Я':'YA'
            };
            const up = String(str).toUpperCase();
            let out = '';
            for (const ch of up) {
                // латиницу пропускаем как есть
                if (/[A-Z]/.test(ch)) { out += ch; continue; }
                // цифры и прочие символы добавляем как есть (они просто не участвуют в поиске)
                if (!/[А-ЯЁ]/.test(ch)) { out += ch; continue; }
                out += (map[ch] || '');
            }
            return out;
        }

        const RECENTS_KEY = 'airport_search_recents_v1';

        function loadRecents() {
            try {
                const raw = localStorage.getItem(RECENTS_KEY);
                const arr = raw ? JSON.parse(raw) : [];
                return Array.isArray(arr) ? arr : [];
            } catch { return []; }
        }
        function saveRecents(list) {
            try { localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, 6))); } catch {}
        }
        function addRecent(item) {
            const recents = loadRecents().filter(x => x.icao !== item.icao);
            recents.unshift(item);
            saveRecents(recents);
        }
        function renderRecents() {
            const recents = loadRecents();
            resultsEl.innerHTML = '';
            if (!recents.length) return false;
            const header = document.createElement('li');
            header.className = 'search-item search-item--header';
            header.textContent = 'Недавние';
            resultsEl.appendChild(header);
            for (const r of recents) {
                const li = document.createElement('li');
                li.className = 'search-item';
                li.tabIndex = 0;
                li.dataset.icao = r.icao;
                li.innerHTML = `
                    <div>
                        <div class="search-item__code">${r.icao}${r.iata ? '/' + r.iata : ''}</div>
                        <div class="search-item__name">${r.name}</div>
                    </div>
                `;
                li.addEventListener('click', () => selectIcao(r.icao));
                li.addEventListener('keydown', (e) => { if (e.key === 'Enter') selectIcao(r.icao); });
                resultsEl.appendChild(li);
            }
            return true;
        }

        // Рендер подсказок
        function renderResults(query) {
            resultsEl.innerHTML = '';
            resultsEl.style.display = 'none'; // спрятать, пока не посчитаем
            if (!airportsReady()) return;
            const q = String(query || '');
            // для сравнения используем только буквы A-Z
            const clean = q.replace(/[^A-Z]/g, '');
            if (clean.length === 0) {
                const hasRecents = renderRecents();
                resultsEl.style.display = hasRecents ? 'block' : 'none';
                emptyEl.style.display = hasRecents ? 'none' : 'block';
                footerEl.textContent = hasRecents ? '' : '';
                footerEl.style.display = 'none';
                activeIndex = hasRecents ? 1 : -1; // 1 — первый после заголовка
                return;
            }

            // Фильтрация: startsWith — выше, потом includes
            const source = airportsList; // из main.js (загружено из airports_db.json)  [oai_citation:5‡airports_db.json](file-service://file-UjVF3eRn2kme8gaGtW1muy)
            const matches = [];

            for (const a of source) {
                const icao = (a.icao || '').toUpperCase();
                const iata = (a.iata || '').toUpperCase();
                const name = (Array.isArray(a.geo) && a.geo[0] ? a.geo[0] : '').toUpperCase();
                const nameFlat = name.replace(/[^A-Z]/g, '');

                // два набора: приоритетное совпадение по началу и по вхождению
                let score = -1;
                if (icao.startsWith(clean)) score = 100;
                else if (iata.startsWith(clean)) score = 90;
                else if (nameFlat.startsWith(clean)) score = 80;
                else if (icao.includes(clean)) score = 60;
                else if (iata.includes(clean)) score = 50;
                else if (nameFlat.includes(clean)) score = 40;

                if (score > 0) {
                    matches.push({ score, icao, iata, name });
                }
            }

            matches.sort((a, b) => b.score - a.score || a.icao.localeCompare(b.icao));
            const limited = matches.slice(0, 50);

            for (const m of limited) {
                const display = `${m.icao}${m.iata ? '/' + m.iata : ''} - ${m.name}`;
                const li = document.createElement('li');
                li.className = 'search-item';
                li.tabIndex = 0;
                li.dataset.icao = m.icao;
                li.innerHTML = `
                    <div>
                        <div class="search-item__code">
                            ${m.icao}${m.iata ? '/' + m.iata : ''}
                        </div>
                        <div class="search-item__name">${m.name}</div>
                    </div>
                `;
                li.addEventListener('click', () => selectIcao(m.icao));
                li.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') selectIcao(m.icao);
                });
                li.addEventListener('mouseenter', () => { li.style.background = 'var(--card-2)'; });
                li.addEventListener('mouseleave', () => { li.style.background = ''; });
                resultsEl.appendChild(li);
            }
            // показать/спрятать список согласно результатам
            resultsEl.style.display = limited.length ? 'block' : 'none';
            activeIndex = limited.length ? 0 : -1;
            updateActiveItem();
        }

        function selectIcao(icao, keepOpen = false) {
            if (!icaoInput) return;
            // Добавим в недавние
            try {
                const found = (airportsList || []).find(a => (a.icao || '').toUpperCase() === icao);
                if (found) addRecent({ icao: icao, iata: (found.iata || '').toUpperCase(), name: (Array.isArray(found.geo) && found.geo[0]) ? found.geo[0] : '' });
            } catch {}
            icaoInput.value = icao;
            // кинем input, чтобы сработали твои обновители кнопок и т.п.
            icaoInput.dispatchEvent(new Event('input', { bubbles: true }));
            icaoInput.focus();
            if (!keepOpen) {
                closeModal();
            } else {
                // оставляем окно открытым и выделим текст для быстрого следующего ввода
                searchInput.focus();
                searchInput.select();
            }
        }

        // Обработка ввода
        searchInput.addEventListener('input', (e) => {
            const raw = e.target.value;
            // Отображаем в верхнем регистре всегда
            const upperShown = raw.toUpperCase();
            if (upperShown !== raw) {
                const pos = e.target.selectionStart;
                e.target.value = upperShown;
                // постараемся сохранить позицию каретки
                if (typeof pos === 'number') e.target.setSelectionRange(pos, pos);
            }
            // Транслит для поиска
            const translit = ruToLatUpper(upperShown);
            renderResults(translit);
        });

        // Клавиатурная навигация
        searchInput.addEventListener('keydown', (e) => {
            const items = resultsEl.querySelectorAll('li');
            if (e.key === 'Escape') { e.preventDefault(); return closeModal(); }
            if (!items.length) return;

            const lastIndex = items.length - 1;
            const move = (delta) => {
                activeIndex = Math.min(Math.max(activeIndex + delta, 0), lastIndex);
                updateActiveItem();
            };

            if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
            else if (e.key === 'PageDown') { e.preventDefault(); move(5); }
            else if (e.key === 'PageUp') { e.preventDefault(); move(-5); }
            else if (e.key === 'Home') { e.preventDefault(); activeIndex = 0; updateActiveItem(); }
            else if (e.key === 'End') { e.preventDefault(); activeIndex = lastIndex; updateActiveItem(); }
            else if (e.key === 'Tab') { e.preventDefault(); move(e.shiftKey ? -1 : 1); }
            else if (e.key === 'Enter') {
                e.preventDefault();
                // Ctrl/Cmd+Enter — вставить и оставить окно открытым
                const keepOpen = e.ctrlKey || e.metaKey;
                if (activeIndex >= 0) {
                    const icao = items[activeIndex].dataset.icao;
                    selectIcao(icao, keepOpen);
                }
            }
        });
    });
})();