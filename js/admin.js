import { CONFIG } from './config.js';
import { el, mount, toast, leaderboardNode } from './ui.js';
import { TS, readOnce } from './firebase.js';
import { GAMES, GAME_LIST } from './games/registry.js';
import {
  loadContent, setActiveGame, clearActiveGame, updateActiveGame,
  setShowLeaderboard, addScore, setScore, resetEverything,
  clearAnswers, watchAnswers,
} from './store.js';

// Модульное состояние админ-сессии.
const A = {
  content: null,
  loading: false,
  quiz: null,        // { id, data }
  qIndex: 0,
  roundId: null,
  correct: null,
  scored: false,
  answers: {},
  answersUnsub: null,
  lastArgs: null,
};

export function renderAdmin(S, api) {
  A.lastArgs = { S, api };
  if (!A.content && !A.loading) {
    A.loading = true;
    loadContent().then((c) => {
      A.content = c;
      A.loading = false;
      draw();
    }).catch(() => { A.loading = false; draw(); });
  }
  draw();
}

function refresh() { if (A.lastArgs) draw(); }

function draw() {
  if (!A.lastArgs) return;
  const { S, api } = A.lastArgs;
  const wrap = el('.admin');

  // Шапка
  wrap.append(el('.admin-top', {}, [
    el('.admin-title', { text: '🛠️ Панель админа' }),
    el('button.btn.ghost.sm', { text: 'Выйти', onclick: api.exitAdmin }),
  ]));

  // Дашборд
  const online = Object.values(S.players).filter((p) => p && p.online).length;
  const cur = S.state.activeGame;
  wrap.append(el('.admin-dash', {}, [
    stat('🟢 Онлайн', online),
    stat('🎮 Игра', cur ? (cur.title || cur.type) : '—'),
    stat('👑 Лидер', topName(S.scores)),
  ]));

  // Глобальные кнопки
  wrap.append(el('.admin-globals', {}, [
    el('button.btn.primary', {
      text: S.state.showLeaderboard ? '🙈 Скрыть лидерборд' : '🏆 Показать лидерборд всем',
      onclick: () => setShowLeaderboard(!S.state.showLeaderboard),
    }),
    el('button.btn.danger', { text: '💣 Сброс вечера', onclick: () => confirmReset() }),
  ]));

  if (A.loading) wrap.append(el('.admin-note', { text: 'Загружаю контент…' }));
  if (!A.loading && !A.content) {
    wrap.append(el('.admin-note.warn', {
      html: '⚠️ Контент не найден в базе. Запусти скрипт заливки:<br><code>node seed/seed.mjs</code>',
    }));
  }

  // Панель управления активной игрой
  if (cur && cur.type === 'quiz' && A.quiz) {
    wrap.append(quizControls(S));
  } else if (cur && GAMES[cur.type]) {
    wrap.append(GAMES[cur.type].controls(S.state, A, refresh));
  } else if (A.content) {
    wrap.append(gameLauncher(S));
  }

  // Ручная корректировка очков
  wrap.append(scoreEditor(S));

  mount(wrap);
}

function stat(label, val) {
  return el('.stat', {}, [el('.stat-val', { text: `${val}` }), el('.stat-label', { text: label })]);
}

function topName(scores) {
  const rows = Object.entries(scores || {}).sort((a, b) => b[1] - a[1]);
  return rows.length ? rows[0][0] : '—';
}

// ---------- Запуск игр ----------
function gameLauncher(S) {
  const box = el('.launcher');
  box.append(el('h3.sec', { text: '📚 Квизы' }));
  const grid = el('.game-grid');
  for (const [id, data] of Object.entries(A.content.quizzes || {})) {
    grid.append(el('button.game-card', {
      onclick: () => startQuiz(id, data),
    }, [
      el('.game-emoji', { text: data.emoji || '❓' }),
      el('.game-name', { text: data.title }),
      el('.game-meta', { text: `${data.questions.length} вопросов` }),
    ]));
  }
  box.append(grid);

  box.append(el('h3.sec', { text: '🎪 Другие игры' }));
  const other = el('.game-grid');
  GAME_LIST.forEach((item) => {
    other.append(el('button.game-card', {
      onclick: () => launchGame(item),
    }, [
      el('.game-emoji', { text: item.emoji }),
      el('.game-name', { text: item.name }),
    ]));
  });
  box.append(other);
  return box;
}

async function launchGame(item) {
  A.quiz = null;
  if (A.answersUnsub) { A.answersUnsub(); A.answersUnsub = null; }
  A.game = {};
  await item.module.launch(item.type, A);
  refresh();
}

// ---------- Логика квиза ----------
async function startQuiz(id, data) {
  A.quiz = { id, data };
  A.qIndex = 0;
  await setShowLeaderboard(false);
  await pushQuestion();
}

async function pushQuestion() {
  const q = A.quiz.data.questions[A.qIndex];
  A.roundId = `${A.quiz.id}-q${A.qIndex}`;
  A.correct = q.correct;
  A.scored = false;
  A.answers = {};
  await clearAnswers(A.roundId);
  await setActiveGame({
    type: 'quiz',
    quizId: A.quiz.id,
    title: A.quiz.data.title,
    emoji: A.quiz.data.emoji || '❓',
    qIndex: A.qIndex,
    questionCount: A.quiz.data.questions.length,
    roundId: A.roundId,
    phase: 'question',
    startedAt: TS(),
    totalTime: CONFIG.quizTime,
    question: { text: q.q, options: q.options },
  });
  subscribeAnswers();
  refresh();
}

