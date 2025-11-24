import {
    ref,
    get,
    push,
    onChildAdded,
    onChildRemoved,
    off,
    query,
    limitToLast,
    remove,
    child,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { db } from './config.js';
import { state, setCurrentChatID, setActiveListenerPath } from './state.js';
import { openProfileModal } from './profile.js';
import { playNotificationSound } from './settings.js';

export function loadActiveChats() {
    const listDiv = document.getElementById('private-channels-container');
    if (!listDiv) return;
    listDiv.innerHTML = '';

    onChildAdded(ref(db, 'private_chats'), (snapshot) => {
        const chatKey = snapshot.key;
        if (chatKey.includes(state.currentUser)) {
            const partner = chatKey.replace(state.currentUser, '').replace('_', '');
            if (partner) {
                addChatToSidebar(partner);
            }
        }
    });
}

export function addChatToSidebar(partnerName) {
    if (document.getElementById(`chat-link-${partnerName}`)) return;

    const listDiv = document.getElementById('private-channels-container');
    const div = document.createElement('div');
    div.className = 'channel-item';
    div.id = `chat-link-${partnerName}`;
    div.dataset.timestamp = 0;
    div.innerHTML = `<div class="status-dot online"></div> ${partnerName}`;
    div.onclick = () => switchChat(partnerName, 'private');

    listDiv.appendChild(div);
    watchChatActivity(partnerName, 'private', `chat-link-${partnerName}`);
}

export function openUsersModal() {
    const modal = document.getElementById('users-modal');
    const list = document.getElementById('all-users-list');
    list.innerHTML = '<p style="text-align:center">Завантаження...</p>';
    modal.style.display = 'flex';

    get(ref(db, 'users')).then((snapshot) => {
        list.innerHTML = '';
        if (snapshot.exists()) {
            const users = snapshot.val();
            for (const userKey in users) {
                if (userKey === state.currentUser) continue;

                const div = document.createElement('div');
                div.className = 'user-item-row';
                const avatar = users[userKey].avatar || `https://ui-avatars.com/api/?name=${userKey}`;

                div.innerHTML = `
                    <img src="${avatar}">
                    <div class="user-item-name">${userKey}</div>
                `;

                div.onclick = () => {
                    closeUsersModal(); // Закриваємо список
                    openProfileModal(userKey); // Відкриваємо профіль!
                };

                list.appendChild(div);
            }
        } else {
            list.innerHTML = '<p style="text-align:center">Користувачів немає :(</p>';
        }
    });
}

export function closeUsersModal() {
    document.getElementById('users-modal').style.display = 'none';
}

export function filterUsersList() {
    const input = document.getElementById('user-search').value.toLowerCase();
    const items = document.querySelectorAll('.user-item-row');
    items.forEach((item) => {
        const name = item.querySelector('.user-item-name').innerText.toLowerCase();
        item.style.display = name.includes(input) ? 'flex' : 'none';
    });
}

function sortChannels(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const items = Array.from(container.children);
    items.sort((a, b) => {
        const timeA = parseInt(a.dataset.timestamp || 0);
        const timeB = parseInt(b.dataset.timestamp || 0);
        return timeB - timeA;
    });
    items.forEach((item) => container.appendChild(item));
}

export function watchChatActivity(targetID, type, elementID) {
    let path;
    let storageKey;
    if (type === 'public') {
        path = `public_chats/${targetID}`;
        storageKey = `lastRead_public_${targetID}`;
    } else {
        const ids = [state.currentUser, targetID].sort();
        path = `private_chats/${ids[0]}_${ids[1]}`;
        storageKey = `lastRead_private_${ids[0]}_${ids[1]}`;
    }

    onChildAdded(query(ref(db, path), limitToLast(1)), (snapshot) => {
        const msg = snapshot.val();
        const el = document.getElementById(elementID);
        if (el) {
            el.dataset.timestamp = msg.time;
            const containerId = type === 'public' ? 'public-channels-container' : 'private-channels-container';
            sortChannels(containerId);

            const isIncoming = msg.user !== state.currentUser;
            let isOpenNow = false;
            if (type === 'public' && state.currentChatID === targetID) isOpenNow = true;
            if (type === 'private' && state.currentChatID.includes(targetID)) isOpenNow = true;

            if (isIncoming) {
                if (isOpenNow) localStorage.setItem(storageKey, Date.now());
                else {
                    const lastRead = Number(localStorage.getItem(storageKey)) || 0;
                    if (msg.time > lastRead) el.classList.add('has-new-message');
                }
            } else localStorage.setItem(storageKey, Date.now());
        }
    });
}

export function switchChat(targetID, type) {
    if (state.activeListenerPath) off(ref(db, state.activeListenerPath));
    document.getElementById('messages-box').innerHTML = '';

    const el = document.getElementById(`chat-link-${targetID}`);
    if (el) el.classList.remove('has-new-message');

    let storageKey;
    if (type === 'public') {
        setCurrentChatID(targetID);
        document.getElementById('chat-title').innerText = `# ${targetID}`;
        setActiveListenerPath(`public_chats/${targetID}`);
        storageKey = `lastRead_public_${targetID}`;
    } else {
        const ids = [state.currentUser, targetID].sort();
        setCurrentChatID(`${ids[0]}_${ids[1]}`);
        document.getElementById('chat-title').innerText = `💬 Чат з ${targetID}`;
        setActiveListenerPath(`private_chats/${state.currentChatID}`);
        storageKey = `lastRead_private_${ids[0]}_${ids[1]}`;
    }

    localStorage.setItem(storageKey, Date.now());
    document.querySelectorAll('.channel-item').forEach((el) => el.classList.remove('active'));
    if (el) el.classList.add('active');

    onChildAdded(ref(db, state.activeListenerPath), (s) => renderMessage(s.val(), s.key));
    onChildRemoved(ref(db, state.activeListenerPath), (s) => {
        const msgDiv = document.getElementById(`msg-${s.key}`);
        if (msgDiv) msgDiv.remove();
    });
}

export function sendMessage() {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if (!text) return;
    push(ref(db, state.activeListenerPath), { user: state.currentUser, text: text, time: Date.now() });

    let storageKey;
    if (state.activeListenerPath.includes('public_chats')) storageKey = `lastRead_public_${state.currentChatID}`;
    else storageKey = `lastRead_private_${state.currentChatID}`;

    localStorage.setItem(storageKey, Date.now());
    input.value = '';
}

export function deleteMessage(msgKey) {
    if (confirm('Видалити це повідомлення?')) {
        remove(ref(db, `${state.activeListenerPath}/${msgKey}`));
    }
}

function renderMessage(msg, msgKey) {
    const isMine = msg.user === state.currentUser;
    const box = document.getElementById('messages-box');

    if (!isMine && msg.time > state.appStartTime) {
        playNotificationSound();
    }

    const wrapper = document.createElement('div');
    wrapper.id = `msg-${msgKey}`;
    wrapper.className = `msg-wrapper ${isMine ? 'mine' : 'other'}`;

    const img = document.createElement('img');
    img.className = 'chat-avatar';
    img.src = `https://ui-avatars.com/api/?name=${msg.user}`;
    img.onclick = () => openProfileModal(msg.user);
    get(child(ref(db), `users/${msg.user}`)).then((s) => {
        if (s.exists() && s.val().avatar) img.src = s.val().avatar;
    });

    const bubble = document.createElement('div');
    bubble.className = `message ${isMine ? 'msg-mine' : 'msg-other'}`;

    let adminBtn = '';
    if (state.currentUser === 'admin')
        adminBtn = `<span class="delete-btn" onclick="deleteMessage('${msgKey}')">×</span>`;

    const time = new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let sender = isMine ? '' : `<span class="msg-sender" onclick="openProfileModal('${msg.user}')">${msg.user}</span>`;

    bubble.innerHTML = `${adminBtn}${sender}${msg.text.replace(/\n/g, '<br>')}<div style="font-size:0.6rem; text-align:right; opacity:0.7;">${time}</div>`;

    wrapper.appendChild(img);
    wrapper.appendChild(bubble);
    box.appendChild(wrapper);
    box.scrollTop = box.scrollHeight;
}
