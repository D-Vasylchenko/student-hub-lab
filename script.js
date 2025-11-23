// підключення Firebase
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

//змінні стану
let currentUser = null;
let currentChatID = 'general'; // За замовчуванням загальний чат
let currentChatType = 'public';
let activeListenerPath = null; // Щоб вимикати прослуховування старого чату

//елементи DOM
const authDiv = document.getElementById('auth-container');
const appDiv = document.getElementById('app-container');
const msgBox = document.getElementById('messages-box');
const chatTitle = document.getElementById('chat-title');
const usersListDiv = document.getElementById('users-list');

//глобальні функції
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.sendMessage = sendMessage;
window.switchChat = switchChat;
window.getMiniWeather = getMiniWeather;
//Преревірка входу
window.onload = function() {
    const saved = localStorage.getItem('currentUser');
    if (saved) initApp(saved);
};

//Авторизація
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
        } else {
            alert("Помилка входу");
        }
    });
}

function logoutUser() {
    localStorage.removeItem('currentUser');
    location.reload();
}

// ініціалізація додатку
function initApp(username) {
    currentUser = username;
    authDiv.style.display = 'none';
    appDiv.style.display = 'flex'; // Flex, щоб сайдбар і чат були поруч
    document.getElementById('current-user-name').innerText = `● ${username}`;

    loadUsersList(); // Завантажити список людей для ДМ
    switchChat('general', 'public'); // Зайти в дефолтний чат
}

// логіка чату (core)

//завантаження списку користувачів для меню
function loadUsersList() {
    const dbRef = ref(db, 'users');
    get(dbRef).then((snapshot) => {
        usersListDiv.innerHTML = '';
        if (snapshot.exists()) {
            const users = snapshot.val();
            for (const userKey in users) {
                if (userKey === currentUser) continue; // Не показувати себе

                const div = document.createElement('div');
                div.className = 'channel-item';
                div.innerHTML = `<div class="status-dot online"></div> ${userKey}`;
                div.onclick = () => switchChat(userKey, 'private');
                usersListDiv.appendChild(div);
            }
        }
    });
}

//перемикання кімнат
function switchChat(targetID, type) {
    //відписуємося від старого чату (щоб повідомлення не дублювалися)
    if (activeListenerPath) {
        off(ref(db, activeListenerPath));
    }

    currentChatType = type;
    msgBox.innerHTML = ''; //очистити екран

    // 2. Визначаємо ID кімнати
    if (type === 'public') {
        currentChatID = targetID;
        chatTitle.innerText = `# ${targetID}`;
        activeListenerPath = `public_chats/${targetID}`;
    } else {
        //логіка для ПРИВАТНОГО чату: Сортуємо імена, щоб ID був однаковий для обох
        const ids = [currentUser, targetID].sort();
        currentChatID = `${ids[0]}_${ids[1]}`;
        chatTitle.innerText = `💬 Чат з ${targetID}`;
        activeListenerPath = `private_chats/${currentChatID}`;
    }

    //підсвітка активного пункту в меню (візуально)
    document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
    // (тут можна додати логіку додавання класу active до натиснутого елемента, але для простоти пропустимо)

    //слухаємо повідомлення в новій кімнаті
    const chatRef = ref(db, activeListenerPath);
    onChildAdded(chatRef, (snapshot) => {
        const msg = snapshot.val();
        renderMessage(msg);
    });
}

function sendMessage() {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if (!text) return;

    //відправляємо в поточний activeListenerPath
    push(ref(db, activeListenerPath), {
        user: currentUser,
        text: text,
        time: Date.now()
    });

    input.value = '';
}

function renderMessage(msg) {
    const isMine = msg.user === currentUser;

    const div = document.createElement('div');
    div.className = `message ${isMine ? 'msg-mine' : 'msg-other'}`;

    // Час
    const time = new Date(msg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    div.innerHTML = `
        <span class="msg-sender">${msg.user}</span>
        ${msg.text}
        <div style="font-size: 0.6rem; text-align: right; opacity: 0.7; margin-top: 5px;">${time}</div>
    `;

    msgBox.appendChild(div);
    msgBox.scrollTop = msgBox.scrollHeight; // Автоскрол вниз
}

//погода
const apiKey = '92601328e641e8e4a8092a6f765b74cd';

async function getMiniWeather(city) {
    if(city.length < 3) return;
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=ua`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.cod === 200) {
            document.getElementById('w-temp').innerText = Math.round(data.main.temp) + "°";
            document.getElementById('w-desc').innerText = data.weather[0].description;
            document.getElementById('w-icon').src = `https://openweathermap.org/img/wn/${data.weather[0].icon}.png`;
            document.getElementById('w-icon').style.display = 'block';
        }
    } catch (e) { console.error(e); }
}