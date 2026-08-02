// Заглушка Firebase CDN для локального прогона модулей в Node.
const fn = (name) => (...a) => (name === 'onValue' || name === 'onAuthStateChanged' ? () => {} : undefined);
export const initializeApp = () => ({});
export const getDatabase = () => ({});
export const getAuth = () => ({});
export const ref = () => ({});
export const onValue = () => () => {};
export const off = () => {};
export const get = () => Promise.resolve({ val: () => null });
export const set = () => Promise.resolve();
export const update = () => Promise.resolve();
export const push = () => ({});
export const remove = () => Promise.resolve();
export const serverTimestamp = () => 0;
export const onDisconnect = () => ({ update: () => {}, set: () => {} });
export const runTransaction = () => Promise.resolve();
export const signInWithEmailAndPassword = () => Promise.resolve({});
export const signOut = () => Promise.resolve();
export const onAuthStateChanged = (auth, cb) => { setTimeout(() => cb(null), 0); return () => {}; };
