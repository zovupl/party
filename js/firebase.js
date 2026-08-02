// Firebase modular SDK через CDN (без сборки).
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getDatabase, ref, onValue, off, get, set, update, push, remove,
  serverTimestamp, onDisconnect, runTransaction,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

// Реэкспорт примитивов, чтобы остальной код не тянул CDN-URL напрямую.
export {
  ref, onValue, off, get, set, update, push, remove,
  serverTimestamp, onDisconnect, runTransaction,
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
};

// --- Удобные обёртки над путями БД ---
export const dbRef = (path) => ref(db, path);

export function watch(path, cb) {
  const r = ref(db, path);
  const unsub = onValue(r, (snap) => cb(snap.val()));
  return () => off(r, 'value', unsub);
}

export const writeVal = (path, val) => set(ref(db, path), val);
export const updateVal = (path, val) => update(ref(db, path), val);
export const readOnce = (path) => get(ref(db, path)).then((s) => s.val());
export const removeVal = (path) => remove(ref(db, path));
export const TS = serverTimestamp;
