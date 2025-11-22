const apiKey = '92601328e641e8e4a8092a6f765b74cd';

async function getWeather() {
    const city = document.getElementById('city-input').value;

    if (!city) {
        alert('Введіть назву міста!');
        return;
    }

    // URL для поточної погоди
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=ua`;
    //URL для прогнозу (forecast)
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric&lang=ua`;

    try {
        //Отримуємо поточну погоду
        const currentResponse = await fetch(currentUrl);
        if (!currentResponse.ok) throw new Error("Помилка пошуку міста");
        const currentData = await currentResponse.json();

        //Отримуємо прогноз
        const forecastResponse = await fetch(forecastUrl);
        const forecastData = await forecastResponse.json();

        //Відображаємо базові дані
        document.getElementById('city-name').innerText = currentData.name;
        document.getElementById('temp').innerText = Math.round(currentData.main.temp);
        document.getElementById('description').innerText = currentData.weather[0].description;

        // Аналіз наступних годин
        const nextHours = forecastData.list.slice(0, 2);

        let futureRain = false;
        let futureWind = false;
        let forecastText = "Прогноз на найближчий час:<br>";

        nextHours.forEach(item => {
            //Час прогнозу(години)
            const time = item.dt_txt.split(" ")[1].slice(0, 5);
            const temp = Math.round(item.main.temp);
            const desc = item.weather[0].description;

            // Додаємо рядок у HTML
            forecastText += `${time} ➔ ${temp}°C, ${desc}<br>`;

            // Перевірка на дощ (якщо в описі є слово "дощ")
            if (item.weather[0].main === 'Rain' || desc.includes('дощ')) {
                futureRain = true;
            }
            //Перевірка на сильний вітер (> 7 м/с)
            if (item.wind.speed > 7) {
                futureWind = true;
            }
        });

        document.getElementById('forecast').innerHTML = forecastText;

        //Формування Розумної Поради
        let advice = "";
        const t = currentData.main.temp;

        // Базовий одяг по температурі
        if (t < 0) advice = "Одягай зимову куртку, шапку та рукавиці ❄️.";
        else if (t < 10) advice = "Вдягни пальто або теплу куртку 🧥.";
        else if (t < 18) advice = "Вітрівка або худі — те, що треба 👌.";
        else advice = "Можна в футболці, тепло! ☀️";

        // Додаткові попередження на основі прогнозу
        if (futureRain) {
            advice += " <br><span class='alert'>⚠️ Увага: скоро буде дощ! Візьми парасольку! ☔</span>";
        }

        if (futureWind) {
            advice += " <br><span class='alert'>⚠️ Увага: очікується сильний вітер! Одягайся щільніше 💨.</span>";
        }

        document.getElementById('clothing-advice').innerHTML = advice;
        document.getElementById('weather-result').style.display = 'block';

    } catch (error) {
        console.error(error);
        alert("Щось пішло не так. Перевір консоль або правильність міста.");
    }
}
