function convertToHash(obj) {
    // Получаем отсортированный список ключей
    const keys = Object.keys(obj).sort();
    let str = '';
    // Собираем строку вида "ключ:значение;"
    for (const key of keys) {
        let value = obj[key];
        // Если значение тоже объект, сериализуем его
        if (value && typeof value === 'object') {
            value = JSON.stringify(value);
        }
        str += key + ':' + value + ';';
    }
    // Вычисляем хэш с использованием алгоритма djb2
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    // Приводим результат к беззнаковому 32-битному целому
    return (hash >>> 0).toString();
}

function setSyncDataHash(data) {
    localStorage.setItem('syncDataHash', convertToHash(data));
}

function getSyncDataHash() {
    return localStorage.getItem('syncDataHash') || '';
}

function markNowDataAsSynced() {
    const savedData = {
        savedRoutes: localStorage.getItem('savedRoutes'),
        landingSystems: localStorage.getItem('landingSystems')
    }
    setSyncDataHash(savedData);
    updateExportButtonState();
}

function needToUploadData(nowData) {
    const savedHash = getSyncDataHash();
    const newHash = convertToHash(nowData);

    return savedHash && savedHash.toString() !== newHash.toString();
}

function updateExportButtonState() {
    const exportBtn = document.getElementById('exportGamcUidBtn');
    if (exportBtn) {
        const savedData = {
            savedRoutes: localStorage.getItem('savedRoutes'),
            landingSystems: localStorage.getItem('landingSystems')
        }

        exportBtn.classList.toggle('need-sync', needToUploadData(savedData))
    }
}