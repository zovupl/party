// Алиас / Шляпа — пара: один объясняет словами, второй угадывает.
import { CONFIG } from '../config.js';
import { el, countdownNode, vibrate } from '../ui.js';
import {
  setActiveGame, updateActiveGame, clearActiveGame, addScore, setShowLeaderboard,
} from '../store.js';

export const meta = [{ type: 'alias', emoji: '🎩', name: 'Алиас (Шляпа)', cat: 'word' }];
const PTS = 50;
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function pool(content) {
  return [...content.aliasPhrases, ...content.crocodile.easy, ...content.crocodile.hard];
}

export async function launch(_type, A) {
  A.game = { a: CONFIG.players[0], b: CONFIG.players[1], n: 0 };
  await setShowLeaderboard(false);
  await setActiveGame({ type: 'alias', emoji: '🎩', title: 'Алиас', phase: 'setup' });
}

export function player(state, ctx) {
  const g = state.activeGame;
  const wrap = el('.game.center');
  wrap.append(el('.quiz-badge', { text: '🎩 Алиас' }));
  if (g.phase !== 'play') {
    wrap.append(el('.pulse-orb'));
    wrap.append(el('p.subtitle', { text: 'Админ назначает пару…' }));
    return wrap;
  }
  const partner = g.pair[0] === g.explainer ? g.pair[1] : g.pair[0];
  wrap.append(el('.who-badge', { text: `Пара: ${g.pair[0]} + ${g.pair[1]}` }));
  if (ctx.myName === g.explainer) {
    wrap.append(el('.big-card.anim-pop', { text: g.word }));
    wrap.append(el('p.subtitle', { text: 'Объясняй словами. Однокоренные — нельзя!' }));
  } else if (ctx.myName === partner) {
    wrap.append(el('.big-card.anim-pop', { text: '🎧 Угадывай!' }));
    wrap.append(el('p.subtitle', { text: 'Слушай напарника и называй слово вслух.' }));
  } else {
    wrap.append(el('.big-card', { text: '🙊' }));
    wrap.append(el('p.subtitle', { text: `Играет пара ${g.pair[0]} + ${g.pair[1]}. Не подсказывай!` }));
  }
  wrap.append(el('.who-badge', { text: `Очки пары за раунд: ${g.score || 0}` }));
  wrap.append(countdownNode(g.startedAt, g.totalTime));
  return wrap;
}

export function controls(state, A, refresh) {
  const g = state.activeGame;
  if (!A.game) A.game = { a: CONFIG.players[0], b: CONFIG.players[1], n: 0 };
  const box = el('.game-ctrl');
  box.append(el('.gc-head', { text: '🎩 Алиас (Шляпа)' }));

  const cycle = (key) => {
    const i = CONFIG.players.indexOf(A.game[key]);
    let next = CONFIG.players[(i + 1) % CONFIG.players.length];
    const other = key === 'a' ? A.game.b : A.game.a;
    if (next === other) next = CONFIG.players[(CONFIG.players.indexOf(next) + 1) % CONFIG.players.length];
    A.game[key] = next; refresh();
  };
  box.append(el('.gc-row', {}, [
    el('span', { text: `Объясняет: ${A.game.a}` }),
    el('button.btn.ghost.sm', { text: '→', onclick: () => cycle('a') }),
  ]));
  box.append(el('.gc-row', {}, [
    el('span', { text: `Угадывает: ${A.game.b}` }),
    el('button.btn.ghost.sm', { text: '→', onclick: () => cycle('b') }),
  ]));

  const nextWord = async (score) => {
    A.game.n += 1;
    await updateActiveGame({
      phase: 'play', pair: [A.game.a, A.game.b], explainer: A.game.a,
      word: pick(pool(A.content)), startedAt: Date.now(), totalTime: CONFIG.aliasTime,
      score: score != null ? score : 0,
    });
  };

  if (g.phase === 'play') {
    box.append(el('.gc-card', { html: `Слово: <b>${g.word}</b>` }));
    box.append(el('.qa-actions', {}, [
      el('button.btn.primary', {
        text: `✅ Угадали (+${PTS} паре)`,
        onclick: async () => {
          await addScore(g.pair[0], PTS); await addScore(g.pair[1], PTS); vibrate(50);
          A.game.n += 1;
          await updateActiveGame({ word: pick(pool(A.content)), score: (g.score || 0) + PTS });
        },
      }),
      el('button.btn.ghost', { text: '⏭️ Пропустить', onclick: async () => { A.game.n += 1; await updateActiveGame({ word: pick(pool(A.content)) }); } }),
      el('button.btn.danger.sm', { text: 'Завершить', onclick: async () => { await clearActiveGame(); await setShowLeaderboard(true); refresh(); } }),
    ]));
  } else {
    box.append(el('button.btn.primary.wide', { text: '▶️ Старт раунда', onclick: () => nextWord(0) }));
    box.append(el('button.btn.danger.sm', { text: 'Завершить', onclick: async () => { await clearActiveGame(); await setShowLeaderboard(true); refresh(); } }));
  }
  return box;
}
