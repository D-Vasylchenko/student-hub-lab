import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child, push, onChildAdded, off } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCTpIXvhSz3Q4zfE0ozp3GhZZ0zFWCarTY",
    authDomain: "weather-labs-278ab.firebaseapp.com",
    databaseURL: "https://weather-labs-278ab-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "weather-labs-278ab",
    storageBucket: "weather-labs-278ab.firebasestorage.app",
    messagingSenderId: "348040144330",
    appId: "1:348040144330:web:555082fe9d85ea4b3b1b33"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let currentUser = null;
let currentChatID = 'general';
let activeListenerPath = null;
let weatherTimeout = null; // Таймер для пошуку міст

const weatherKey = '92601328e641e8e4a8092a6f765b74cd';

window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.sendMessage = sendMessage;
window.switchChat = switchChat;
window.openForecastModal = openForecastModal;
window.closeForecastModal = closeForecastModal;

document.addEventListener('DOMContentLoaded', () => {
    const wInput = document.getElementById('w-input');
    if(wInput) {
        wInput.addEventListener('input', (e) => handleWeatherInput(e.target.value));
    }
});

window.onload = function() {
    const saved = localStorage.getItem('currentUser');
    if (saved) initApp(saved);
};
function registerUser() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    if (!user || !pass) return alert("Заповніть дані");

    const dbRef = ref(db);
    get(child(dbRef, `users/${user}`)).then((snapshot) => {
        if (snapshot.exists()) alert("Нік зайнятий!");
        else {
            set(ref(db, 'users/' + user), { password: pass, name: user });
            alert("Готово! Тисни Увійти.");
        }
    });
}

function loginUser() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();

    const dbRef = ref(db);
    get(child(dbRef, `users/${user}`)).then((snapshot) => {
        if (snapshot.exists() && snapshot.val().password === pass) {
            localStorage.setItem('currentUser', user);
            initApp(user);
        } else { alert("Помилка входу"); }
    });
}

function logoutUser() {
    localStorage.removeItem('currentUser');
    location.reload();
}

function initApp(username) {
    currentUser = username;
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    document.getElementById('current-user-name').innerText = `● ${username}`;
    loadUsersList();
    switchChat('general', 'public');
}

function loadUsersList() {
    const dbRef = ref(db, 'users');
    get(dbRef).then((snapshot) => {
        const listDiv = document.getElementById('users-list');
        listDiv.innerHTML = '';
        if (snapshot.exists()) {
            const users = snapshot.val();
            for (const userKey in users) {
                if (userKey === currentUser) continue;
                const div = document.createElement('div');
                div.className = 'channel-item';
                div.innerHTML = `<div class="status-dot online"></div> ${userKey}`;
                div.onclick = () => switchChat(userKey, 'private');
                listDiv.appendChild(div);
            }
        }
    });
}

function switchChat(targetID, type) {
    if (activeListenerPath) off(ref(db, activeListenerPath));
    const msgBox = document.getElementById('messages-box');
    msgBox.innerHTML = '';

    if (type === 'public') {
        currentChatID = targetID;
        document.getElementById('chat-title').innerText = `# ${targetID}`;
        activeListenerPath = `public_chats/${targetID}`;
    } else {
        const ids = [currentUser, targetID].sort();
        currentChatID = `${ids[0]}_${ids[1]}`;
        document.getElementById('chat-title').innerText = `💬 Чат з ${targetID}`;
        activeListenerPath = `private_chats/${currentChatID}`;
    }
    document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));

    onChildAdded(ref(db, activeListenerPath), (snapshot) => {
        renderMessage(snapshot.val());
    });
}

function sendMessage() {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if (!text) return;
    push(ref(db, activeListenerPath), { user: currentUser, text: text, time: Date.now() });
    input.value = '';
}

function renderMessage(msg) {
    const isMine = msg.user === currentUser;
    const div = document.createElement('div');
    div.className = `message ${isMine ? 'msg-mine' : 'msg-other'}`;
    const time = new Date(msg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    div.innerHTML = `<span class="msg-sender">${msg.user}</span>${msg.text}<div style="font-size: 0.6rem; text-align: right; opacity: 0.7; margin-top: 5px;">${time}</div>`;
    const box = document.getElementById('messages-box');
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function handleWeatherInput(query) {
    const list = document.getElementById('weather-suggestions');
    clearTimeout(weatherTimeout);
    list.innerHTML = '';
    list.style.display = 'none';

    if(query.length < 3) return;

    weatherTimeout = setTimeout(async () => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&accept-language=uk&limit=5`;
        try {
            const res = await fetch(url);
            const cities = await res.json();

            if(cities.length > 0) {
                cities.forEach(city => {
                    const li = document.createElement('li');
                    li.innerText = city.display_name.split(',').slice(0, 2).join(','); // Скорочуємо назву
                    li.onclick = () => {
                        document.getElementById('w-input').value = city.display_name.split(',')[0];
                        list.style.display = 'none';
                        loadFullWeather(city.lat, city.lon, city.display_name.split(',')[0]);
                    };
                    list.appendChild(li);
                });
                list.style.display = 'block';
            }
        } catch(e) { console.error(e); }
    }, 500);
}

async function loadFullWeather(lat, lon, cityName) {
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherKey}&units=metric&lang=ua`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${weatherKey}&units=metric&lang=ua`;

    try {
        const [currRes, foreRes] = await Promise.all([fetch(currentUrl), fetch(forecastUrl)]);
        const currData = await currRes.json();
        const foreData = await foreRes.json();

        document.getElementById('w-temp').innerText = Math.round(currData.main.temp) + "°";
        document.getElementById('w-desc').innerText = currData.weather[0].description;
        document.getElementById('w-icon').src = `https://openweathermap.org/img/wn/${currData.weather[0].icon}.png`;
        document.getElementById('w-icon').style.display = 'block';

        window.currentForecastData = {
            city: cityName,
            desc: currData.weather[0].description,
            list: foreData.list
        };

    } catch(e) { console.error("Weather Error", e); }
}

// 3. Відкриття Модалки
function openForecastModal() {
    if(!window.currentForecastData) {
        alert("Спочатку знайдіть місто!");
        return;
    }

    const data = window.currentForecastData;
    document.getElementById('modal-city-name').innerText = data.city;
    document.getElementById('modal-current-desc').innerText = data.desc;

    const grid = document.getElementById('modal-forecast-grid');
    grid.innerHTML = '';


    data.list.slice(0, 15).forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayName = date.toLocaleDateString('uk-UA', { weekday: 'short' });
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const div = document.createElement('div');
        div.className = 'forecast-card';
        div.innerHTML = `
            <div class="f-time" style="font-weight:bold">${dayName}</div>
            <div class="f-time">${time}</div>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" width="40">
            <div class="f-temp">${Math.round(item.main.temp)}°</div>
        `;
        grid.appendChild(div);
    });

    document.getElementById('forecast-modal').style.display = 'flex';
}

function closeForecastModal() {
    document.getElementById('forecast-modal').style.display = 'none';
}