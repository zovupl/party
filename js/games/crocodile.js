// Крокодил — показывающий видит слово только у себя, остальные угадывают.
import { CONFIG } from '../config.js';
import { el, vibrate, countdownNode } from '../ui.js';
import {
  setActiveGame, updateActiveGame, clearActiveGame,
  buzz, watchBuzzer, clearBuzzer, addScore, setShowLeaderboard,
} from '../store.js';

export const meta = [{ type: 'crocodile', emoji: '🐊', name: 'Крокодил', cat: 'word' }];

const LEVELS = { easy: 'Просто', hard: 'Сложно', hardcore: 'Хардкор 18+' };
const PTS = 100;
let liveUnsub = null;

export async function launch(_type, A) {
  A.game = { level: 'easy', n: 0, shower: pickRandom(CONFIG.players) };
  await setShowLeaderboard(false);
  await setActiveGame({ type: 'crocodile', emoji: '🐊', title: 'Крокодил', phase: 'setup' });
}

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function player(state, ctx) {
  if (liveUnsub) { liveUnsub(); liveUnsub = null; }
  const g = state.activeGame;
  const wrap = el('.game.center');
  wrap.append(el('.quiz-badge', { text: '🐊 Крокодил' }));

  if (g.phase !== 'play') {
    wrap.append(el('.pulse-orb'));
    wrap.append(el('p.subtitle', { text: 'Админ выбирает показывающего и слово…' }));
    return wrap;
  }

  wrap.append(el('.who-badge', { text: `Показывает: ${g.shower}` }));
  if (ctx.myName === g.shower) {
    wrap.append(el('.big-card.anim-zoom', { text: g.word }));
    wrap.append(el('p.subtitle', { text: 'Объясняй жестами, без слов и звуков!' }));
    wrap.append(countdownNode(g.startedAt, g.totalTime));
  } else {
    wrap.append(el('.big-card.anim-pop', { text: '🤫' }));
    wrap.append(countdownNode(g.startedAt, g.totalTime));
    wrap.append(el('button.btn.primary.wide', {
      text: 'Угадал! ✅',
      onclick: () => { buzz(g.roundId, ctx.myName); vibrate([60, 30, 60]); },
    }));
    wrap.append(el('p.subtitle', { text: 'Кричи ответ вслух и жми кнопку!' }));
  }
  return wrap;
}

export function controls(state, A, refresh) {
  if (liveUnsub) { liveUnsub(); liveUnsub = null; }
  const g = state.activeGame;
  if (!A.game) A.game = { level: 'easy', n: 0, shower: pickRandom(CONFIG.players) };
  const box = el('.game-ctrl');
  box.append(el('.gc-head', { text: '🐊 Крокодил' }));

  // Уровень
  const lvl = el('.level-row');
  Object.entries(LEVELS).forEach(([k, name]) => {
    const b = el('button.chip', { text: name, onclick: () => { A.game.level = k; refresh(); } });
    if (A.game.level === k) b.classList.add('chip--on');
    lvl.append(b);
  });
  box.append(lvl);

  // Показывающий
  const who = el('.gc-row', {}, [
    el('span', { text: `Показывает: ${A.game.shower}` }),
    el('button.btn.ghost.sm', { text: '🎲 Другой', onclick: () => { A.game.shower = pickRandom(CONFIG.players); refresh(); } }),
  ]);
  box.append(who);

  const newWord = async () => {
    const pool = A.content.crocodile[A.game.level];
    const word = pickRandom(pool);
    A.game.n += 1;
    const roundId = `croc-${A.game.n}`;
    await clearBuzzer(roundId);
    await updateActiveGame({
      phase: 'play', level: A.game.level, shower: A.game.shower,
      word, roundId, startedAt: Date.now(), totalTime: CONFIG.crocodileTime,
    });
  };

  if (g.phase === 'play') {
    box.append(el('.gc-card', { html: `Слово: <b>${g.word}</b>` }));
    const claims = el('.buzz-order-admin');
    box.append(claims);
    liveUnsub = watchBuzzer(g.roundId, (b) => {
      if (!claims.isConnected) return;
      claims.innerHTML = '';
      const rows = Object.entries(b || {}).sort((a, x) => a[1] - x[1]);
      if (!rows.length) { claims.append(el('.gc-muted', { text: 'Никто ещё не угадал' })); return; }
      rows.forEach(([n]) => claims.append(el('button.btn.ghost.sm.wide', {
        text: `✅ ${n} угадал (+${PTS} ему и ${g.shower})`,
        onclick: async () => { await addScore(n, PTS); await addScore(g.shower, PTS); await newWord(); },
      })));
    });
    box.append(el('.qa-actions', {}, [
      el('button.btn.ghost', { text: '⏭️ Другое слово', onclick: newWord }),
      el('button.btn.danger.sm', { text: 'Завершить', onclick: async () => { await clearActiveGame(); await setShowLeaderboard(true); refresh(); } }),
    ]));
  } else {
    box.append(el('button.btn.primary.wide', { text: '▶️ Показать слово и старт', onclick: newWord }));
    box.append(el('button.btn.danger.sm', { text: 'Завершить', onclick: async () => { await clearActiveGame(); await setShowLeaderboard(true); refresh(); } }));
  }
  return box;
}
