import { CONFIG } from './config.js';
import { el, mount, $, toast, leaderboardNode, vibrate, confetti } from './ui.js';
import {
  auth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from './firebase.js';
import {
  goOnline, watchPlayers, watchState, watchScores,
  clearActiveGame, setShowLeaderboard, setFinal,
} from './store.js';
import { GAMES } from './games/registry.js';
import { renderAdmin } from './admin.js';

// ---------- Локальное состояние ----------
const S = { state: {}, players: {}, scores: {}, myName: null, isAdmin: false, adminView: 'panel' };
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
  if (!S.state.final) confettiFired = false;

  // Админ на экране «Панель»
  if (S.isAdmin && S.adminView !== 'play') {
    renderAdmin(S, { exitAdmin, goPlay });
    return;
  }
  // Игрок (или админ в режиме «Играть»)
  if (!S.myName || S.forceNameSelect) { mount(nameSelect()); return; }
  const node = currentPlayerNode();
  node.append(menuButton());
  mount(node);
}

// Кнопка меню (есть на КАЖДОМ экране) — выход/в меню/сменить имя.
function menuButton() {
  return el('button.menu-fab', { text: '☰ Меню', onclick: openMenu });
}

function openMenu() {
  vibrate(20);
  const back = el('.sheet-back', { onclick: (e) => { if (e.target === back) back.remove(); } });
  const sheet = el('.sheet');
  sheet.append(el('.sheet-title', { text: 'Меню' }));
  const add = (label, cls, fn) => sheet.append(el(`button.sheet-btn${cls}`, { text: label, onclick: () => { back.remove(); fn(); } }));
  if (S.isAdmin) {
    add('🛠 В панель админа', '.primary', () => { S.adminView = 'panel'; render(); });
    if (S.state.activeGame || S.state.showLeaderboard || S.state.final) add('⏹ Остановить игру → в меню', '.danger', stopGame);
  }
  add('🔄 Сменить имя', '', () => { S.forceNameSelect = true; render(); });
  add('Закрыть', '.ghost', () => {});
  back.append(sheet);
  document.body.append(back);
}

async function stopGame() {
  await clearActiveGame();
  await setShowLeaderboard(false);
  await setFinal(false);
  if (S.isAdmin) S.adminView = 'panel';
  render();
}

// Выбор экрана для игрока (общий для обычного игрока и админа-в-игре).
function currentPlayerNode() {
  if (S.state.final) return winnerScreen();
  if (S.state.showLeaderboard) return bigLeaderboard();
  const g = S.state.activeGame;
  if (!g) return waiting();
  return gameView(g);
}

function goPlay() { S.adminView = 'play'; render(); }

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
        S.forceNameSelect = false;
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

// ---------- Финальный экран «Победитель вечера» ----------
let confettiFired = false;
function winnerScreen() {
  const rows = Object.entries(S.scores || {}).sort((a, b) => b[1] - a[1]);
  const winner = rows.length ? rows[0][0] : '—';
  const wrap = el('.center');
  wrap.append(el('.logo', { text: '🎉 PARTY' }));
  wrap.append(el('.crown', { text: '👑' }));
  wrap.append(el('p.subtitle', { text: 'Победитель вечера' }));
  wrap.append(el('h1.winner-name', { text: winner }));
  if (rows.length) wrap.append(el('.winner-pts', { text: `${rows[0][1]} очков` }));
  wrap.append(leaderboardNode(S.scores, {}));
  if (!confettiFired) { confettiFired = true; confetti(6000); vibrate([80, 40, 80, 40, 120]); }
  return wrap;
}

// ---------- Диспетчер игр (по типу) ----------
function gameView(g) {
  const ctx = { myName: S.myName };
  if (g.type === 'video') return videoPlayerView(g);
  if (GAMES[g.type]) return GAMES[g.type].player(S.state, ctx);
  return el('.center', {}, [
    logo(),
    el('h2.title', { text: g.title || 'Игра' }),
    el('p.subtitle', { text: 'Эта игра ещё готовится 🛠️' }),
  ]);
}

// Экран видео-игры для игрока: видео и есть игра.
function videoPlayerView(g) {
  const wrap = el('.center');
  wrap.append(el('.video-emoji.anim-pop', { text: g.emoji || '🎬' }));
  wrap.append(el('h2.title', { text: g.title }));
  wrap.append(el('p.subtitle', { text: 'Это видео — и есть игра. Смотрим вместе на большом экране!' }));
  wrap.append(el('a.btn.primary.wide.video-open', { href: g.url, target: '_blank', rel: 'noreferrer' }, ['▶ Открыть на YouTube']));
  return wrap;
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
