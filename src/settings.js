import { state } from './state.js';
import { deleteUserProfile } from './profile.js'; // Імпортуємо функцію видалення

export const appSettings = {
    theme: localStorage.getItem('theme') || 'light',
    sound: localStorage.getItem('sound') === 'false' ? false : true,
};

const notificationSound = new Audio('https://cdn.freesound.org/previews/536/536108_11586568-lq.mp3');

export function initSettings() {
    if (appSettings.theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        const toggle = document.getElementById('theme-toggle');
        if (toggle) toggle.checked = true;
    }
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) soundToggle.checked = appSettings.sound;
}

export function toggleTheme() {
    if (document.body.getAttribute('data-theme') === 'dark') {
        document.body.removeAttribute('data-theme');
        appSettings.theme = 'light';
    } else {
        document.body.setAttribute('data-theme', 'dark');
        appSettings.theme = 'dark';
    }
    localStorage.setItem('theme', appSettings.theme);
}

export function toggleSound() {
    appSettings.sound = !appSettings.sound;
    localStorage.setItem('sound', appSettings.sound);
}

export function playNotificationSound() {
    if (appSettings.sound) {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(() => console.log('Sound blocked by browser'));
    }
}
export function openSettingsModal() {
    document.getElementById('settings-modal').style.display = 'flex';
}
export function closeSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
}

export function deleteMyAccount() {
    deleteUserProfile(state.currentUser);
}
