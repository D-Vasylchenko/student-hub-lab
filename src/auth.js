import { ref, get, set, child } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { db } from './config.js';

export function registerUser() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    if (!user || !pass) return alert('Заповніть дані');

    get(child(ref(db), `users/${user}`)).then((snapshot) => {
        if (snapshot.exists()) alert('Зайнято!');
        else set(ref(db, 'users/' + user), { password: pass, name: user }).then(() => alert('Ок. Увійдіть.'));
    });
}

export function loginUser() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();

    get(child(ref(db), `users/${user}`)).then((s) => {
        if (s.exists() && s.val().password === pass) {
            localStorage.setItem('currentUser', user);

            window.location.reload();
        } else alert('Помилка входу');
    });
}

export function logoutUser() {
    localStorage.removeItem('currentUser');
    location.reload();
}
