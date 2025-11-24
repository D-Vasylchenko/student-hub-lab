import { ref, get, update, child, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import {
    ref as sRef,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { db, storage } from './config.js';
import { state } from './state.js';
import { logoutUser } from './auth.js';
// 👇 ВИПРАВЛЕНО: Імпортуємо loadActiveChats замість loadUsersList
import { switchChat, loadActiveChats } from './chat.js';

let currentProfileUser = null;

export function updateSidebarProfile() {
    get(child(ref(db), `users/${state.currentUser}`)).then((s) => {
        if (s.exists()) {
            document.getElementById('sidebar-avatar').src =
                s.val().avatar || `https://ui-avatars.com/api/?name=${state.currentUser}&background=random`;
            document.getElementById('current-user-name').innerText = state.currentUser;
        }
    });
}

export function openProfileModal(targetUsername) {
    const userToView = targetUsername || state.currentUser;
    currentProfileUser = userToView;
    const isMyProfile = userToView === state.currentUser;
    const isAdmin = state.currentUser === 'admin';

    get(child(ref(db), `users/${userToView}`)).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const avatarUrl = data.avatar || `https://ui-avatars.com/api/?name=${userToView}&background=random`;

            document.getElementById('profile-edit-preview').src = avatarUrl;
            document.getElementById('profile-about-input').value = data.about || '';
            document.querySelector('#profile-modal h2').innerText = isMyProfile
                ? '👤 Мій Профіль'
                : `👤 Профіль ${userToView}`;

            const els = {
                file: document.getElementById('profile-avatar-file'),
                save: document.getElementById('save-btn'),
                chat: document.getElementById('start-chat-btn'),
                adminDel: document.getElementById('admin-delete-btn'),
                about: document.getElementById('profile-about-input'),
                text: document.getElementById('upload-text'),
            };

            if (isMyProfile) {
                els.file.style.display = 'block';
                els.save.style.display = 'block';
                els.about.disabled = false;
                if (els.text) els.text.style.display = 'block';
                els.chat.style.display = 'none';
                els.adminDel.style.display = 'none';
            } else if (isAdmin) {
                els.file.style.display = 'block';
                els.save.style.display = 'block';
                els.about.disabled = false;
                if (els.text) els.text.style.display = 'block';
                els.chat.style.display = 'block';
                els.adminDel.style.display = 'block';
                els.adminDel.onclick = () => deleteUserProfile(userToView);
            } else {
                els.file.style.display = 'none';
                els.save.style.display = 'none';
                els.about.disabled = true;
                if (els.text) els.text.style.display = 'none';
                els.chat.style.display = 'block';
                els.adminDel.style.display = 'none';
            }

            document.getElementById('profile-modal').style.display = 'flex';
        }
    });
}

export function startChatFromModal() {
    if (currentProfileUser && currentProfileUser !== state.currentUser) {
        closeProfileModal();
        switchChat(currentProfileUser, 'private');
    }
}

export function closeProfileModal() {
    document.getElementById('profile-modal').style.display = 'none';
}

export async function saveProfile() {
    const targetUser = currentProfileUser || state.currentUser;
    const file = document.getElementById('profile-avatar-file').files[0];
    const about = document.getElementById('profile-about-input').value;
    const saveBtn = document.getElementById('save-btn');
    let url = null;

    if (file && file.size > 2 * 1024 * 1024) return alert('Файл завеликий (>2MB)');

    saveBtn.innerText = '⏳...';
    saveBtn.disabled = true;

    try {
        if (file) {
            const r = sRef(storage, `avatars/${targetUser}`);
            await uploadBytes(r, file);
            url = await getDownloadURL(r);
        }
        const up = { about };
        if (url) up.avatar = url;
        await update(ref(db, `users/${targetUser}`), up);

        alert('Збережено!');
        if (targetUser === state.currentUser) updateSidebarProfile();
        closeProfileModal();
    } catch (e) {
        console.error(e);
        alert('Помилка');
    } finally {
        saveBtn.innerText = '💾 Зберегти зміни';
        saveBtn.disabled = false;
    }
}

export async function deleteUserProfile(targetUser) {
    if (!confirm(`Ви точно хочете видалити користувача ${targetUser}?`)) return;

    try {
        await remove(ref(db, `users/${targetUser}`));
        try {
            await deleteObject(sRef(storage, `avatars/${targetUser}`));
        } catch (e) {
            console.error('Помилка видалення аватарки:', e);
        }

        alert(`Користувача ${targetUser} видалено.`);

        if (targetUser === state.currentUser) {
            logoutUser();
        } else {
            closeProfileModal();
            // 👇 ВИПРАВЛЕНО: Викликаємо нову функцію оновлення списку
            loadActiveChats();
            if (state.currentChatID.includes(targetUser)) switchChat('general', 'public');
        }
    } catch (error) {
        console.error(error);
        alert('Помилка видалення: ' + error.message);
    }
}
