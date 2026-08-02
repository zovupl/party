// Доменные операции над Realtime Database.
import {
  db, dbRef, watch, writeVal, updateVal, readOnce, removeVal, TS,
  onDisconnect, ref, runTransaction,
} from './firebase.js';

// ---------- Присутствие игроков ----------
export function goOnline(name) {
  const r = ref(db, `players/${name}`);
  updateVal(`players/${name}`, { name, online: true, lastSeen: TS() });
  onDisconnect(r).update({ online: false, lastSeen: TS() });
}
export const watchPlayers = (cb) => watch('players', (v) => cb(v || {}));

// ---------- Глобальное состояние игры (пишет только админ) ----------
export const watchState = (cb) => watch('state', (v) => cb(v || {}));
export const setActiveGame = (game) => writeVal('state/activeGame', game);
export const clearActiveGame = () => removeVal('state/activeGame');
export const updateActiveGame = (patch) => updateVal('state/activeGame', patch);
export const setShowLeaderboard = (on) => writeVal('state/showLeaderboard', !!on);

// ---------- Очки ----------
export const watchScores = (cb) => watch('scores', (v) => cb(v || {}));
export function addScore(name, delta) {
  return runTransaction(ref(db, `scores/${name}`), (cur) => (cur || 0) + delta);
}
export const setScore = (name, val) => writeVal(`scores/${name}`, val);
export const resetScores = () => removeVal('scores');

// ---------- Ответы в квизе / голосования / баззер ----------
export const submitAnswer = (roundId, name, choice) =>
  writeVal(`answers/${roundId}/${name}`, { choice, ts: TS() });
export const watchAnswers = (roundId, cb) => watch(`answers/${roundId}`, (v) => cb(v || {}));
export const clearAnswers = (roundId) => removeVal(`answers/${roundId}`);

export const submitVote = (roundId, name, target) =>
  writeVal(`votes/${roundId}/${name}`, target);
export const watchVotes = (roundId, cb) => watch(`votes/${roundId}`, (v) => cb(v || {}));
export const clearVotes = (roundId) => removeVal(`votes/${roundId}`);

export const buzz = (roundId, name) => writeVal(`buzzer/${roundId}/${name}`, TS());
export const watchBuzzer = (roundId, cb) => watch(`buzzer/${roundId}`, (v) => cb(v || {}));
export const clearBuzzer = (roundId) => removeVal(`buzzer/${roundId}`);

// «Я никогда не...» — счётчик грехов
export const addSin = (name) => runTransaction(ref(db, `sins/${name}`), (c) => (c || 0) + 1);
export const watchSins = (cb) => watch('sins', (v) => cb(v || {}));

// Свободный текст (Кто это написал)
export const submitText = (roundId, name, text) =>
  writeVal(`texts/${roundId}/${name}`, { text, ts: TS() });
export const watchTexts = (roundId, cb) => watch(`texts/${roundId}`, (v) => cb(v || {}));
export const clearTexts = (roundId) => removeVal(`texts/${roundId}`);

// ---------- Контент (только админ, после авторизации) ----------
export const loadContent = () => readOnce('content');

// ---------- Полный сброс вечера ----------
export async function resetEverything() {
  await Promise.all([
    removeVal('state'), removeVal('scores'), removeVal('answers'),
    removeVal('votes'), removeVal('buzzer'), removeVal('texts'), removeVal('sins'),
  ]);
}
