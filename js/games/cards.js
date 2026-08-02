// «Я никогда не…» и «Выпей, если…» — синхронные карточки.
import { el, vibrate, toast } from '../ui.js';
import {
  setActiveGame, updateActiveGame, clearActiveGame,
  addSin, watchSins, setShowLeaderboard,
} from '../store.js';

let liveUnsub = null;

export const meta = [
  { type: 'never', emoji: '🍺', name: 'Я никогда не…', cat: 'party' },
  { type: 'drink', emoji: '🥂', name: 'Выпей, если…', cat: 'party' },
];

const deckOf = (type, content) => (type === 'never' ? content.neverHave : content.drinkIf);

export async function launch(type, A) {
  const deck = deckOf(type, A.content);
  A.game = { deck };
  await setShowLeaderboard(false);
  await setActiveGame({
    type,
    title: type === 'never' ? 'Я никогда не…' : 'Выпей, если…',
    emoji: type === 'never' ? '🍺' : '🥂',
    i: 0, total: deck.length, text: deck[0],
  });
}

export function player(state, ctx) {
  if (liveUnsub) { liveUnsub(); liveUnsub = null; }
  const g = state.activeGame;
  const wrap = el('.game.center');
  wrap.append(el('.card-count', { text: `${g.i + 1} / ${g.total}` }));
  wrap.append(el('.big-card', { text: g.text }));
  if (g.type === 'never') {
    wrap.append(el('button.btn.primary.wide', {
      text: 'Я делал 🍺',
      onclick: () => { addSin(ctx.myName); vibrate(40); toast('Засчитано 😈 +1 грех'); },
    }));
    const sins = el('.sins-live');
    wrap.append(sins);
    liveUnsub = watchSins((s) => renderSins(sins, s));
  } else {
    wrap.append(el('p.subtitle', { text: 'Кто попал — пьёт 🍷' }));
  }
  return wrap;
}

function renderSins(node, s) {
  if (!node.isConnected) return;
  const rows = Object.entries(s || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  node.innerHTML = '';
  if (!rows.length) return;
  node.append(el('.sins-title', { text: '😈 Счётчик грехов' }));
  rows.forEach(([n, c]) => node.append(el('.sins-row', {}, [
    el('span', { text: n }), el('b', { text: `${c}` }),
  ])));
}

export function controls(state, A, refresh) {
  const g = state.activeGame;
  const deck = (A.game && A.game.deck) || deckOf(g.type, A.content);
  A.game = { deck };
  const box = el('.game-ctrl');
  box.append(el('.gc-head', { text: `${g.emoji} ${g.title} — ${g.i + 1}/${g.total}` }));
  box.append(el('.gc-card', { text: g.text }));
  const move = (d) => {
    const i = Math.max(0, Math.min(deck.length - 1, g.i + d));
    updateActiveGame({ i, text: deck[i] });
  };
  box.append(el('.qa-actions', {}, [
    el('button.btn.ghost', { text: '⬅️ Назад', onclick: () => move(-1) }),
    el('button.btn.primary', { text: 'Следующая ➡️', onclick: () => move(1) }),
    el('button.btn.danger.sm', { text: 'Завершить', onclick: async () => {
      await clearActiveGame(); await setShowLeaderboard(true); refresh();
    } }),
  ]));
  return box;
}
