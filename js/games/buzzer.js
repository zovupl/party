// «Угадай мелодию» — баззер-режим. Кто первый нажал — тот отвечает.
import { el, vibrate } from '../ui.js';
import { removeVal } from '../firebase.js';
import {
  setActiveGame, updateActiveGame, clearActiveGame,
  buzz, watchBuzzer, clearBuzzer, addScore, setShowLeaderboard,
} from '../store.js';

let liveUnsub = null;
const POINTS = 100;

export const meta = [{ type: 'buzzer', emoji: '🎵', name: 'Угадай мелодию', cat: 'party' }];

export async function launch(_type, A) {
  A.game = { round: 0 };
  await setShowLeaderboard(false);
  await clearBuzzer('buz-0');
  await setActiveGame({ type: 'buzzer', emoji: '🎵', title: 'Угадай мелодию', roundId: 'buz-0', phase: 'open' });
}

export function player(state, ctx) {
  if (liveUnsub) { liveUnsub(); liveUnsub = null; }
  const g = state.activeGame;
  const wrap = el('.game.center');
  wrap.append(el('h2.title', { text: '🎵 Угадай мелодию' }));

  const btn = el('button.buzzer-btn', {
    text: 'ЗНАЮ! 🔔',
    onclick: () => { buzz(g.roundId, ctx.myName); vibrate([60, 30, 60]); btn.disabled = true; btn.classList.add('buzzed'); },
  });
  wrap.append(btn);

  const order = el('.buzz-order');
  wrap.append(order);
  liveUnsub = watchBuzzer(g.roundId, (b) => {
    if (!order.isConnected) return;
    const rows = Object.entries(b || {}).sort((a, x) => a[1] - x[1]);
    order.innerHTML = '';
    rows.forEach(([n], i) => {
      const r = el('.buzz-row', {}, [el('b', { text: `${i + 1}` }), el('span', { text: n })]);
      if (n === ctx.myName) r.classList.add('buzz-row--me');
      if (i === 0) r.classList.add('buzz-row--first');
      order.append(r);
    });
    if (rows.some(([n]) => n === ctx.myName)) { btn.disabled = true; btn.classList.add('buzzed'); }
  });
  return wrap;
}

export function controls(state, A, refresh) {
  if (liveUnsub) { liveUnsub(); liveUnsub = null; }
  const g = state.activeGame;
  if (!A.game) A.game = { round: 0 };
  const box = el('.game-ctrl');
  box.append(el('.gc-head', { text: '🎵 Угадай мелодию' }));

  // Порядок нажавших
  const order = el('.buzz-order-admin');
  box.append(order);
  liveUnsub = watchBuzzer(g.roundId, (b) => {
    A.game.buzzes = b || {};
    if (order.isConnected) renderAdminOrder(order, b || {});
  });

  const newRound = async () => {
    const round = (A.game.round || 0) + 1; A.game.round = round;
    const rid = `buz-${round}`;
    await clearBuzzer(rid);
    await updateActiveGame({ roundId: rid });
  };

  box.append(el('.qa-actions', {}, [
    el('button.btn.primary', {
      text: '✅ Верно (+100 первому)',
      onclick: async () => {
        const rows = Object.entries(A.game.buzzes || {}).sort((a, x) => a[1] - x[1]);
        if (rows.length) { await addScore(rows[0][0], POINTS); }
        await newRound();
      },
    }),
    el('button.btn.ghost', {
      text: '❌ Мимо (к следующему)',
      onclick: async () => {
        const rows = Object.entries(A.game.buzzes || {}).sort((a, x) => a[1] - x[1]);
        if (rows.length) await removeVal(`buzzer/${g.roundId}/${rows[0][0]}`);
      },
    }),
    el('button.btn.ghost.sm', { text: '🔄 Новый трек', onclick: newRound }),
    el('button.btn.danger.sm', {
      text: 'Завершить', onclick: async () => { await clearActiveGame(); await setShowLeaderboard(true); refresh(); },
    }),
  ]));

  // Справочник треков
  box.append(trackRef(A.content.tracks));
  return box;
}

function renderAdminOrder(node, b) {
  const rows = Object.entries(b).sort((a, x) => a[1] - x[1]);
  node.innerHTML = '';
  if (!rows.length) { node.append(el('.gc-muted', { text: 'Ждём, кто нажмёт первым…' })); return; }
  const t0 = rows[0][1];
  rows.forEach(([n, ts], i) => {
    node.append(el('.buzz-row', {}, [
      el('b', { text: `${i + 1}` }), el('span', { text: n }),
      el('.buzz-ms', { text: i === 0 ? '⚡ первый' : `+${ts - t0} мс` }),
    ]));
  });
}

function trackRef(tracks) {
  const wrap = el('.track-ref');
  wrap.append(el('.sec', { text: '🎧 Треки (играй со своего устройства)' }));
  for (const cat of Object.values(tracks || {})) {
    const det = document.createElement('details');
    det.className = 'track-cat';
    const sum = document.createElement('summary');
    sum.textContent = cat.title;
    det.append(sum);
    cat.items.forEach((t) => {
      const url = t.videoId ? `https://www.youtube.com/watch?v=${t.videoId}`
        : `https://www.youtube.com/results?search_query=${encodeURIComponent(t.artist + ' ' + t.title)}`;
      const a = el('a.track-item', { href: url, target: '_blank', rel: 'noreferrer' },
        [`${t.title} — ${t.artist} ▶`]);
      det.append(a);
    });
    wrap.append(det);
  }
  return wrap;
}
