const apiKey = '92601328e641e8e4a8092a6f765b74cd';
const cityInput = document.getElementById('city-input');
const suggestionsList = document.getElementById('suggestions');
let timeoutId;

cityInput.addEventListener('input', handleInput);

function handleInput() {
    const query = cityInput.value.trim();
    clearTimeout(timeoutId);
    suggestionsList.innerHTML = '';
    suggestionsList.style.display = 'none';

    if (query.length < 3) return;

    //Таймер debounce (чекаємо 500мс після завершення вводу)
    timeoutId = setTimeout(() => {
        fetchCities(query);
    }, 500);
}

//Використовуємо Nominatim API для пошуку
async function fetchCities(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&accept-language=uk&limit=5`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'WeatherWear-Student-Project' //Важливо для Nominatim
            }
        });
        const cities = await response.json();

        if (cities.length > 0) {
            showSuggestions(cities);
        } else {
            suggestionsList.style.display = 'none';
        }
    } catch (error) {
        console.error("Помилка пошуку:", error);
    }
}

function showSuggestions(cities) {
    suggestionsList.innerHTML = '';

    cities.forEach(city => {
        const li = document.createElement('li');

        //Nominatim дає повну назву у полі display_name
        const displayName = city.display_name;

        li.innerHTML = `
            <div style="text-align: left;">
                <span style="font-size: 1em; color: #333;">${displayName}</span>
            </div>
        `;

        li.onclick = () => {
            // Беремо першу частину назви (саме місто) для інпуту
            cityInput.value = displayName.split(',')[0];
            suggestionsList.style.display = 'none';

            //Передаємо координати та повну назву
            getWeather(city.lat, city.lon, displayName);
        };

        suggestionsList.appendChild(li);
    });

    suggestionsList.style.display = 'block';
}

//Функція погоди приймає lat, lon та повну назву
async function getWeather(lat, lon, fullName) {
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ua`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ua`;

    try {
        const currentResponse = await fetch(currentUrl);
        const currentData = await currentResponse.json();

        const forecastResponse = await fetch(forecastUrl);
        const forecastData = await forecastResponse.json();

        //Виводимо повну назву (з районом), яку дав Nominatim
        document.getElementById('city-name').innerText = fullName || currentData.name;

        document.getElementById('temp').innerText = Math.round(currentData.main.temp);
        document.getElementById('description').innerText = currentData.weather[0].description;

        const nextHours = forecastData.list.slice(0, 2);
        let futureRain = false;
        let futureWind = false;
        let forecastHtml = "";

        nextHours.forEach(item => {
            const time = item.dt_txt.split(" ")[1].slice(0, 5);
            const t = Math.round(item.main.temp);
            forecastHtml += `🕐 ${time}: ${t}°C, ${item.weather[0].description}<br>`;

            if (item.weather[0].main === 'Rain' || item.weather[0].description.includes('дощ')) futureRain = true;
            if (item.wind.speed > 7) futureWind = true;
        });

        document.getElementById('forecast').innerHTML = forecastHtml;

        let advice = getAdvice(currentData.main.temp, futureRain, futureWind);
        document.getElementById('clothing-advice').innerHTML = advice;
        document.getElementById('weather-result').style.display = 'block';

    } catch (error) {
        console.error(error);
        alert("Не вдалося отримати погоду.");
    }
}

function getAdvice(temp, rain, wind) {
    let advice = "";
    if (temp < 0) advice = "🥶 Мороз! Пуховик, шапка, шарф.";
    else if (temp < 10) advice = "🧥 Холодно. Одягай пальто або теплу куртку.";
    else if (temp < 18) advice = "🍂 Прохолодно. Вітрівка або худі підійдуть.";
    else advice = "☀️ Тепло! Футболка і шорти.";

    if (rain) advice += "<br><span class='alert'>☔ Скоро дощ! Парасолька обов'язкова!</span>";
    if (wind) advice += "<br><span class='alert'>💨 Сильний вітер! Бережи зачіску.</span>";

    return "💡 " + advice;
}