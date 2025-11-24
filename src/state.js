export const state = {
    currentUser: null,
    currentChatID: 'general',
    appStartTime: Date.now(),
    activeListenerPath: null,
};

export function setCurrentUser(user) {
    state.currentUser = user;
}
export function setCurrentChatID(id) {
    state.currentChatID = id;
}
export function setActiveListenerPath(path) {
    state.activeListenerPath = path;
}
