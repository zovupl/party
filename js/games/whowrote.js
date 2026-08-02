// «Кто это написал?» — анонимные ответы, потом раскрытие авторов.
import { el, vibrate, toast } from '../ui.js';
import {
  setActiveGame, updateActiveGame, clearActiveGame,
  submitText, watchTexts, clearTexts, setShowLeaderboard,
} from '../store.js';

let liveUnsub = null;
const submitted = {};

export const meta = [{ type: 'whowrote', emoji: '✍️', name: 'Кто это написал?', cat: 'party' }];

export async function launch(_type, A) {
  A.game = { pi: 0 };
  const list = A.content.whoWrote;
  await setShowLeaderboard(false);
  await clearTexts('ww-0');
  await setActiveGame({
    type: 'whowrote', emoji: '✍️', title: 'Кто это написал?',
    pi: 0, total: list.length, prompt: list[0], phase: 'write', roundId: 'ww-0',
  });
}

export function player(state, ctx) {
  const g = state.activeGame;
  const wrap = el('.game');
  wrap.append(el('.quiz-head', {}, [
    el('.quiz-badge', { text: '✍️ Кто это написал?' }),
    el('.quiz-progress', { text: `${g.pi + 1} / ${g.total}` }),
  ]));
  wrap.append(el('h2.quiz-q', { text: g.prompt }));

  if (g.phase === 'write') {
    const ta = el('textarea.answer-input', { placeholder: 'Пиши анонимно…', rows: '3' });
    ta.value = submitted[g.roundId] || '';
    wrap.append(ta);
    wrap.append(el('button.btn.primary.wide', {
      text: 'Отправить', onclick: () => {
        const v = ta.value.trim(); if (!v) return;
        submitted[g.roundId] = v; submitText(g.roundId, ctx.myName, v);
        vibrate(30); toast('Ответ отправлен ✔');
      },
    }));
    if (submitted[g.roundId]) wrap.append(el('.quiz-accepted', { text: 'Ответ принят. Можешь изменить и отправить снова.' }));
  } else {
    const box = el('.answers-list');
    (g.list || []).forEach((a, i) => box.append(el('.answer-card', {}, [
      el('.answer-txt', { text: a.text }),
      a.author ? el('.answer-author', { text: `— ${a.author}` }) : el('.answer-q', { text: '— ???' }),
    ])));
    wrap.append(box);
  }
  return wrap;
}

export function controls(state, A, refresh) {
  if (liveUnsub) { liveUnsub(); liveUnsub = null; }
  const g = state.activeGame;
  const list = A.content.whoWrote;
  const box = el('.game-ctrl');
  box.append(el('.gc-head', { text: `✍️ ${g.pi + 1}/${g.total}` }));
  box.append(el('.gc-card', { text: g.prompt }));

  const live = el('.qa-live', { text: 'Ответов: 0' });
  box.append(live);
  liveUnsub = watchTexts(g.roundId, (t) => {
    A.game.texts = t || {};
    if (live.isConnected) live.textContent = `Ответов: ${Object.keys(t || {}).length}`;
  });

  const actions = el('.qa-actions');
  if (g.phase === 'write') {
    actions.append(el('button.btn.primary', {
      text: '📃 Показать ответы (аноним)',
      onclick: () => {
        const entries = Object.entries(A.game.texts || {}).map(([author, o]) => ({ text: o.text, author }));
        for (let i = entries.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [entries[i], entries[j]] = [entries[j], entries[i]]; }
        updateActiveGame({ phase: 'list', list: entries.map((e) => ({ text: e.text })), _full: entries });
      },
    }));
  } else if (g.phase === 'list') {
    actions.append(el('button.btn.primary', {
      text: '🎭 Раскрыть авторов',
      onclick: () => updateActiveGame({ phase: 'authors', list: g._full || g.list }),
    }));
  }
  if (g.phase !== 'write') {
    actions.append(el('button.btn.ghost', {
      text: g.pi + 1 < g.total ? '➡️ Следующий' : '🏁 Завершить',
      onclick: async () => {
        if (g.pi + 1 < g.total) {
          const pi = g.pi + 1; const rid = `ww-${pi}`; await clearTexts(rid);
          await updateActiveGame({ pi, roundId: rid, prompt: list[pi], phase: 'write', list: null, _full: null });
        } else { await clearActiveGame(); await setShowLeaderboard(true); refresh(); }
      },
    }));
  }
  actions.append(el('button.btn.danger.sm', {
    text: 'Стоп', onclick: async () => { await clearActiveGame(); await setShowLeaderboard(true); refresh(); },
  }));
  box.append(actions);
  return box;
}
