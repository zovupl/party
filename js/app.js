import { CONFIG } from './config.js';
import { el, mount, $, toast, leaderboardNode, vibrate } from './ui.js';
import {
  auth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from './firebase.js';
import {
  goOnline, watchPlayers, watchState, watchScores,
} from './store.js';
import { playerQuizView } from './games/quiz.js';
import { GAMES } from './games/registry.js';
import { renderAdmin } from './admin.js';

// ---------- Локальное состояние ----------
const S = { state: {}, players: {}, scores: {}, myName: null, isAdmin: false };
S.myName = localStorage.getItem('party.name') || null;

// ---------- Подписки ----------
watchState((v) => { S.state = v || {}; render(); });
watchPlayers((v) => { S.players = v || {}; render(); });
watchScores((v) => { S.scores = v || {}; render(); });

onAuthStateChanged(auth, (user) => {
  S.isAdmin = !!user;
  render();
});

if (S.myName) goOnline(S.myName);

// ---------- Роутер ----------
function render() {
  if (S.isAdmin) {
    renderAdmin(S, { exitAdmin });
    return;
  }
  if (!S.myName) { mount(nameSelect()); return; }
  if (S.state.showLeaderboard) { mount(bigLeaderboard()); return; }
  const g = S.state.activeGame;
  if (!g) { mount(waiting()); return; }
  mount(gameView(g));
}

// ---------- Экран выбора имени ----------
function nameSelect() {
  const wrap = el('.center');
  wrap.append(logo());
  wrap.append(el('h1.title', { text: 'Кто ты?' }));
  wrap.append(el('p.subtitle', { text: 'Выбери своё имя' }));
  const grid = el('.name-grid');
  CONFIG.players.forEach((name) => {
    const p = S.players[name];
    const occupied = p && p.online;
    const btn = el('button.name-btn', {
      onclick: () => {
        S.myName = name;
        localStorage.setItem('party.name', name);
        goOnline(name);
        vibrate(30);
        render();
      },
    }, [
      el('.name-txt', { text: name }),
      occupied ? el('.name-tag', { text: 'занято' }) : null,
    ]);
    if (occupied) btn.classList.add('name-btn--busy');
    grid.append(btn);
  });
  wrap.append(grid);
  return wrap;
}

// ---------- Экран ожидания ----------
function waiting() {
  const wrap = el('.center');
  wrap.append(logo());
  wrap.append(el('.pulse-orb'));
  wrap.append(el('h1.title', { text: 'Ждём админа…' }));
  wrap.append(el('p.subtitle', { text: 'Скоро начнётся игра. Держи телефон под рукой!' }));
  wrap.append(el('.who-badge', { text: `Ты: ${S.myName}` }));
  const online = Object.values(S.players).filter((p) => p && p.online).length;
  wrap.append(el('.online-badge', { text: `🟢 Онлайн: ${online}` }));
  return wrap;
}

// ---------- Экран лидерборда для всех ----------
function bigLeaderboard() {
  const wrap = el('.center');
  wrap.append(leaderboardNode(S.scores, { title: '🏆 Таблица лидеров' }));
  return wrap;
}

// ---------- Диспетчер игр (по типу) ----------
function gameView(g) {
  const ctx = { myName: S.myName };
  if (g.type === 'quiz') return playerQuizView(S.state, ctx);
  if (GAMES[g.type]) return GAMES[g.type].player(S.state, ctx);
  return el('.center', {}, [
    logo(),
    el('h2.title', { text: g.title || 'Игра' }),
    el('p.subtitle', { text: 'Эта игра ещё готовится 🛠️' }),
  ]);
}

// ---------- Логотип + вход в админку (долгое нажатие) ----------
function logo() {
  const l = el('.logo', { text: '🎉 PARTY' });
  let timer = null;
  const start = () => { timer = setTimeout(openAdminLogin, 800); };
  const stop = () => { clearTimeout(timer); };
  l.addEventListener('touchstart', start, { passive: true });
  l.addEventListener('touchend', stop);
  l.addEventListener('mousedown', start);
  l.addEventListener('mouseup', stop);
  l.addEventListener('mouseleave', stop);
  return l;
}

function openAdminLogin() {
  vibrate(50);
  const dlg = el('.modal-back');
  const card = el('.modal', {}, [
    el('h3', { text: '🔐 Вход админа' }),
    el('p.subtitle', { text: 'Введи пароль администратора' }),
  ]);
  const input = el('input.pin-input', { type: 'password', placeholder: 'Пароль', autocomplete: 'current-password' });
  const err = el('.modal-err');
  const submit = async () => {
    try {
      await signInWithEmailAndPassword(auth, CONFIG.adminEmail, input.value.trim());
      dlg.remove();
    } catch (e) {
      err.textContent = 'Неверный пароль или админ не создан';
      vibrate([40, 40, 40]);
    }
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  card.append(input, err, el('.modal-actions', {}, [
    el('button.btn.ghost', { text: 'Отмена', onclick: () => dlg.remove() }),
    el('button.btn.primary', { text: 'Войти', onclick: submit }),
  ]));
  dlg.append(card);
  document.body.append(dlg);
  setTimeout(() => input.focus(), 50);
}

async function exitAdmin() {
  await signOut(auth);
  S.isAdmin = false;
  render();
}

render();
