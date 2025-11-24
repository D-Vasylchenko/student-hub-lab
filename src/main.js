import { loginUser, registerUser, logoutUser } from './auth.js';
import {
    updateSidebarProfile,
    openProfileModal,
    closeProfileModal,
    saveProfile,
    startChatFromModal,
} from './profile.js';
import {
    sendMessage,
    switchChat,
    watchChatActivity,
    loadActiveChats,
    deleteMessage,
    openUsersModal,
    closeUsersModal,
    filterUsersList,
} from './chat.js';
import { handleWeatherInput, openForecastModal, closeForecastModal } from './weather.js';
import { setCurrentUser } from './state.js';
import {
    initSettings,
    toggleTheme,
    toggleSound,
    openSettingsModal,
    closeSettingsModal,
    deleteMyAccount,
} from './settings.js';

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
window.handleWeatherInput = handleWeatherInput;
window.startChatFromModal = startChatFromModal;
window.deleteMessage = deleteMessage;
window.toggleTheme = toggleTheme;
window.toggleSound = toggleSound;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.deleteMyAccount = deleteMyAccount;
window.openUsersModal = openUsersModal;
window.closeUsersModal = closeUsersModal;
window.filterUsersList = filterUsersList;

export function initApp(username) {
    setCurrentUser(username);

    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';

    initSettings();
    updateSidebarProfile();
    loadActiveChats(); // Завантажуємо тільки активні чати

    watchChatActivity('general', 'public', 'chat-link-general');
    watchChatActivity('homework', 'public', 'chat-link-homework');
    watchChatActivity('offtopic', 'public', 'chat-link-offtopic');

    switchChat('general', 'public');
}

document.addEventListener('DOMContentLoaded', () => {
    const wInput = document.getElementById('w-input');
    if (wInput) wInput.addEventListener('input', (e) => handleWeatherInput(e.target.value));

    const fileInput = document.getElementById('profile-avatar-file');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
                    alert('⚠️ HEIC не підтримується.');
                    return;
                }
                const reader = new FileReader();
                reader.onload = function (e) {
                    document.getElementById('profile-edit-preview').src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const closeButtons = document.querySelectorAll('.close-btn');
    closeButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            document.getElementById('forecast-modal').style.display = 'none';
            document.getElementById('profile-modal').style.display = 'none';
            document.getElementById('settings-modal').style.display = 'none';
            document.getElementById('users-modal').style.display = 'none';
        });
    });

    const msgInput = document.getElementById('msg-input');
    if (msgInput) {
        msgInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});

window.onload = function () {
    const saved = localStorage.getItem('currentUser');
    if (saved) initApp(saved);
};
