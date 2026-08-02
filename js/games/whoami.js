// «Кто я?» — персонажа видят все, кроме самого водящего.
import { CONFIG } from '../config.js';
import { el, countdownNode, vibrate } from '../ui.js';
import {
  setActiveGame, updateActiveGame, clearActiveGame, addScore, setShowLeaderboard,
} from '../store.js';

export const meta = [{ type: 'whoami', emoji: '🙈', name: 'Кто я?', cat: 'word' }];
const PTS = 100;
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export async function launch(_type, A) {
  A.game = { target: pick(CONFIG.players) };
  await setShowLeaderboard(false);
  await setActiveGame({ type: 'whoami', emoji: '🙈', title: 'Кто я?', phase: 'setup' });
}

export function player(state, ctx) {
  const g = state.activeGame;
  const wrap = el('.game.center');
  wrap.append(el('.quiz-badge', { text: '🙈 Кто я?' }));
  if (g.phase !== 'play') {
    wrap.append(el('.pulse-orb'));
    wrap.append(el('p.subtitle', { text: 'Админ загадывает персонажа…' }));
    return wrap;
  }
  wrap.append(el('.who-badge', { text: `Водит: ${g.target}` }));
  if (ctx.myName === g.target) {
    wrap.append(el('.big-card', { text: '???' }));
    wrap.append(el('p.subtitle', { text: 'Задавай вопросы да/нет и угадай, кто ты!' }));
  } else {
    wrap.append(el('.big-card', { text: g.character }));
    wrap.append(el('p.subtitle', { text: 'Отвечай честно да/нет, не подсказывай напрямую!' }));
  }
  wrap.append(countdownNode(g.startedAt, g.totalTime));
  return wrap;
}

export function controls(state, A, refresh) {
  const g = state.activeGame;
  if (!A.game) A.game = { target: pick(CONFIG.players) };
  const box = el('.game-ctrl');
  box.append(el('.gc-head', { text: '🙈 Кто я?' }));

  const cycleTarget = () => {
    const i = CONFIG.players.indexOf(A.game.target);
    A.game.target = CONFIG.players[(i + 1) % CONFIG.players.length];
    refresh();
  };
  box.append(el('.gc-row', {}, [
    el('span', { text: `Водит: ${A.game.target}` }),
    el('button.btn.ghost.sm', { text: '→ Следующий', onclick: cycleTarget }),
  ]));

  const start = async (character) => {
    await updateActiveGame({
      phase: 'play', target: A.game.target, character,
      startedAt: Date.now(), totalTime: CONFIG.crocodileTime,
    });
  };

  if (g.phase === 'play') {
    box.append(el('.gc-card', { html: `Персонаж: <b>${g.character}</b> (видят все, кроме ${g.target})` }));
    box.append(el('.qa-actions', {}, [
      el('button.btn.primary', { text: `✅ Угадал (+${PTS} ${g.target})`, onclick: async () => { await addScore(g.target, PTS); vibrate(60); } }),
      el('button.btn.ghost.sm', { text: '🎲 Другой персонаж', onclick: () => start(pick(A.content.characters)) }),
      el('button.btn.ghost.sm', { text: '→ Новый водящий', onclick: () => { cycleTarget(); } }),
      el('button.btn.danger.sm', { text: 'Завершить', onclick: async () => { await clearActiveGame(); await setShowLeaderboard(true); refresh(); } }),
    ]));
  } else {
    box.append(el('button.btn.primary.wide', { text: '🎭 Загадать персонажа и старт', onclick: () => start(pick(A.content.characters)) }));
    box.append(el('button.btn.danger.sm', { text: 'Завершить', onclick: async () => { await clearActiveGame(); await setShowLeaderboard(true); refresh(); } }));
  }
  return box;
}
