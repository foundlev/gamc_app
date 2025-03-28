document.addEventListener('DOMContentLoaded', function() {
    let startY = 0;

    // Запоминаем начальную позицию касания
    document.addEventListener('touchstart', function(e) {
        startY = e.touches[0].clientY;
    }, { passive: true });

    // Если пользователь тянет вниз, проверяем, офлайн ли
    document.addEventListener('touchmove', function(e) {
        const currentY = e.touches[0].clientY;
        // Если жест начинается с верхней части страницы (startY маленькое)
        // и смещение вниз более 50 пикселей, а интернет отсутствует
        if (startY < 100 && currentY - startY > 50 && !navigator.onLine) {
            e.preventDefault();
        }
    }, { passive: false });
});