function subscribeAnswers() {
  if (A.answersUnsub) A.answersUnsub();
  A.answersUnsub = watchAnswers(A.roundId, (v) => { A.answers = v || {}; refresh(); });
}

async function revealAnswer() {
  if (A.scored) return;
  const startedAt = await readOnce('state/activeGame/startedAt');
  const answers = A.answers || {};
  const counts = [0, 0, 0, 0];
  const gains = [];
  for (const [name, a] of Object.entries(answers)) {
    if (a.choice != null) counts[a.choice] = (counts[a.choice] || 0) + 1;
    if (a.choice === A.correct) {
      const elapsed = (a.ts || startedAt) - startedAt;
      const frac = Math.max(0, Math.min(1, 1 - elapsed / (CONFIG.quizTime * 1000)));
      const pts = CONFIG.quizBasePoints + Math.round(CONFIG.quizSpeedBonus * frac);
      await addScore(name, pts);
      gains.push(`${name} +${pts}`);
    }
  }
  A.scored = true;
  await updateActiveGame({ phase: 'reveal', reveal: { correctIndex: A.correct, counts } });
  if (gains.length) toast(gains.join('  •  '));
  refresh();
}

async function nextQuestion() {
  if (A.qIndex + 1 < A.quiz.data.questions.length) {
    A.qIndex += 1;
    await pushQuestion();
  } else {
    await finishGame();
  }
}

async function finishGame() {
  if (A.answersUnsub) { A.answersUnsub(); A.answersUnsub = null; }
  A.quiz = null;
  await clearActiveGame();
  await setShowLeaderboard(true);
  refresh();
}

function quizControls(S) {
  const g = S.state.activeGame;
  const box = el('.quiz-admin');
  box.append(el('.qa-head', { text: `${g.emoji} ${g.title} — вопрос ${g.qIndex + 1}/${g.questionCount}` }));
  box.append(el('.qa-q', { text: g.question.text }));

  // Живая статистика ответов
  const answered = Object.keys(A.answers || {}).length;
  const online = Object.values(S.players).filter((p) => p && p.online).length;
  box.append(el('.qa-live', { text: `Ответили: ${answered} из ${online}` }));

  const opts = el('.qa-opts');
  g.question.options.forEach((t, i) => {
    const n = Object.values(A.answers || {}).filter((a) => a.choice === i).length;
    const row = el('.qa-opt', {}, [
      el('.qa-letter', { text: ['А', 'Б', 'В', 'Г'][i] }),
      el('.qa-text', { text: t }),
      el('.qa-num', { text: `${n}` }),
    ]);
    if (i === A.correct) row.classList.add('qa-opt--correct');
    opts.append(row);
  });
  box.append(opts);

  const actions = el('.qa-actions');
  if (g.phase === 'question') {
    actions.append(el('button.btn.primary', { text: '👁️ Показать ответ', onclick: revealAnswer }));
  } else {
    actions.append(el('button.btn.primary', {
      text: A.qIndex + 1 < g.questionCount ? '➡️ Следующий вопрос' : '🏁 Завершить квиз',
      onclick: nextQuestion,
    }));
  }
  actions.append(el('button.btn.ghost', { text: '⏭️ Пропустить', onclick: nextQuestion }));
  actions.append(el('button.btn.danger.sm', { text: 'Завершить', onclick: finishGame }));
  box.append(actions);
  return box;
}

// ---------- Ручная корректировка очков ----------
function scoreEditor(S) {
  const box = el('.score-editor');
  box.append(el('h3.sec', { text: '🎯 Очки (ручная правка)' }));
  CONFIG.players.forEach((name) => {
    const val = (S.scores && S.scores[name]) || 0;
    box.append(el('.se-row', {}, [
      el('.se-name', { text: name }),
      el('button.btn.ghost.sm', { text: '−10', onclick: () => addScore(name, -10) }),
      el('.se-val', { text: `${val}` }),
      el('button.btn.ghost.sm', { text: '+10', onclick: () => addScore(name, 10) }),
      el('button.btn.ghost.sm', { text: '0', onclick: () => setScore(name, 0) }),
    ]));
  });
  return box;
}

// ---------- Сброс ----------
function confirmReset() {
  const back = el('.modal-back');
  const card = el('.modal', {}, [
    el('h3', { text: '💣 Сбросить весь вечер?' }),
    el('p.subtitle', { text: 'Обнулятся все очки, состояние и ответы. Это необратимо.' }),
    el('.modal-actions', {}, [
      el('button.btn.ghost', { text: 'Отмена', onclick: () => back.remove() }),
      el('button.btn.danger', {
        text: 'Да, сбросить', onclick: async () => {
          await resetEverything();
          A.quiz = null; A.answers = {};
          if (A.answersUnsub) { A.answersUnsub(); A.answersUnsub = null; }
          back.remove();
          toast('Вечер сброшен');
          refresh();
        },
      }),
    ]),
  ]);
  back.append(card);
  document.body.append(back);
}
