// Рулетка фантов — выпадает игрок + задание одного из трёх уровней.
import { CONFIG } from '../config.js';
import { el, vibrate } from '../ui.js';
import {
  setActiveGame, updateActiveGame, clearActiveGame, addScore, setShowLeaderboard,
} from '../store.js';

export const meta = [{ type: 'roulette', emoji: '🎡', name: 'Рулетка фантов', cat: 'word' }];

const LEVELS = { light: 'Лайт', bold: 'Дерзко', hardcore: 'Хардкор' };
let lastSpin = null;

export async function launch(_type, A) {
  A.game = { level: 'light', n: 0 };
  await setShowLeaderboard(false);
  await setActiveGame({ type: 'roulette', emoji: '🎡', title: 'Рулетка фантов', phase: 'idle' });
}

export function player(state) {
  const g = state.activeGame;
  const wrap = el('.game.center');
  wrap.append(el('h2.title', { text: '🎡 Рулетка фантов' }));

  if (g.phase !== 'result') {
    wrap.append(el('.pulse-orb'));
    wrap.append(el('p.subtitle', { text: 'Админ крутит барабан…' }));
    return wrap;
  }

  const reel = el('.roulette-name', { text: '🎲' });
  const taskBox = el('.roulette-task');
  wrap.append(el('.roulette-level', { text: LEVELS[g.level] || '' }));
  wrap.append(reel);
  wrap.append(taskBox);

  if (g.spinId !== lastSpin) {
    lastSpin = g.spinId;
    vibrate(40);
    let i = 0;
    const spin = setInterval(() => {
      reel.textContent = CONFIG.players[Math.floor(Math.random() * CONFIG.players.length)];
      if (++i > 18) {
        clearInterval(spin);
        reel.textContent = `🎯 ${g.chosen}`;
        reel.classList.add('roulette-name--final');
        taskBox.textContent = g.task;
        taskBox.classList.add('roulette-task--in');
        vibrate([60, 40, 120]);
      }
    }, 90);
  } else {
    reel.textContent = `🎯 ${g.chosen}`;
    reel.classList.add('roulette-name--final');
    taskBox.textContent = g.task;
    taskBox.classList.add('roulette-task--in');
  }
  return wrap;
}

export function controls(state, A, refresh) {
  const g = state.activeGame;
  if (!A.game) A.game = { level: 'light', n: 0 };
  const box = el('.game-ctrl');
  box.append(el('.gc-head', { text: '🎡 Рулетка фантов' }));

  const levelRow = el('.level-row');
  Object.entries(LEVELS).forEach(([key, name]) => {
    const b = el('button.chip', { text: name, onclick: () => { A.game.level = key; refresh(); } });
    if (A.game.level === key) b.classList.add('chip--on');
    levelRow.append(b);
  });
  box.append(levelRow);

  const spin = () => {
    const players = CONFIG.players;
    const chosen = players[Math.floor(Math.random() * players.length)];
    const pool = A.content.fanty[A.game.level];
    const task = pool[Math.floor(Math.random() * pool.length)];
    A.game.n = (A.game.n || 0) + 1;
    updateActiveGame({ phase: 'result', chosen, task, level: A.game.level, spinId: A.game.n });
  };

  if (g.phase === 'result') {
    box.append(el('.gc-card', { html: `🎯 <b>${g.chosen}</b><br>${g.task}` }));
    box.append(el('.qa-actions', {}, [
      el('button.btn.ghost.sm', { text: `✅ Выполнил (+30 ${g.chosen})`, onclick: () => addScore(g.chosen, 30) }),
      el('button.btn.primary', { text: '🎡 Крутить снова', onclick: spin }),
    ]));
  } else {
    box.append(el('button.btn.primary.wide', { text: '🎡 Крутить барабан', onclick: spin }));
  }
  box.append(el('button.btn.danger.sm', {
    text: 'Завершить', onclick: async () => { await clearActiveGame(); await setShowLeaderboard(true); refresh(); },
  }));
  return box;
}
