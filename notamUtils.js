async function getNotam(icaoList) {
    const password = localStorage.getItem(PASSWORD_KEY) || '';

    // Если icaoList передан как массив, преобразуем в строку через запятую
    let icaos = Array.isArray(icaoList) ? icaoList.join(', ') : icaoList;

    // Подготовка FormData для отправки POST-запроса
    const formData = new FormData();
    formData.append('icaos', icaos);
    formData.append('password', password);

    return fetch('https://myapihelper.na4u.ru/gamc_app/notams.php', {
        method: 'POST',
        body: formData
    })
    .then(async response => {
        if (!response.ok) {
            throw new Error('Ошибка запроса: ' + response.status);
        }

        let savedNotam = JSON.parse(localStorage.getItem('notamData') || '{}');
        const newNotams = await response.json();
        console.log('newNotams:', newNotams);

        // Проходимся по ключам newNotams = {"UUEE": {},...} и добавляем обновленное в savedNotam.
        for (const key in newNotams) {
            if (newNotams[key] && newNotams[key].notams) {
                savedNotam[key] = newNotams[key];
            }
        }
        console.log('savedNotam:', savedNotam);
        localStorage.setItem('notamData', JSON.stringify(savedNotam));

        return true;
    }).catch(err => {});
}