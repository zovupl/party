// «Кто из нас скорее всего…» — голосование за игрока.
import { CONFIG } from '../config.js';
import { el, vibrate, toast } from '../ui.js';
import {
  setActiveGame, updateActiveGame, clearActiveGame,
  submitVote, watchVotes, clearVotes, setShowLeaderboard,
} from '../store.js';

let liveUnsub = null;
const myVotes = {};

export const meta = [{ type: 'mostlikely', emoji: '🤔', name: 'Кто из нас…', cat: 'party' }];

export async function launch(_type, A) {
  A.game = { qi: 0, mode: 'anon' };
  const list = A.content.mostLikely;
  await setShowLeaderboard(false);
  await clearVotes('ml-0');
  await setActiveGame({
    type: 'mostlikely', emoji: '🤔', title: 'Кто из нас…',
    qi: 0, total: list.length, question: list[0], phase: 'vote', mode: 'anon', roundId: 'ml-0',
  });
}

export function player(state, ctx) {
  const g = state.activeGame;
  const wrap = el('.game');
  wrap.append(el('.quiz-head', {}, [
    el('.quiz-badge', { text: '🤔 Кто из нас…' }),
    el('.quiz-progress', { text: `${g.qi + 1} / ${g.total}` }),
  ]));
  wrap.append(el('h2.quiz-q', { text: g.question }));

  if (g.phase === 'vote') {
    const mine = myVotes[g.roundId];
    const grid = el('.vote-grid');
    CONFIG.players.forEach((name) => {
      const b = el('button.vote-btn', {
        onclick: () => {
          myVotes[g.roundId] = name;
          submitVote(g.roundId, ctx.myName, name);
          vibrate(30); toast(`Голос за ${name}`);
          [...grid.children].forEach((c) => c.classList.remove('vote-btn--mine'));
          b.classList.add('vote-btn--mine');
        },
      }, [name]);
      if (mine === name) b.classList.add('vote-btn--mine');
      grid.append(b);
    });
    wrap.append(grid);
    if (mine) wrap.append(el('.quiz-accepted', { text: `Ты выбрал: ${mine}` }));
  } else {
    wrap.append(resultChart(g.result, g.mode));
  }
  return wrap;
}

function resultChart(result, mode) {
  const box = el('.chart');
  const counts = (result && result.counts) || {};
  const max = Math.max(1, ...Object.values(counts));
  const rows = CONFIG.players.map((n) => [n, counts[n] || 0]).sort((a, b) => b[1] - a[1]);
  const top = rows[0] && rows[0][1] > 0 ? rows[0][0] : null;
  rows.forEach(([n, c]) => {
    const row = el('.chart-row', {}, [
      el('.chart-name', { text: n }),
      el('.chart-bar-wrap', {}, [el('.chart-bar', { style: `width:${(c / max) * 100}%` })]),
      el('.chart-num', { text: `${c}` }),
    ]);
    if (n === top) row.classList.add('chart-row--top');
    box.append(row);
  });
  if (top) box.append(el('.chart-note', { text: `🍻 Больше всех — ${top}. По алко-правилу: пьёт!` }));
  if (mode === 'open' && result && result.byWho) {
    const dl = el('.who-voted');
    Object.entries(result.byWho).forEach(([voter, target]) =>
      dl.append(el('.wv-row', { text: `${voter} → ${target}` })));
    box.append(dl);
  }
  return box;
}

export function controls(state, A, refresh) {
  const g = state.activeGame;
  const list = A.content.mostLikely;
  if (liveUnsub) { liveUnsub(); liveUnsub = null; }
  const box = el('.game-ctrl');
  box.append(el('.gc-head', { text: `🤔 Вопрос ${g.qi + 1}/${g.total}` }));
  box.append(el('.gc-card', { text: g.question }));

  const live = el('.qa-live', { text: 'Голосов: 0' });
  box.append(live);
  liveUnsub = watchVotes(g.roundId, (v) => {
    A.game.votes = v || {};
    if (live.isConnected) live.textContent = `Голосов: ${Object.keys(v || {}).length}`;
  });

  box.append(el('.gc-row', {}, [
    el('span', { text: `Режим: ${g.mode === 'open' ? 'с раскрытием' : 'анонимно'}` }),
    el('button.btn.ghost.sm', {
      text: 'Сменить', onclick: () => updateActiveGame({ mode: g.mode === 'open' ? 'anon' : 'open' }),
    }),
  ]));

  const actions = el('.qa-actions');
  if (g.phase === 'vote') {
    actions.append(el('button.btn.primary', {
      text: '📊 Показать результат',
      onclick: () => {
        const votes = A.game.votes || {};
        const counts = {};
        for (const t of Object.values(votes)) counts[t] = (counts[t] || 0) + 1;
        const result = { counts };
        if (g.mode === 'open') result.byWho = votes;
        updateActiveGame({ phase: 'result', result });
      },
    }));
  } else {
    actions.append(el('button.btn.primary', {
      text: g.qi + 1 < g.total ? '➡️ Следующий вопрос' : '🏁 Завершить',
      onclick: async () => {
        if (g.qi + 1 < g.total) {
          const qi = g.qi + 1; const rid = `ml-${qi}`;
          await clearVotes(rid);
          await updateActiveGame({ qi, roundId: rid, question: list[qi], phase: 'vote', result: null });
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
