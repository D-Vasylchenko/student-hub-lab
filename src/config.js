import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

const firebaseConfig = {
    apiKey: 'AIzaSyCTpIXvhSz3Q4zfE0ozp3GhZZ0zFWCarTY',
    authDomain: 'weather-labs-278ab.firebaseapp.com',
    databaseURL: 'https://weather-labs-278ab-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'weather-labs-278ab',
    storageBucket: 'weather-labs-278ab.firebasestorage.app',
    messagingSenderId: '348040144330',
    appId: '1:348040144330:web:555082fe9d85ea4b3b1b33',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);
