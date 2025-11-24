let weatherTimeout = null;
const weatherKey = '92601328e641e8e4a8092a6f765b74cd';

export function handleWeatherInput(q) {
    const list = document.getElementById('weather-suggestions');
    clearTimeout(weatherTimeout);
    list.innerHTML = '';
    list.style.display = 'none';

    if (q.length < 3) return;

    weatherTimeout = setTimeout(async () => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${q}&accept-language=uk&limit=5`,
            );
            const cities = await res.json();

            if (cities.length) {
                list.style.display = 'block';
                cities.forEach((c) => {
                    const li = document.createElement('li');
                    li.innerText = c.display_name;
                    li.onclick = () => {
                        document.getElementById('w-input').value = c.display_name.split(',')[0];
                        list.style.display = 'none';
                        loadFullWeather(c.lat, c.lon, c.display_name.split(',')[0]);
                    };
                    list.appendChild(li);
                });
            }
        } catch (e) {
            console.error(e);
        }
    }, 500);
}

async function loadFullWeather(lat, lon, name) {
    try {
        const [cR, fR] = await Promise.all([
            fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherKey}&units=metric&lang=ua`,
            ),
            fetch(
                `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${weatherKey}&units=metric&lang=ua`,
            ),
        ]);

        const cD = await cR.json();
        const fD = await fR.json();

        document.getElementById('w-temp').innerText = Math.round(cD.main.temp) + '°';
        document.getElementById('w-icon').src = `https://openweathermap.org/img/wn/${cD.weather[0].icon}.png`;
        document.getElementById('w-icon').style.display = 'block';

        window.currentForecastData = { city: name, desc: cD.weather[0].description, list: fD.list };
    } catch (e) {
        console.error(e);
    }
}

export function openForecastModal() {
    if (!window.currentForecastData) return alert('Знайдіть місто!');

    const d = window.currentForecastData;
    document.getElementById('modal-city-name').innerText = d.city;
    document.getElementById('modal-current-desc').innerText = d.desc;

    const g = document.getElementById('modal-forecast-grid');
    g.innerHTML = '';

    d.list.slice(0, 15).forEach((i) => {
        const date = new Date(i.dt * 1000);
        const div = document.createElement('div');
        div.className = 'forecast-card';
        div.innerHTML = `
            <div class="f-time"><b>${date.toLocaleDateString('uk', { weekday: 'short' })}</b></div>
            <div class="f-time">${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <img src="https://openweathermap.org/img/wn/${i.weather[0].icon}.png" width="40">
            <div class="f-temp">${Math.round(i.main.temp)}°</div>
        `;
        g.appendChild(div);
    });

    document.getElementById('forecast-modal').style.display = 'flex';
}

export function closeForecastModal() {
    document.getElementById('forecast-modal').style.display = 'none';
}
