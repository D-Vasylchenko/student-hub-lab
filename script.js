
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, update, get, child, push, onChildAdded, off } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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
const storage = getStorage(app); //ініціалізація сховища

let currentUser = null;
let currentChatID = 'general';
let activeListenerPath = null;
let weatherTimeout = null;
const weatherKey = '92601328e641e8e4a8092a6f765b74cd';

window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.sendMessage = sendMessage;
window.switchChat = switchChat;
window.openForecastModal = openForecastModal;
window.closeForecastModal = closeForecastModal;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.saveProfile = saveProfile;

document.addEventListener('DOMContentLoaded', () => {
    const wInput = document.getElementById('w-input');
    if(wInput) wInput.addEventListener('input', (e) => handleWeatherInput(e.target.value));

    const fileInput = document.getElementById('profile-avatar-file');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('profile-edit-preview').src = e.target.result;
                }
                reader.readAsDataURL(file);
            }
        });
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

    get(child(ref(db), `users/${user}`)).then((snapshot) => {
        if (snapshot.exists()) alert("Нік зайнятий!");
        else {
            set(ref(db, 'users/' + user), { password: pass, name: user, avatar: '', about: '' });
            alert("Готово! Тисни Увійти.");
        }
    });
}

function loginUser() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    get(child(ref(db), `users/${user}`)).then((snapshot) => {
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
    updateSidebarProfile();
    loadUsersList();
    switchChat('general', 'public');
}
function updateSidebarProfile() {
    get(child(ref(db), `users/${currentUser}`)).then((snapshot) => {
        if(snapshot.exists()) {
            const data = snapshot.val();
            const avatarUrl = data.avatar || `https://ui-avatars.com/api/?name=${currentUser}&background=random`;
            document.getElementById('sidebar-avatar').src = avatarUrl;
            document.getElementById('current-user-name').innerText = currentUser;
        }
    });
}

//targetUsername - це нік того, кого ми хочемо подивитись
//якщо не передали (undefined), значить відкриваємо свій профіль
function openProfileModal(targetUsername) {
    //якщо аргумент не переданий, значить це ми
    const userToView = targetUsername || currentUser;
    const isMyProfile = userToView === currentUser;

    get(child(ref(db), `users/${userToView}`)).then((snapshot) => {
        if(snapshot.exists()) {
            const data = snapshot.val();
            const avatarUrl = data.avatar || `https://ui-avatars.com/api/?name=${userToView}&background=random`;

            //заповнюємо даними
            document.getElementById('profile-edit-preview').src = avatarUrl;
            document.getElementById('profile-about-input').value = data.about || '';

            //змінюємо заголовок
            const modalTitle = document.querySelector('#profile-modal h2');
            modalTitle.innerText = isMyProfile ? "👤 Мій Профіль" : `👤 Профіль ${userToView}`;

            //елементи управління (ховаємо, якщо чужий профіль)
            const fileInput = document.getElementById('profile-avatar-file');
            const saveBtn = document.getElementById('save-btn');
            const aboutInput = document.getElementById('profile-about-input');
            const avatarInputText = document.querySelector('#profile-modal p'); //текст "Завантажити фото"

            if (isMyProfile) {
                fileInput.style.display = 'block';
                saveBtn.style.display = 'block';
                aboutInput.disabled = false;
                if(avatarInputText) avatarInputText.style.display = 'block';
            } else {
                fileInput.style.display = 'none';
                saveBtn.style.display = 'none';
                aboutInput.disabled = true;
                if(avatarInputText) avatarInputText.style.display = 'none';
            }

            document.getElementById('profile-modal').style.display = 'flex';
        }
    });
}
async function saveProfile() {
    const fileInput = document.getElementById('profile-avatar-file');
    const newAbout = document.getElementById('profile-about-input').value.trim();
    const saveBtn = document.getElementById('save-btn');

    const file = fileInput.files[0];
    let newAvatarUrl = null;

    saveBtn.innerText = "⏳ Завантаження...";
    saveBtn.disabled = true;

    try {
        //якщо вибрано файл — вантажимо його в Storage
        if (file) {
            const storageRef = sRef(storage, `avatars/${currentUser}`); // Шлях: avatars/ImyaUsera
            await uploadBytes(storageRef, file); // Завантаження
            newAvatarUrl = await getDownloadURL(storageRef); // Отримання посилання
        }

        //формуємо об'єкт для оновлення
        const updates = { about: newAbout };
        if (newAvatarUrl) {
            updates.avatar = newAvatarUrl;
        }

        //оновлюємо базу даних
        await update(ref(db, 'users/' + currentUser), updates);

        alert("Профіль оновлено!");
        updateSidebarProfile();
        closeProfileModal();

    } catch (error) {
        console.error("Помилка:", error);
        alert("Не вдалося завантажити фото. Перевірте консоль.");
    } finally {
        saveBtn.innerText = "💾 Зберегти зміни";
        saveBtn.disabled = false;
    }
}

function closeProfileModal() {
    document.getElementById('profile-modal').style.display = 'none';
}
function loadUsersList() {
    get(ref(db, 'users')).then((snapshot) => {
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
    onChildAdded(ref(db, activeListenerPath), (snapshot) => renderMessage(snapshot.val()));
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
    const box = document.getElementById('messages-box');

    const wrapper = document.createElement('div');
    wrapper.className = `msg-wrapper ${isMine ? 'mine' : 'other'}`;

    // аватарка
    const img = document.createElement('img');
    img.className = 'chat-avatar';
    //заглушка, поки звантажиться
    img.src = `https://ui-avatars.com/api/?name=${msg.user}&background=random`;

    //клікабельна аватарка
    img.onclick = () => openProfileModal(msg.user);

    //шукаємо реальну аватарку в базі
    get(child(ref(db), `users/${msg.user}`)).then((snapshot) => {
        if (snapshot.exists() && snapshot.val().avatar) {
            img.src = snapshot.val().avatar;
        }
    });

    //бульбашка з текстом
    const bubble = document.createElement('div');
    bubble.className = `message ${isMine ? 'msg-mine' : 'msg-other'}`;

    const time = new Date(msg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    //додаємо ім'я (клік теж відкриває профіль)
    let senderHtml = isMine ? '' : `<span class="msg-sender" onclick="openProfileModal('${msg.user}')">${msg.user}</span>`;

    bubble.innerHTML = `
        ${senderHtml}
        ${msg.text}
        <div style="font-size: 0.6rem; text-align: right; opacity: 0.7; margin-top: 5px;">${time}</div>
    `;

    //збираємо все разом
    wrapper.appendChild(img);
    wrapper.appendChild(bubble);

    box.appendChild(wrapper);
    box.scrollTop = box.scrollHeight;
}
function handleWeatherInput(query) {
    const list = document.getElementById('weather-suggestions');
    clearTimeout(weatherTimeout);
    list.innerHTML = ''; list.style.display = 'none';
    if(query.length < 3) return;

    weatherTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&accept-language=uk&limit=5`);
            const cities = await res.json();
            if(cities.length > 0) {
                cities.forEach(city => {
                    const li = document.createElement('li');
                    li.innerText = city.display_name.split(',').slice(0, 2).join(',');
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
    try {
        const [currRes, foreRes] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherKey}&units=metric&lang=ua`),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${weatherKey}&units=metric&lang=ua`)
        ]);
        const currData = await currRes.json();
        const foreData = await foreRes.json();

        document.getElementById('w-temp').innerText = Math.round(currData.main.temp) + "°";
        document.getElementById('w-icon').src = `https://openweathermap.org/img/wn/${currData.weather[0].icon}.png`;
        document.getElementById('w-icon').style.display = 'block';

        window.currentForecastData = { city: cityName, desc: currData.weather[0].description, list: foreData.list };
    } catch(e) { console.error(e); }
}

function openForecastModal() {
    if (!window.currentForecastData) {
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
        const div = document.createElement('div');
        div.className = 'forecast-card';
        const day = date.toLocaleDateString('uk-UA', { weekday: 'short' });
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const icon = `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`;
        const temp = Math.round(item.main.temp);
        div.innerHTML = `
            <div class="f-time" style="font-weight:bold">${day}</div>
            <div class="f-time">${time}</div>
            <img src="${icon}" width="40">
            <div class="f-temp">${temp}°</div>
        `;

        grid.appendChild(div);
    });

    document.getElementById('forecast-modal').style.display = 'flex';
}
function closeForecastModal() { document.getElementById('forecast-modal').style.display = 'none'; }